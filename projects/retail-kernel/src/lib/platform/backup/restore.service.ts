import { inject, Injectable } from "@angular/core";
import { importDB, importInto } from "dexie-export-import";
import { ActiveOperatorService } from "../../application/services/active-operator.service";
import { DatabaseInitializerService } from "../../data-access/database/database-initializer.service";
import { RetailDatabase } from "../../data-access/database/retail.database";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { LicenceValidationService } from "../licence/licence-validation.service";
import { BACKUP_EXCLUDED_TABLES, BackupFile, BackupService } from "./backup.service";

@Injectable({ providedIn: "root" })
export class RestoreService {
  private readonly database = inject(RetailDatabase);
  private readonly backups = inject(BackupService);
  private readonly activeOperator = inject(ActiveOperatorService);
  private readonly initializer = inject(DatabaseInitializerService);
  private readonly licenceValidation = inject(LicenceValidationService);

  async restore(backup: BackupFile): Promise<boolean> {
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required to restore a backup.");
    const raw = new Blob([JSON.stringify(backup.data)], { type: "application/json" });
    await this.validateExportPayload(raw);
    const rollback = await this.extractExportPayload(await this.backups.create());
    await this.validateExportPayload(rollback);
    try {
      await importInto(this.database, raw, {
        clearTablesBeforeImport: true,
        acceptNameDiff: true,
        acceptVersionDiff: false,
        skipTables: [...BACKUP_EXCLUDED_TABLES],
      });
      const event: ActivityLog<"backup_imported"> = {
        id: crypto.randomUUID(),
        event_code: "backup_imported",
        entity_type: "backup",
        entity_id: null,
        entity_name_snapshot: null,
        payload: { backup_timestamp: backup.manifest.export_timestamp },
        operator_id: operator.id,
        operator_name: operator.display_name,
        related_sale_id: null,
        related_supply_id: null,
        created_at: new Date(),
      };
      await this.database.activity_logs.add(event);
      await this.initializer.initialize();
      await this.activeOperator.initialize();
      return this.licenceValidation.hasValidLicence();
    } catch (error: unknown) {
      try {
        await importInto(this.database, rollback, {
          clearTablesBeforeImport: true,
          acceptNameDiff: true,
          acceptVersionDiff: false,
          skipTables: [...BACKUP_EXCLUDED_TABLES],
        });
      } catch (rollbackError: unknown) {
        throw new Error("Restore failed and the recovery backup could not be applied.", { cause: rollbackError });
      }
      throw error;
    }
  }

  private async validateExportPayload(payload: Blob): Promise<void> {
    const staging = await importDB(payload, { name: `retail-restore-validation-${crypto.randomUUID()}` });
    await staging.delete();
  }

  private async extractExportPayload(backupFile: Blob): Promise<Blob> {
    const parsed: unknown = JSON.parse(await backupFile.text());
    if (!hasBackupData(parsed)) throw new Error("Recovery backup is invalid.");
    return new Blob([JSON.stringify(parsed.data)], { type: "application/json" });
  }
}

function hasBackupData(value: unknown): value is { readonly data: unknown } {
  return typeof value === "object" && value !== null && "data" in value;
}

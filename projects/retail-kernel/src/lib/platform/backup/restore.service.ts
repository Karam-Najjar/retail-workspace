import { inject, Injectable } from "@angular/core";
import { importDB, importInto } from "dexie-export-import";
import { ActiveOperatorService } from "../../application/services/active-operator.service";
import { RetailDatabase } from "../../data-access/database/retail.database";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { BackupFile, BackupService } from "./backup.service";

@Injectable({ providedIn: "root" })
export class RestoreService {
  private readonly database = inject(RetailDatabase);
  private readonly backups = inject(BackupService);
  private readonly activeOperator = inject(ActiveOperatorService);
  async restore(backup: BackupFile): Promise<void> {
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required to restore a backup.");
    const raw = new Blob([JSON.stringify(backup.data)], { type: "application/json" });
    const staging = await importDB(raw, { name: `retail-restore-validation-${crypto.randomUUID()}` });
    await staging.delete();
    const rollback = await this.backups.create();
    try {
      await importInto(this.database, raw, {
        clearTablesBeforeImport: true,
        acceptNameDiff: true,
        acceptVersionDiff: true,
        skipTables: ["draftCarts", "licence_state"],
      });
      const event: ActivityLog<{ readonly backup_timestamp: string }> = {
        id: crypto.randomUUID(),
        event_code: "backup.imported",
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
      await this.activeOperator.initialize();
    } catch (error: unknown) {
      await importInto(this.database, rollback, {
        clearTablesBeforeImport: true,
        acceptNameDiff: true,
        acceptVersionDiff: true,
        skipTables: ["draftCarts", "licence_state"],
      });
      throw error;
    }
  }
}

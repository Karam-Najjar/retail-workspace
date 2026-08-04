import { inject, Injectable } from "@angular/core";
import { exportDB } from "dexie-export-import";
import { CURRENT_SCHEMA_VERSION } from "../../data-access/database/database.constants";
import { RetailDatabase } from "../../data-access/database/retail.database";
import { StoreProfileService } from "../../configuration/store-profile.service";
import { BackupManifest } from "../../domain/models/backup-manifest.model";
import { BackupChecksumService } from "./backup-checksum.service";

export interface BackupFile {
  readonly manifest: BackupManifest;
  readonly data: unknown;
}

export type BackupManifestContent = Omit<BackupManifest, "checksum">;

export const BACKUP_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;
export const BACKUP_APP_VERSION = "1.0.0";
export const BACKUP_EXCLUDED_TABLES: readonly string[] = ["draftCarts", "licence_state", "app_metadata"];

export function serializeBackupChecksumEnvelope(manifest: BackupManifestContent, data: unknown): string {
  const serialized = JSON.stringify(
    canonicalize({
      manifest: {
        schema_version: manifest.schema_version,
        app_version: manifest.app_version,
        profile_id: manifest.profile_id,
        export_timestamp: manifest.export_timestamp,
        record_counts: manifest.record_counts,
      },
      data,
    }),
  );
  if (serialized === undefined) throw new Error("The backup checksum envelope could not be serialized.");
  return serialized;
}

@Injectable({ providedIn: "root" })
export class BackupService {
  private readonly database = inject(RetailDatabase);
  private readonly profile = inject(StoreProfileService);
  private readonly checksum = inject(BackupChecksumService);

  async create(): Promise<Blob> {
    const raw = await exportDB(this.database, { prettyJson: false, skipTables: [...BACKUP_EXCLUDED_TABLES] });
    const data: unknown = JSON.parse(await raw.text());
    const manifestContent: BackupManifestContent = {
      schema_version: BACKUP_SCHEMA_VERSION,
      app_version: BACKUP_APP_VERSION,
      profile_id: this.profile.profile.profile_id,
      export_timestamp: new Date().toISOString(),
      record_counts: await this.counts(),
    };
    const manifest: BackupManifest = {
      ...manifestContent,
      checksum: await this.checksum.sha256(serializeBackupChecksumEnvelope(manifestContent, data)),
    };
    return new Blob([JSON.stringify({ manifest, data } satisfies BackupFile)], { type: "application/json" });
  }

  private async counts(): Promise<Readonly<Record<string, number>>> {
    const result: Record<string, number> = {};
    for (const table of this.database.tables) if (!BACKUP_EXCLUDED_TABLES.includes(table.name)) result[table.name] = await table.count();
    return result;
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => canonicalize(item));
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
  return result;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

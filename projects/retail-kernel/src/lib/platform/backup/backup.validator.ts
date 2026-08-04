import { inject, Injectable } from "@angular/core";
import { StoreProfileService } from "../../configuration/store-profile.service";
import { BackupManifest } from "../../domain/models/backup-manifest.model";
import { BackupChecksumService } from "./backup-checksum.service";
import {
  BACKUP_APP_VERSION,
  BACKUP_SCHEMA_VERSION,
  BackupFile,
  serializeBackupChecksumEnvelope,
} from "./backup.service";

interface DexieExportFile {
  readonly formatName: "dexie";
  readonly formatVersion: 1;
  readonly data: {
    readonly databaseName: string;
    readonly databaseVersion: number;
    readonly tables: readonly DexieExportTable[];
    readonly data: readonly DexieExportTableData[];
  };
}

interface DexieExportTable {
  readonly name: string;
  readonly schema: string;
  readonly rowCount: number;
}

interface DexieExportTableData {
  readonly tableName: string;
  readonly inbound: boolean;
  readonly rows: readonly unknown[];
}

interface ValidatedBackupFile extends BackupFile {
  readonly data: DexieExportFile;
}

@Injectable({ providedIn: "root" })
export class BackupValidator {
  private readonly checksum = inject(BackupChecksumService);
  private readonly profile = inject(StoreProfileService);

  async validate(file: File): Promise<BackupFile> {
    const parsed: unknown = JSON.parse(await file.text());
    if (!this.isBackup(parsed)) throw new Error("The selected file is not a valid retail backup.");
    const checksum = await this.checksum.sha256(serializeBackupChecksumEnvelope(parsed.manifest, parsed.data));
    if (checksum !== parsed.manifest.checksum)
      throw new Error("The backup checksum does not match.");
    if (parsed.manifest.schema_version !== BACKUP_SCHEMA_VERSION || parsed.data.data.databaseVersion !== BACKUP_SCHEMA_VERSION)
      throw new Error("The backup schema version is not supported.");
    if (parsed.manifest.app_version !== BACKUP_APP_VERSION) throw new Error("The backup app version is not supported.");
    if (parsed.manifest.profile_id !== this.profile.profile.profile_id) throw new Error("The backup belongs to a different store profile.");
    if (!recordCountsMatch(parsed.manifest.record_counts, parsed.data)) throw new Error("The backup record counts do not match its data.");
    return parsed;
  }

  private isBackup(value: unknown): value is ValidatedBackupFile {
    if (!isRecord(value) || !hasExactKeys(value, ["manifest", "data"])) return false;
    return isBackupManifest(value["manifest"]) && isDexieExportFile(value["data"]);
  }
}

function isBackupManifest(value: unknown): value is BackupManifest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schema_version",
      "app_version",
      "profile_id",
      "export_timestamp",
      "record_counts",
      "checksum",
    ])
  )
    return false;
  return (
    typeof value["schema_version"] === "number" &&
    Number.isInteger(value["schema_version"]) &&
    typeof value["app_version"] === "string" &&
    value["app_version"].length > 0 &&
    typeof value["profile_id"] === "string" &&
    value["profile_id"].length > 0 &&
    isIsoTimestamp(value["export_timestamp"]) &&
    isRecordCounts(value["record_counts"]) &&
    typeof value["checksum"] === "string" &&
    /^[0-9a-f]{64}$/.test(value["checksum"])
  );
}

function isDexieExportFile(value: unknown): value is DexieExportFile {
  if (!isRecord(value) || !hasExactKeys(value, ["formatName", "formatVersion", "data"])) return false;
  if (value["formatName"] !== "dexie" || value["formatVersion"] !== 1 || !isRecord(value["data"])) return false;
  const data = value["data"];
  return (
    hasExactKeys(data, ["databaseName", "databaseVersion", "tables", "data"]) &&
    typeof data["databaseName"] === "string" &&
    typeof data["databaseVersion"] === "number" &&
    Number.isInteger(data["databaseVersion"]) &&
    Array.isArray(data["tables"]) &&
    data["tables"].every(table => isDexieExportTable(table)) &&
    Array.isArray(data["data"]) &&
    data["data"].every(table => isDexieExportTableData(table))
  );
}

function isDexieExportTable(value: unknown): value is DexieExportTable {
  if (!isRecord(value) || !hasExactKeys(value, ["name", "schema", "rowCount"])) return false;
  const rowCount = value["rowCount"];
  return (
    typeof value["name"] === "string" &&
    typeof value["schema"] === "string" &&
    typeof rowCount === "number" &&
    Number.isInteger(rowCount) &&
    rowCount >= 0
  );
}

function isDexieExportTableData(value: unknown): value is DexieExportTableData {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["tableName", "inbound", "rows"]) &&
    typeof value["tableName"] === "string" &&
    typeof value["inbound"] === "boolean" &&
    Array.isArray(value["rows"])
  );
}

function isRecordCounts(value: unknown): value is Readonly<Record<string, number>> {
  return (
    isRecord(value) &&
    Object.values(value).every(count => typeof count === "number" && Number.isInteger(count) && count >= 0)
  );
}

function recordCountsMatch(recordCounts: Readonly<Record<string, number>>, exported: DexieExportFile): boolean {
  const tableNames = new Set<string>();
  const rowCounts = new Map<string, number>();
  for (const table of exported.data.tables) {
    if (tableNames.has(table.name)) return false;
    tableNames.add(table.name);
    rowCounts.set(table.name, 0);
  }
  for (const tableData of exported.data.data) {
    if (!tableNames.has(tableData.tableName)) return false;
    rowCounts.set(tableData.tableName, (rowCounts.get(tableData.tableName) ?? 0) + tableData.rows.length);
  }
  if (Object.keys(recordCounts).length !== tableNames.size) return false;
  return exported.data.tables.every(
    table => recordCounts[table.name] === table.rowCount && rowCounts.get(table.name) === table.rowCount,
  );
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value;
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every(key => Object.hasOwn(value, key));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

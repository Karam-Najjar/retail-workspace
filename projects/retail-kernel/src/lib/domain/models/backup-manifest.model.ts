export interface BackupManifest {
  readonly schema_version: number;
  readonly app_version: string;
  readonly profile_id: string;
  readonly export_timestamp: string;
  readonly record_counts: Readonly<Record<string, number>>;
  readonly checksum: string;
}

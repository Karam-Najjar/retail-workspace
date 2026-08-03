export interface BackupImportedPayload {
  readonly backup_timestamp: string;
}

export interface BackupEventPayloadMap {
  readonly backup_imported: BackupImportedPayload;
}

export type BackupEventCode = keyof BackupEventPayloadMap;

export type BackupEventPayload<TCode extends BackupEventCode> = BackupEventPayloadMap[TCode];

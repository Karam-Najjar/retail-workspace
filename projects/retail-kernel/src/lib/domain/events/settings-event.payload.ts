export type SettingsChangedField =
  | "operators"
  | "currency_rate"
  | "low_stock_threshold"
  | "language"
  | "last_backup_date"
  | "active_operator_id";

export interface SettingsUpdatedPayload {
  readonly changed: readonly SettingsChangedField[];
}

export type DataClearedPayload = Readonly<Record<string, never>>;

export interface SettingsEventPayloadMap {
  readonly "settings.updated": SettingsUpdatedPayload;
  readonly "data.cleared": DataClearedPayload;
}

export type SettingsEventCode = keyof SettingsEventPayloadMap;
export type SettingsEventPayload<TCode extends SettingsEventCode> = SettingsEventPayloadMap[TCode];

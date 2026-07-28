export interface Settings {
  readonly _singleton_key: "app";
  readonly active_operator_id: string;
  readonly currency_rate: string;
  readonly low_stock_threshold: number;
  readonly language: "en" | "ar";
  readonly last_backup_date: Date | null;
  readonly last_modified_by_operator_id: string;
}

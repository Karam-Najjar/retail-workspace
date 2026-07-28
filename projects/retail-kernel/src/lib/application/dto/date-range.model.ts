export type DateRangePreset = "today" | "week" | "month" | "custom";

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
  readonly preset: DateRangePreset;
}

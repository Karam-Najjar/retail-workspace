export type ExcelCellValue = string | number | Date | null;

export interface ExcelColumnDefinition {
  readonly headerKey: string;
  readonly fallbackHeader: string;
  readonly numberFormat?: string;
}

export interface ExcelSheetDefinition {
  readonly name: string;
  readonly columns: readonly ExcelColumnDefinition[];
  readonly rows: readonly (readonly ExcelCellValue[])[];
  readonly summary?: readonly ExcelCellValue[];
}

export interface ExcelWorkbookDefinition {
  readonly fileName: string;
  readonly sheets: readonly ExcelSheetDefinition[];
  readonly rtl: boolean;
}

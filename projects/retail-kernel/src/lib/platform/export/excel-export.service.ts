import { inject, Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Workbook } from "exceljs";
import { ExcelWorkbookDefinition } from "./excel-export.models";
@Injectable({ providedIn: "root" })
export class ExcelExportService {
  private readonly translate = inject(TranslateService);

  async export(definition: ExcelWorkbookDefinition): Promise<void> {
    const workbook = new Workbook();
    for (const definitionSheet of definition.sheets) {
      const sheet = workbook.addWorksheet(definitionSheet.name, {
        views: [{ rightToLeft: definition.rtl }],
      });
      const headers = definitionSheet.columns.map(column => this.header(column.headerKey, column.fallbackHeader));
      const headerRow = sheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3F51B5" } };
      headerRow.alignment = { horizontal: "center" };
      for (const row of definitionSheet.rows) sheet.addRow([...row]);
      if (definitionSheet.summary) {
        const summaryRow = sheet.addRow([...definitionSheet.summary]);
        summaryRow.font = { bold: true };
        summaryRow.border = { top: { style: "thin", color: { argb: "FF666666" } } };
      }
      definitionSheet.columns.forEach((column, index) => {
        const cells = sheet.getColumn(index + 1);
        cells.width = Math.min(32, Math.max(12, headers[index].length + 2));
        if (column.numberFormat) cells.numFmt = column.numberFormat;
      });
      sheet.views = [{ rightToLeft: definition.rtl }];
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: definitionSheet.columns.length } };
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = definition.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private header(key: string, fallback: string): string {
    const translated = this.translate.instant(key);
    return typeof translated === "string" && translated.trim() && translated !== key ? translated : fallback;
  }
}

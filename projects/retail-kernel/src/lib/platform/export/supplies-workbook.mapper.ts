import { SupplyDetail } from "../../domain/repository-contracts/supply.repository";
import { ExcelSheetDefinition } from "./excel-export.models";

export class SuppliesWorkbookMapper {
  static map(details: readonly SupplyDetail[]): ExcelSheetDefinition {
    const columns = [
      { headerKey: "exports.supplies.dateTime", fallbackHeader: "Date & Time" },
      { headerKey: "exports.supplies.supplier", fallbackHeader: "Supplier" },
      { headerKey: "exports.supplies.product", fallbackHeader: "Product" },
      { headerKey: "exports.supplies.packageType", fallbackHeader: "Package Type" },
      { headerKey: "exports.supplies.quantity", fallbackHeader: "Quantity" },
      { headerKey: "exports.supplies.unitCostUsd", fallbackHeader: "Unit Cost (USD)", numberFormat: "#,##0.00" },
      { headerKey: "exports.supplies.unitCostSyp", fallbackHeader: "Unit Cost (SYP)", numberFormat: "#,##0" },
      { headerKey: "exports.supplies.subtotalUsd", fallbackHeader: "Subtotal (USD)", numberFormat: "#,##0.00" },
      { headerKey: "exports.supplies.subtotalSyp", fallbackHeader: "Subtotal (SYP)", numberFormat: "#,##0" },
    ];
    const rows = details.flatMap(detail =>
      detail.items.map(item => {
        const snapshot = detail.supply.currency_snapshot;
        const primaryScale = 10 ** snapshot.primary_precision;
        const unitCostUsd = item.unit_cost_entered / primaryScale;
        return [
          detail.supply.date,
          detail.supply.supplier_name,
          item.product_name,
          item.package_type_code,
          item.quantity_received,
          unitCostUsd,
          unitCostUsd * Number(snapshot.exchange_rate),
          item.subtotal_cost / primaryScale,
          (item.subtotal_cost / primaryScale) * Number(snapshot.exchange_rate),
        ];
      })
    );
    const totals = details.reduce(
      (sum, detail) => ({
        usd: sum.usd + detail.supply.total_cost / 10 ** detail.supply.currency_snapshot.primary_precision,
        syp: sum.syp + detail.supply.currency_snapshot.secondary_total_cost / 10 ** detail.supply.currency_snapshot.secondary_precision,
      }),
      { usd: 0, syp: 0 }
    );
    return { name: "Supplies", columns, rows, summary: ["Summary", null, null, null, null, null, null, totals.usd, totals.syp] };
  }
}

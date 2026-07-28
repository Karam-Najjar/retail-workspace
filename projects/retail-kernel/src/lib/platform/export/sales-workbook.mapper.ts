import { SaleCurrencySnapshot } from "../../domain/models/sale-currency-snapshot.model";
import { SaleDetail } from "../../domain/repository-contracts/sale.repository";
import { ExcelSheetDefinition } from "./excel-export.models";

export class SalesWorkbookMapper {
  static map(details: readonly SaleDetail[]): ExcelSheetDefinition {
    const columns = [
      { headerKey: "exports.sales.dateTime", fallbackHeader: "Date & Time" },
      { headerKey: "exports.sales.product", fallbackHeader: "Product" },
      { headerKey: "exports.sales.quantity", fallbackHeader: "Quantity" },
      { headerKey: "exports.sales.unitPriceUsd", fallbackHeader: "Unit Price (USD)", numberFormat: "#,##0.00" },
      { headerKey: "exports.sales.unitPriceSyp", fallbackHeader: "Unit Price (SYP)", numberFormat: "#,##0" },
      { headerKey: "exports.sales.costUsd", fallbackHeader: "Cost (USD)", numberFormat: "#,##0.00" },
      { headerKey: "exports.sales.costSyp", fallbackHeader: "Cost (SYP)", numberFormat: "#,##0" },
      { headerKey: "exports.sales.profitUsd", fallbackHeader: "Profit (USD)", numberFormat: "#,##0.00" },
      { headerKey: "exports.sales.profitSyp", fallbackHeader: "Profit (SYP)", numberFormat: "#,##0" },
      { headerKey: "exports.sales.totalUsd", fallbackHeader: "Total (USD)", numberFormat: "#,##0.00" },
      { headerKey: "exports.sales.totalSyp", fallbackHeader: "Total (SYP)", numberFormat: "#,##0" },
    ];
    const rows = details.flatMap(detail =>
      detail.items.map(item => {
        const snapshot = detail.sale.currency_snapshot;
        return [
          detail.sale.date,
          item.product_name,
          item.quantity_base_units,
          primary(item.selling_price_per_unit, snapshot),
          secondary(item.selling_price_per_unit, snapshot),
          primary(item.total_cost, snapshot),
          secondary(item.total_cost, snapshot),
          primary(item.total_profit, snapshot),
          secondary(item.total_profit, snapshot),
          primary(item.subtotal_amount, snapshot),
          secondary(item.subtotal_amount, snapshot),
        ];
      })
    );
    const totals = details.reduce(
      (sum, detail) => ({
        amountUsd: sum.amountUsd + primary(detail.sale.total_amount, detail.sale.currency_snapshot),
        amountSyp: sum.amountSyp + secondary(detail.sale.total_amount, detail.sale.currency_snapshot),
        costUsd: sum.costUsd + primary(detail.sale.total_cost, detail.sale.currency_snapshot),
        costSyp: sum.costSyp + secondary(detail.sale.total_cost, detail.sale.currency_snapshot),
        profitUsd: sum.profitUsd + primary(detail.sale.total_profit, detail.sale.currency_snapshot),
        profitSyp: sum.profitSyp + secondary(detail.sale.total_profit, detail.sale.currency_snapshot),
      }),
      { amountUsd: 0, amountSyp: 0, costUsd: 0, costSyp: 0, profitUsd: 0, profitSyp: 0 }
    );
    return {
      name: "Sales",
      columns,
      rows,
      summary: [
        "Summary",
        null,
        null,
        null,
        null,
        totals.costUsd,
        totals.costSyp,
        totals.profitUsd,
        totals.profitSyp,
        totals.amountUsd,
        totals.amountSyp,
      ],
    };
  }
}

function primary(value: number, snapshot: SaleCurrencySnapshot): number {
  return value / 10 ** snapshot.primary_precision;
}
function secondary(value: number, snapshot: SaleCurrencySnapshot): number {
  return primary(value, snapshot) * Number(snapshot.exchange_rate);
}

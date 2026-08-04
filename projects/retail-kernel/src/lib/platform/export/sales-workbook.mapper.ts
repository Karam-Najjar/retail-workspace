import { SaleCurrencySnapshot } from "../../domain/models/sale-currency-snapshot.model";
import {
  convertCurrencyMinorUnits,
  currencyMinorUnitsToMajor,
  sumCurrencyMinorUnits,
} from "../../domain/policies/currency-rounding.policy";
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
    const amountUsd = storedPrimaryTotal(details, snapshot => snapshot.total_amount);
    const costUsd = storedPrimaryTotal(details, snapshot => snapshot.total_cost);
    const profitUsd = storedPrimaryTotal(details, snapshot => snapshot.total_profit);
    const amountSyp = storedSecondaryTotal(details, snapshot => snapshot.secondary_total_amount);
    const costSyp = storedSecondaryTotal(details, snapshot => snapshot.secondary_total_cost);
    const profitSyp = storedSecondaryTotal(details, snapshot => snapshot.secondary_total_profit);
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
        costUsd,
        costSyp,
        profitUsd,
        profitSyp,
        amountUsd,
        amountSyp,
      ],
    };
  }
}

function primary(value: number, snapshot: SaleCurrencySnapshot): number {
  return currencyMinorUnitsToMajor(value, snapshot.primary_precision);
}
function secondary(value: number, snapshot: SaleCurrencySnapshot): number {
  const minorUnits = convertCurrencyMinorUnits(
    value,
    snapshot.exchange_rate,
    snapshot.primary_precision,
    snapshot.secondary_precision
  );
  return currencyMinorUnitsToMajor(minorUnits, snapshot.secondary_precision);
}

function storedSecondaryTotal(details: readonly SaleDetail[], select: (snapshot: SaleCurrencySnapshot) => number): number {
  const firstSnapshot = details[0]?.sale.currency_snapshot;
  if (!firstSnapshot) return 0;
  const precision = firstSnapshot.secondary_precision;
  const values = details.map(detail => {
    const snapshot = detail.sale.currency_snapshot;
    if (snapshot.secondary_precision !== precision) throw new Error("Sales export contains incompatible secondary currency precisions.");
    return select(snapshot);
  });
  return currencyMinorUnitsToMajor(sumCurrencyMinorUnits(values), precision);
}

function storedPrimaryTotal(details: readonly SaleDetail[], select: (sale: SaleDetail["sale"]) => number): number {
  const firstSnapshot = details[0]?.sale.currency_snapshot;
  if (!firstSnapshot) return 0;
  const precision = firstSnapshot.primary_precision;
  const values = details.map(detail => {
    if (detail.sale.currency_snapshot.primary_precision !== precision) throw new Error("Sales export contains incompatible primary currency precisions.");
    return select(detail.sale);
  });
  return currencyMinorUnitsToMajor(sumCurrencyMinorUnits(values), precision);
}

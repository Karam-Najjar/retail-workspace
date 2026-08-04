import {
  convertCurrencyMinorUnits,
  currencyMinorUnitsToMajor,
  sumCurrencyMinorUnits,
} from "../../domain/policies/currency-rounding.policy";
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
        return [
          detail.supply.date,
          detail.supply.supplier_name,
          item.product_name,
          item.package_type_code,
          item.quantity_received,
          primary(item.unit_cost_entered, snapshot),
          secondary(item.unit_cost_entered, snapshot),
          primary(item.subtotal_cost, snapshot),
          secondary(item.subtotal_cost, snapshot),
        ];
      })
    );
    const totalUsd = storedPrimaryTotal(details);
    const totalSyp = storedSecondaryTotal(details);
    return { name: "Supplies", columns, rows, summary: ["Summary", null, null, null, null, null, null, totalUsd, totalSyp] };
  }
}

type SupplyCurrencySnapshot = SupplyDetail["supply"]["currency_snapshot"];

function primary(value: number, snapshot: SupplyCurrencySnapshot): number {
  return currencyMinorUnitsToMajor(value, snapshot.primary_precision);
}

function secondary(value: number, snapshot: SupplyCurrencySnapshot): number {
  const minorUnits = convertCurrencyMinorUnits(
    value,
    snapshot.exchange_rate,
    snapshot.primary_precision,
    snapshot.secondary_precision
  );
  return currencyMinorUnitsToMajor(minorUnits, snapshot.secondary_precision);
}

function storedSecondaryTotal(details: readonly SupplyDetail[]): number {
  const firstSnapshot = details[0]?.supply.currency_snapshot;
  if (!firstSnapshot) return 0;
  const precision = firstSnapshot.secondary_precision;
  const values = details.map(detail => {
    const snapshot = detail.supply.currency_snapshot;
    if (snapshot.secondary_precision !== precision) throw new Error("Supply export contains incompatible secondary currency precisions.");
    return snapshot.secondary_total_cost;
  });
  return currencyMinorUnitsToMajor(sumCurrencyMinorUnits(values), precision);
}

function storedPrimaryTotal(details: readonly SupplyDetail[]): number {
  const firstSnapshot = details[0]?.supply.currency_snapshot;
  if (!firstSnapshot) return 0;
  const precision = firstSnapshot.primary_precision;
  const values = details.map(detail => {
    const snapshot = detail.supply.currency_snapshot;
    if (snapshot.primary_precision !== precision) throw new Error("Supply export contains incompatible primary currency precisions.");
    return detail.supply.total_cost;
  });
  return currencyMinorUnitsToMajor(sumCurrencyMinorUnits(values), precision);
}

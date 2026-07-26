export interface SupplyItem {
  readonly id: string;
  readonly supply_id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly package_type_code: string;
  readonly quantity_received: number;
  readonly multiplier: number;
  readonly quantity_base_units: number;
  readonly unit_cost_entered: number;
  readonly unit_cost_per_base_display: string;
  readonly subtotal_cost: number;
}

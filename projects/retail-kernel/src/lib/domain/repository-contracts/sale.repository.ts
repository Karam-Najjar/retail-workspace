import { PagedResult } from "@retail/kernel";
import { DraftCartItem } from "../models/draft-cart-item.model";
import { SaleCurrencySnapshot } from "../models/sale-currency-snapshot.model";
import { SaleItemBatchAllocation } from "../models/sale-item-batch-allocation.model";
import { SaleItem } from "../models/sale-item.model";
import { Sale } from "../models/sale.model";

export interface SaleListFilter {
  readonly from?: Date;
  readonly to?: Date;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface SaleListEntry {
  readonly sale: Sale;
  readonly totalItemsSold: number;
}

export interface SaleDetail {
  readonly sale: Sale;
  readonly items: readonly SaleItem[];
  readonly allocations: readonly SaleItemBatchAllocation[];
}

export interface ReverseSaleRequest {
  readonly originalSaleId: string;
  readonly operatorId: string;
  readonly operatorName: string;
  readonly date: Date;
}

export type SaleCurrencySnapshotFactory = (totalAmount: number, totalCost: number) => SaleCurrencySnapshot;

export interface SaleCheckoutRequest {
  readonly idempotencyKey: string;
  readonly items: readonly DraftCartItem[];
  readonly operatorId: string;
  readonly operatorName: string;
  readonly date: Date;
  readonly createCurrencySnapshot: SaleCurrencySnapshotFactory;
}

export interface SaleRepository {
  checkout(request: SaleCheckoutRequest): Promise<Sale>;
  list(filter?: SaleListFilter): Promise<PagedResult<SaleListEntry>>;
  getDetail(id: string): Promise<SaleDetail | undefined>;
  getByIdempotencyKey(idempotencyKey: string): Promise<Sale | undefined>;
  reverseSale(request: ReverseSaleRequest): Promise<Sale>;
}

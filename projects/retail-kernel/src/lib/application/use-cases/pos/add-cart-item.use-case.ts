import { inject, Injectable } from "@angular/core";
import { DraftCartEntryMethod, DraftCartItem } from "../../../domain/models/draft-cart-item.model";
import { normalizeBarcode } from "../../validators/barcode.validator";
import { DexieProductRepository } from "../../../data-access/repositories/dexie-product.repository";
import { CartMutationResult, PosCartStore } from "../../services/pos-cart.store";

export interface AddCartItemInput {
  readonly entryMethod: DraftCartEntryMethod;
  readonly barcode?: string;
  readonly productId?: string;
}

export type AddCartItemResult = CartMutationResult | { readonly status: "not_found" };

@Injectable({ providedIn: "root" })
export class AddCartItemUseCase {
  private readonly products = inject(DexieProductRepository);
  private readonly cart = inject(PosCartStore);

  async execute(input: AddCartItemInput): Promise<AddCartItemResult> {
    if (input.entryMethod === "scan") return this.addScanned(input.barcode ?? "");
    return this.addSearched(input.productId ?? "");
  }

  private async addScanned(rawBarcode: string): Promise<AddCartItemResult> {
    const barcodeValue = rawBarcode.trim();
    if (!barcodeValue) return { status: "not_found" };
    const barcode = await this.products.getByNormalizedBarcode(normalizeBarcode(barcodeValue));
    if (!barcode) return { status: "not_found" };
    const product = await this.products.getById(barcode.product_id);
    if (!product) return { status: "not_found" };
    const line: Omit<DraftCartItem, "package_quantity" | "quantity_base_units"> = {
      product_id: product.id,
      product_name: product.name,
      product_barcode_id: barcode.id,
      barcode: barcode.barcode,
      package_type_code: barcode.package_type_code,
      multiplier: barcode.multiplier,
      selling_price_per_unit: product.selling_price,
      entry_method: "scan",
    };
    return this.cart.add(product, line);
  }

  private async addSearched(productId: string): Promise<AddCartItemResult> {
    const product = await this.products.getById(productId);
    if (!product) return { status: "not_found" };
    const line: Omit<DraftCartItem, "package_quantity" | "quantity_base_units"> = {
      product_id: product.id,
      product_name: product.name,
      product_barcode_id: null,
      barcode: null,
      package_type_code: null,
      multiplier: 1,
      selling_price_per_unit: product.selling_price,
      entry_method: "search",
    };
    return this.cart.add(product, line);
  }
}

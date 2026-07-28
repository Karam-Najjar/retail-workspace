import { inject, Injectable } from "@angular/core";
import { DexieProductRepository } from "../../../data-access/repositories/dexie-product.repository";
import { CartMutationResult, PosCartStore } from "../../services/pos-cart.store";

export interface ChangeCartQuantityInput {
  readonly productId: string;
  readonly productBarcodeId: string | null;
  readonly packageDelta: number;
}

@Injectable({ providedIn: "root" })
export class ChangeCartQuantityUseCase {
  private readonly products = inject(DexieProductRepository);
  private readonly cart = inject(PosCartStore);
  async execute(input: ChangeCartQuantityInput): Promise<CartMutationResult> {
    if (!Number.isSafeInteger(input.packageDelta) || input.packageDelta === 0) throw new Error("Cart quantity change must be a whole number.");
    const product = await this.products.getById(input.productId);
    if (!product) throw new Error("Product could not be found.");
    return this.cart.change(product, input.productBarcodeId, input.packageDelta);
  }
}

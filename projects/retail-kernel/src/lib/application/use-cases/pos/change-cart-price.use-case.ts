import { inject, Injectable } from "@angular/core";
import { PosCartStore } from "../../services/pos-cart.store";

export interface ChangeCartPriceInput {
  readonly productId: string;
  readonly productBarcodeId: string | null;
  readonly sellingPricePerUnit: number | null;
}

@Injectable({ providedIn: "root" })
export class ChangeCartPriceUseCase {
  private readonly cart = inject(PosCartStore);

  execute(input: ChangeCartPriceInput): Promise<void> {
    const price = input.sellingPricePerUnit;
    if (price !== null && (!Number.isSafeInteger(price) || price <= 0)) {
      throw new Error("Cart selling price must be a positive safe integer.");
    }
    return this.cart.changePrice(input.productId, input.productBarcodeId, price);
  }
}

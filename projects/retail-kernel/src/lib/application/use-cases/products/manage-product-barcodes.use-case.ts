import { inject, Injectable } from "@angular/core";
import { ProductBarcode } from "../../../domain/models/product-barcode.model";
import { DexieProductRepository } from "../../../data-access/repositories/dexie-product.repository";
import { normalizeBarcode, validateBarcode } from "../../validators/barcode.validator";

export interface ProductBarcodeInput {
  readonly id?: string;
  readonly barcode: string;
  readonly package_type_code: string;
  readonly multiplier: number;
}

@Injectable({ providedIn: "root" })
export class ManageProductBarcodesUseCase {
  private readonly repository = inject(DexieProductRepository);
  async execute(productId: string, inputs: readonly ProductBarcodeInput[]): Promise<readonly ProductBarcode[]> {
    const barcodes = inputs.map(input => this.toBarcode(productId, input));
    const seen = new Set<string>();
    for (const barcode of barcodes) {
      if (seen.has(barcode.normalized_barcode)) throw new Error("Each barcode can only be entered once.");
      seen.add(barcode.normalized_barcode);
      const conflicting = await this.repository.getByNormalizedBarcode(barcode.normalized_barcode);
      if (conflicting && conflicting.id !== barcode.id) throw new Error("Barcode is already assigned to another product.");
    }
    await this.repository.replaceBarcodes(productId, barcodes);
    return barcodes;
  }

  private toBarcode(productId: string, input: ProductBarcodeInput): ProductBarcode {
    const barcode = validateBarcode(input.barcode);
    if (!input.package_type_code) throw new Error("Package type is required.");
    if (!Number.isInteger(input.multiplier) || input.multiplier < 1) throw new Error("Package multiplier must be a positive whole number.");
    return {
      id: input.id ?? crypto.randomUUID(),
      product_id: productId,
      barcode,
      normalized_barcode: normalizeBarcode(barcode),
      package_type_code: input.package_type_code,
      multiplier: input.multiplier,
    };
  }
}

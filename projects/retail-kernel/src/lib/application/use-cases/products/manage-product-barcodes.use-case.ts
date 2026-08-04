import { inject, Injectable } from "@angular/core";
import { StoreProfileService } from "../../../configuration/store-profile.service";
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
  private readonly storeProfile = inject(StoreProfileService);

  async execute(productId: string, inputs: readonly ProductBarcodeInput[]): Promise<readonly ProductBarcode[]> {
    const packageTypes = this.storeProfile.profile.package_types;
    if (inputs.length > packageTypes.length) throw new Error("Too many product barcodes were provided.");

    const seenPackageTypes = new Set<string>();
    const barcodes = inputs.map(input => {
      const packageType = packageTypes.find(item => item.code === input.package_type_code);
      if (!packageType) throw new Error("Select a valid package type.");
      if (seenPackageTypes.has(packageType.code)) throw new Error("Each package type can only have one barcode.");
      seenPackageTypes.add(packageType.code);
      if (!Number.isSafeInteger(packageType.multiplier) || packageType.multiplier < 1) {
        throw new Error("Configured package multiplier must be a positive whole number.");
      }
      if (input.multiplier !== packageType.multiplier) throw new Error("Package multiplier does not match the selected package type.");
      return this.toBarcode(productId, input, packageType.multiplier);
    });
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

  private toBarcode(productId: string, input: ProductBarcodeInput, multiplier: number): ProductBarcode {
    const barcode = validateBarcode(input.barcode);
    return {
      id: input.id ?? crypto.randomUUID(),
      product_id: productId,
      barcode,
      normalized_barcode: normalizeBarcode(barcode),
      package_type_code: input.package_type_code,
      multiplier,
    };
  }
}

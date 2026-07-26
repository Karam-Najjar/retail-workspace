import { inject, Injectable } from '@angular/core';
import { ProductBarcode } from '../../../domain/models/product-barcode.model';
import { Product } from '../../../domain/models/product.model';
import { DexieProductRepository } from '../../../data-access/repositories/dexie-product.repository';

export interface ProductDetail { readonly product: Product; readonly barcodes: readonly ProductBarcode[]; }

@Injectable({ providedIn: 'root' })
export class GetProductDetailUseCase {
  private readonly repository = inject(DexieProductRepository);
  async execute(id: string): Promise<ProductDetail | undefined> {
    const product = await this.repository.getById(id);
    return product ? { product, barcodes: await this.repository.listBarcodes(id) } : undefined;
  }
}

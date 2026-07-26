import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { ProductBarcode } from '../../domain/models/product-barcode.model';
import { Product } from '../../domain/models/product.model';
import { ProductRepository } from '../../domain/repository-contracts/product.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieProductRepository implements ProductRepository {
  private readonly database = inject(RetailDatabase);

  async list(search = '', categoryId?: string): Promise<readonly Product[]> {
    const query = search.trim().toLocaleLowerCase();
    const products = categoryId
      ? await this.database.products.where('category_id').equals(categoryId).toArray()
      : await this.database.products.toArray();
    return products
      .filter((product) => !query || product.name.toLocaleLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  getById(id: string): Promise<Product | undefined> { return this.database.products.get(id); }
  async save(product: Product): Promise<void> { await this.database.products.put(product); }
  listBarcodes(productId: string): Promise<readonly ProductBarcode[]> { return this.database.productBarcodes.where('product_id').equals(productId).toArray(); }
  getByNormalizedBarcode(normalizedBarcode: string): Promise<ProductBarcode | undefined> {
    return this.database.productBarcodes.where('normalized_barcode').equals(normalizedBarcode).first();
  }

  async replaceBarcodes(productId: string, barcodes: readonly ProductBarcode[]): Promise<void> {
    await this.database.transaction('rw', this.database.productBarcodes, async () => {
      const existing = await this.database.productBarcodes.where('product_id').equals(productId).toArray();
      const retainedIds = new Set(barcodes.map((barcode) => barcode.id));
      await this.database.productBarcodes.bulkDelete(existing.filter((barcode) => !retainedIds.has(barcode.id)).map((barcode) => barcode.id));
      await this.database.productBarcodes.bulkPut([...barcodes]);
    });
  }

  async deleteEmptyWithActivity(product: Product, activityLog: unknown): Promise<void> {
    await this.database.transaction('rw', this.database.products, this.database.productBarcodes, this.database.activity_logs, async () => {
      await this.database.productBarcodes.where('product_id').equals(product.id).delete();
      await this.database.products.delete(product.id);
      await this.database.activity_logs.add(activityLog as ActivityLog);
    });
  }
}

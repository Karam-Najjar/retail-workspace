import { ProductBarcode } from "../models/product-barcode.model";
import { Product } from "../models/product.model";

export interface ProductRepository {
  list(search?: string, categoryId?: string): Promise<readonly Product[]>;
  getById(id: string): Promise<Product | undefined>;
  save(product: Product): Promise<void>;
  deleteEmptyWithActivity(product: Product, activityLog: unknown): Promise<void>;
  listBarcodes(productId: string): Promise<readonly ProductBarcode[]>;
  getByNormalizedBarcode(normalizedBarcode: string): Promise<ProductBarcode | undefined>;
  replaceBarcodes(productId: string, barcodes: readonly ProductBarcode[]): Promise<void>;
}

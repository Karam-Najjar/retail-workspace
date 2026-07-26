import { inject, Injectable, signal } from '@angular/core';
import { Category, DeleteEmptyProductUseCase, GetProductDetailUseCase, ListCategoriesUseCase, ListProductsUseCase, ManageProductBarcodesUseCase, Product, ProductBarcode, ProductBarcodeInput, SaveProductInput, SaveProductUseCase } from '@retail/kernel';

@Injectable()
export class ProductsFacade {
  private readonly listProducts = inject(ListProductsUseCase); private readonly getDetail = inject(GetProductDetailUseCase); private readonly saveProduct = inject(SaveProductUseCase); private readonly deleteProduct = inject(DeleteEmptyProductUseCase); private readonly manageBarcodes = inject(ManageProductBarcodesUseCase); private readonly listCategories = inject(ListCategoriesUseCase);
  readonly products = signal<readonly Product[]>([]); readonly categories = signal<readonly Category[]>([]); readonly loading = signal(false); readonly error = signal<string | null>(null);
  async load(search = '', categoryId?: string): Promise<void> { this.loading.set(true); this.error.set(null); try { const [products, categories] = await Promise.all([this.listProducts.execute(search, categoryId), this.listCategories.execute()]); this.products.set(products); this.categories.set(categories); } catch { this.error.set('products.errors.load'); } finally { this.loading.set(false); } }
  get(id: string) { return this.getDetail.execute(id); }
  async save(input: SaveProductInput): Promise<Product | null> { try { const product = await this.saveProduct.execute(input); return product; } catch (error: unknown) { this.error.set(error instanceof Error ? error.message : 'products.errors.save'); return null; } }
  async delete(product: Product): Promise<boolean> { try { await this.deleteProduct.execute(product); return true; } catch (error: unknown) { this.error.set(error instanceof Error ? error.message : 'products.errors.delete'); return false; } }
  async saveBarcodes(productId: string, barcodes: readonly ProductBarcodeInput[]): Promise<readonly ProductBarcode[] | null> { try { return await this.manageBarcodes.execute(productId, barcodes); } catch (error: unknown) { this.error.set(error instanceof Error ? error.message : 'products.errors.barcodes'); return null; } }
}

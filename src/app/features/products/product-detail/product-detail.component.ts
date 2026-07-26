import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Product, ProductBarcode } from '@retail/kernel';
import { ConfirmationDialogComponent } from '../../../shared-ui/confirmation-dialog/confirmation-dialog.component';
import { DetailPageHeaderComponent } from '../../../shared-ui/detail-page-header/detail-page-header.component';
import { MoneyDisplayComponent } from '../../../shared-ui/money-display/money-display.component';
import { StockStatusBadgeComponent } from '../../../shared-ui/stock-status-badge/stock-status-badge.component';
import { BarcodeEditorComponent } from '../barcode-editor/barcode-editor.component';
import { ProductsFacade } from '../products.facade';
import { ProductFormComponent } from '../product-form/product-form.component';

@Component({ selector: 'app-product-detail', imports: [MatButtonModule, MatCardModule, MatDialogModule, ConfirmationDialogComponent, DetailPageHeaderComponent, MoneyDisplayComponent, StockStatusBadgeComponent, TranslatePipe], providers: [ProductsFacade], templateUrl: './product-detail.component.html', styleUrl: './product-detail.component.scss' })
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly dialog = inject(MatDialog); private readonly facade = inject(ProductsFacade);
  protected readonly product = signal<Product | null>(null); protected readonly barcodes = signal<readonly ProductBarcode[]>([]); protected readonly confirmDelete = signal(false); protected error: string | null = null;
  async ngOnInit(): Promise<void> { await this.reload(); }
  goBack(): void { void this.router.navigate(['/products']); }
  edit(): void { const id = this.product()?.id; if (id) this.dialog.open(ProductFormComponent, { width: 'min(42rem, calc(100vw - 2rem))', data: { productId: id } }).afterClosed().subscribe(() => void this.reload()); }
  editBarcodes(): void { const id = this.product()?.id; if (id) this.dialog.open(BarcodeEditorComponent, { width: 'min(52rem, calc(100vw - 2rem))', data: { productId: id } }).afterClosed().subscribe(() => void this.reload()); }
  async delete(): Promise<void> { const product = this.product(); if (product && await this.facade.delete(product)) this.goBack(); else this.error = this.facade.error(); }
  private async reload(): Promise<void> { const id = this.route.snapshot.paramMap.get('productId'); if (!id) return; const detail = await this.facade.get(id); this.product.set(detail?.product ?? null); this.barcodes.set(detail?.barcodes ?? []); }
}

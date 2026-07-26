import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ActiveOperatorService, InventoryBatch, InventoryMovement, Product, ProductBarcode } from '@retail/kernel';
import { ConfirmationDialogComponent } from '../../../shared-ui/confirmation-dialog/confirmation-dialog.component';
import { DetailPageHeaderComponent } from '../../../shared-ui/detail-page-header/detail-page-header.component';
import { MoneyDisplayComponent } from '../../../shared-ui/money-display/money-display.component';
import { StockStatusBadgeComponent } from '../../../shared-ui/stock-status-badge/stock-status-badge.component';
import { InventoryBatchStatusComponent } from '../../inventory/inventory-batch-status/inventory-batch-status.component';
import { InventoryMovementHistoryComponent } from '../../inventory/inventory-movement-history/inventory-movement-history.component';
import { StockAdjustmentComponent, StockAdjustmentResult } from '../../inventory/stock-adjustment/stock-adjustment.component';
import { BarcodeEditorComponent } from '../barcode-editor/barcode-editor.component';
import { ProductsFacade } from '../products.facade';
import { ProductFormComponent } from '../product-form/product-form.component';

@Component({ selector: 'app-product-detail', imports: [DatePipe, MatButtonModule, MatCardModule, MatDialogModule, ConfirmationDialogComponent, DetailPageHeaderComponent, MoneyDisplayComponent, StockStatusBadgeComponent, InventoryBatchStatusComponent, InventoryMovementHistoryComponent, TranslatePipe], providers: [ProductsFacade], templateUrl: './product-detail.component.html', styleUrl: './product-detail.component.scss' })
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly dialog = inject(MatDialog); private readonly facade = inject(ProductsFacade); private readonly operators = inject(ActiveOperatorService);
  private adjustmentDialogRef: MatDialogRef<StockAdjustmentComponent, StockAdjustmentResult> | null = null;
  protected readonly product = signal<Product | null>(null); protected readonly barcodes = signal<readonly ProductBarcode[]>([]); protected readonly batches = signal<readonly InventoryBatch[]>([]); protected readonly movements = signal<readonly InventoryMovement[]>([]); protected readonly confirmDelete = signal(false); protected error: string | null = null;
  async ngOnInit(): Promise<void> { await this.reload(); }
  goBack(): void { void this.router.navigate(['/products']); }
  edit(): void { const id = this.product()?.id; if (id) this.dialog.open(ProductFormComponent, { width: 'min(42rem, calc(100vw - 2rem))', data: { productId: id } }).afterClosed().subscribe(() => void this.reload()); }
  editBarcodes(): void { const id = this.product()?.id; if (id) this.dialog.open(BarcodeEditorComponent, { width: 'min(52rem, calc(100vw - 2rem))', data: { productId: id } }).afterClosed().subscribe(() => void this.reload()); }
  adjustStock(): void { const id = this.product()?.id; if (id) this.openAdjustment(id); }
  requestDelete(): void { const product = this.product(); if (!product) return; if (product.quantity === 0) this.confirmDelete.set(true); else this.openAdjustment(product.id, 'write_off'); }
  async delete(): Promise<void> { const product = this.product(); if (product && await this.facade.delete(product)) this.goBack(); else this.error = this.facade.error(); }
  protected operatorName(id: string): string { return this.operators.operators().find((operator) => operator.id === id)?.display_name ?? '—'; }
  private openAdjustment(productId: string, initialType?: 'write_off'): void { if (this.adjustmentDialogRef) return; this.adjustmentDialogRef = this.dialog.open<StockAdjustmentComponent, { productId: string; initialType?: 'write_off' }, StockAdjustmentResult>(StockAdjustmentComponent, { width: 'min(42rem, calc(100vw - 2rem))', data: { productId, initialType } }); this.adjustmentDialogRef.afterClosed().subscribe((result) => { this.adjustmentDialogRef = null; if (result?.deleted) this.goBack(); else void this.reload(); }); }
  private async reload(): Promise<void> { const id = this.route.snapshot.paramMap.get('productId'); if (!id) return; const [detail, inventory] = await Promise.all([this.facade.get(id), this.facade.getInventory(id)]); this.product.set(detail?.product ?? null); this.barcodes.set(detail?.barcodes ?? []); this.batches.set(inventory?.batches ?? []); this.movements.set(inventory?.movements ?? []); this.error = this.facade.error(); }
}

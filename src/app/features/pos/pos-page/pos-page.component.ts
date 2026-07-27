import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { AddCartItemResult, DraftCartItem, HidKeyboardTransport, SCANNER_GATEWAY, ScannerGateway } from '@retail/kernel';
import { firstValueFrom } from 'rxjs';
import { CartComponent } from '../cart/cart.component';
import { CartTotalsComponent } from '../cart-totals/cart-totals.component';
import { PosFacade } from '../pos.facade';
import { ProductSearchComponent } from '../product-search/product-search.component';
import { UnknownBarcodeDialogComponent } from '../unknown-barcode-dialog/unknown-barcode-dialog.component';
import { UnknownProductCreateComponent } from '../unknown-product-create/unknown-product-create.component';

@Component({ selector: 'app-pos-page', imports: [CartComponent, CartTotalsComponent, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, ProductSearchComponent, TranslatePipe], providers: [PosFacade, { provide: SCANNER_GATEWAY, useExisting: HidKeyboardTransport }], templateUrl: './pos-page.component.html', styleUrl: './pos-page.component.scss' })
export class PosPageComponent implements AfterViewInit, OnDestroy, OnInit {
  protected readonly facade = inject(PosFacade);
  protected readonly scanner: ScannerGateway = inject(SCANNER_GATEWAY);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('scanInput') private scanInput?: ElementRef<HTMLInputElement>;
  protected scanValue = '';
  private destroyed = false;

  async ngOnInit(): Promise<void> {
    await this.facade.initialize();
    this.activateScanner();
  }
  ngAfterViewInit(): void { if (this.route.snapshot.queryParamMap.get('autofocus') === 'true') this.focusScanInput(); else this.focusScanInput(); }
  ngOnDestroy(): void { this.destroyed = true; this.scanner.deactivate(); }

  protected submitManual(event: Event): void {
    event.preventDefault();
    if (this.facade.checkingOut()) return;
    const barcode = this.scanValue;
    this.scanValue = '';
    void this.processScan(barcode);
  }
  protected addProduct(productId: string): void { if (!this.facade.checkingOut()) void this.processResult(this.facade.addProduct(productId), null); }
  protected increase(item: DraftCartItem): void { if (!this.facade.checkingOut()) void this.facade.change(item, 1); }
  protected decrease(item: DraftCartItem): void { if (!this.facade.checkingOut()) void this.facade.change(item, -1); }
  protected remove(item: DraftCartItem): void { if (!this.facade.checkingOut()) void this.facade.remove(item); }
  protected clear(): void { if (!this.facade.checkingOut()) void this.facade.clear(); }
  protected checkout(): void {
    if (this.facade.checkingOut()) return;
    this.scanner.deactivate();
    void this.facade.checkout().finally(() => {
      this.activateScanner();
      this.focusScanInput();
    });
  }
  protected total(): number { return this.facade.total(); }

  private processScan(barcode: string): void {
    if (this.facade.checkingOut()) return;
    this.scanValue = '';
    void this.processResult(this.facade.scan(barcode), barcode);
  }
  private async processResult(resultPromise: Promise<AddCartItemResult>, barcode: string | null): Promise<void> {
    try {
      const result = await resultPromise;
      if (result.status === 'not_found' && barcode !== null) await this.handleUnknownBarcode(barcode);
      else this.facade.setFeedback(result);
    } catch {
      this.facade.setError();
    } finally {
      this.focusScanInput();
    }
  }

  private async handleUnknownBarcode(barcode: string): Promise<void> {
    this.scanner.deactivate();
    try {
      const shouldCreate: unknown = await firstValueFrom(this.dialog.open(UnknownBarcodeDialogComponent, {
        width: 'min(26rem, calc(100vw - 2rem))',
        data: { barcode },
      }).afterClosed());
      if (shouldCreate !== true || this.destroyed) return;
      const created: unknown = await firstValueFrom(this.dialog.open(UnknownProductCreateComponent, {
        width: 'min(38rem, calc(100vw - 2rem))',
        maxHeight: 'calc(100vh - 2rem)',
        data: { barcode },
      }).afterClosed());
      if (!created || this.destroyed) return;
      this.facade.setFeedback(await this.facade.scan(barcode));
      try {
        await this.facade.refreshProducts();
      } catch {
        // The product is already stocked and in the cart; refresh on the next POS load.
      }
    } finally {
      this.activateScanner();
    }
  }
  private activateScanner(): void { if (!this.destroyed && !this.facade.checkingOut()) this.scanner.activate((barcode) => { void this.processScan(barcode); }); }
  private focusScanInput(): void { setTimeout(() => this.scanInput?.nativeElement.focus()); }
}

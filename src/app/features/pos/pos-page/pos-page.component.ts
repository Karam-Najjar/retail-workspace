import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { AddCartItemResult, DraftCartItem, HidKeyboardTransport, SCANNER_GATEWAY, ScannerGateway } from '@retail/kernel';
import { CartComponent } from '../cart/cart.component';
import { CartTotalsComponent } from '../cart-totals/cart-totals.component';
import { PosFacade } from '../pos.facade';
import { ProductSearchComponent } from '../product-search/product-search.component';
import { UnknownBarcodeDialogComponent } from '../unknown-barcode-dialog/unknown-barcode-dialog.component';

@Component({ selector: 'app-pos-page', imports: [CartComponent, CartTotalsComponent, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, ProductSearchComponent, TranslatePipe], providers: [PosFacade, { provide: SCANNER_GATEWAY, useExisting: HidKeyboardTransport }], templateUrl: './pos-page.component.html', styleUrl: './pos-page.component.scss' })
export class PosPageComponent implements AfterViewInit, OnDestroy, OnInit {
  protected readonly facade = inject(PosFacade);
  protected readonly scanner: ScannerGateway = inject(SCANNER_GATEWAY);
  private readonly dialog = inject(MatDialog);
  @ViewChild('scanInput') private scanInput?: ElementRef<HTMLInputElement>;
  protected scanValue = '';

  async ngOnInit(): Promise<void> {
    await this.facade.initialize();
    this.scanner.activate((barcode) => { void this.processScan(barcode); });
  }
  ngAfterViewInit(): void { this.focusScanInput(); }
  ngOnDestroy(): void { this.scanner.deactivate(); }

  protected submitManual(event: Event): void {
    event.preventDefault();
    const barcode = this.scanValue;
    this.scanValue = '';
    void this.processScan(barcode);
  }
  protected addProduct(productId: string): void { void this.processResult(this.facade.addProduct(productId), null); }
  protected increase(item: DraftCartItem): void { void this.facade.change(item, 1); }
  protected decrease(item: DraftCartItem): void { void this.facade.change(item, -1); }
  protected remove(item: DraftCartItem): void { void this.facade.remove(item); }
  protected clear(): void { void this.facade.clear(); }
  protected total(): number { return this.facade.total(); }

  private processScan(barcode: string): void { this.scanValue = ''; void this.processResult(this.facade.scan(barcode), barcode); }
  private async processResult(resultPromise: Promise<AddCartItemResult>, barcode: string | null): Promise<void> {
    const result = await resultPromise;
    if (result.status === 'not_found' && barcode !== null) this.dialog.open(UnknownBarcodeDialogComponent, { width: 'min(26rem, calc(100vw - 2rem))', data: { barcode } });
    else this.facade.setFeedback(result);
    this.focusScanInput();
  }
  private focusScanInput(): void { setTimeout(() => this.scanInput?.nativeElement.focus()); }
}

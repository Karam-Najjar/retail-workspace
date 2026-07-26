import { inject, Injectable } from '@angular/core';
import { DexieSaleRepository } from '../../../data-access/repositories/dexie-sale.repository';
import { Sale } from '../../../domain/models/sale.model';
import { ActiveOperatorService } from '../../services/active-operator.service';
import { PosCartStore } from '../../services/pos-cart.store';
import { SaleCurrencySnapshotService } from '../../services/sale-currency-snapshot.service';

@Injectable({ providedIn: 'root' })
export class CheckoutUseCase {
  private readonly sales = inject(DexieSaleRepository);
  private readonly cart = inject(PosCartStore);
  private readonly activeOperator = inject(ActiveOperatorService);
  private readonly currencySnapshot = inject(SaleCurrencySnapshotService);

  async execute(): Promise<Sale> {
    const items = this.cart.items();
    if (!items.length) throw new Error('The cart is empty.');
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error('An active operator is required.');

    const idempotencyKey = await this.cart.getOrCreateCheckoutIdempotencyKey();
    const createCurrencySnapshot = await this.currencySnapshot.createFactory();
    const sale = await this.sales.checkout({
      idempotencyKey,
      items,
      operatorId: operator.id,
      operatorName: operator.display_name,
      date: new Date(),
      createCurrencySnapshot,
    });
    this.cart.markCheckoutCompleted();
    return sale;
  }
}

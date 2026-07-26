import { inject, Injectable } from '@angular/core';
import { PosCartStore } from '../../services/pos-cart.store';

@Injectable({ providedIn: 'root' })
export class ClearCartUseCase {
  private readonly cart = inject(PosCartStore);
  execute(): Promise<void> { return this.cart.clear(); }
}

import { inject, Injectable } from '@angular/core';
import { DraftCart } from '../../domain/models/draft-cart.model';
import { DraftCartRepository } from '../../domain/repository-contracts/draft-cart.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieDraftCartRepository implements DraftCartRepository {
  private readonly database = inject(RetailDatabase);
  getActive(): Promise<DraftCart | undefined> { return this.database.draftCarts.get('active'); }
  async save(cart: DraftCart): Promise<void> { await this.database.draftCarts.put(cart); }
}

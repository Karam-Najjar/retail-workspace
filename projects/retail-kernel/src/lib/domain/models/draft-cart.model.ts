import { DraftCartItem } from './draft-cart-item.model';

export interface DraftCart {
  readonly id: 'active';
  readonly items: readonly DraftCartItem[];
  readonly created_at: Date;
  readonly updated_at: Date;
}

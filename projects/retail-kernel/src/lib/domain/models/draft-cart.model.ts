import { DraftCartItem } from "./draft-cart-item.model";

export interface DraftCart {
  readonly id: "active";
  readonly items: readonly DraftCartItem[];
  readonly checkout_idempotency_key: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

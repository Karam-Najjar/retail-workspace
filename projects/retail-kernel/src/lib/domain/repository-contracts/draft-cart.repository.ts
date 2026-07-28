import { DraftCart } from "../models/draft-cart.model";

export interface DraftCartRepository {
  getActive(): Promise<DraftCart | undefined>;
  save(cart: DraftCart): Promise<void>;
}

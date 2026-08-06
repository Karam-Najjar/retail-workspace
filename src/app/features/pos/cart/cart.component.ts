import { Component, input, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { TranslatePipe } from "@ngx-translate/core";
import { DraftCartItem } from "@retail/kernel";
import { CartItemComponent } from "../cart-item/cart-item.component";

export interface CartPriceChange {
  readonly item: DraftCartItem;
  readonly sellingPricePerUnit: number | null;
}

@Component({
  selector: "app-cart",
  imports: [CartItemComponent, MatButtonModule, TranslatePipe],
  templateUrl: "./cart.component.html",
  styleUrl: "./cart.component.scss",
})
export class CartComponent {
  readonly items = input.required<readonly DraftCartItem[]>();
  readonly exchangeRate = input.required<string>();
  readonly increase = output<DraftCartItem>();
  readonly decrease = output<DraftCartItem>();
  readonly remove = output<DraftCartItem>();
  readonly priceChange = output<CartPriceChange>();
  readonly clear = output<void>();
}

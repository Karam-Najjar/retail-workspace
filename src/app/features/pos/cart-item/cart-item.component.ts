import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DraftCartItem } from '@retail/kernel';

@Component({ selector: 'app-cart-item', imports: [MatButtonModule, MatIconModule, TranslatePipe], templateUrl: './cart-item.component.html', styleUrl: './cart-item.component.scss' })
export class CartItemComponent {
  readonly item = input.required<DraftCartItem>();
  readonly increase = output<void>();
  readonly decrease = output<void>();
  readonly remove = output<void>();
  protected subtotal(): number { const item = this.item(); return item.quantity_base_units * item.selling_price_per_unit; }
}

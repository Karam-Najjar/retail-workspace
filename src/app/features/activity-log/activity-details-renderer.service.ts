import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ActivityLog, StoreProfileService } from '@retail/kernel';

type PayloadRecord = Readonly<Record<string, unknown>>;

@Injectable()
export class ActivityDetailsRendererService {
  private readonly translate = inject(TranslateService);
  private readonly profile = inject(StoreProfileService);

  render(entry: ActivityLog): string {
    const payload = this.record(entry.payload);
    const name = entry.entity_name_snapshot ?? this.stringValue(payload, 'name') ?? '';
    switch (entry.event_code) {
      case 'sale_completed':
        return this.text('activityLog.eventDetails.saleCompleted', 'Sale completed: {{ items }} items, {{ total }} total', {
          items: this.numberValue(payload, 'total_items_sold') ?? 0,
          total: this.money(this.numberValue(payload, 'total_amount') ?? 0),
        });
      case 'inventory.opening_balance.created':
        return this.text('activityLog.eventDetails.openingBalance', 'Opening balance: {{ quantity }} units at {{ unitCost }}/unit', {
          quantity: this.numberValue(payload, 'quantity') ?? 0,
          unitCost: this.money(this.numberValue(payload, 'unit_cost_cents') ?? 0),
        });
      case 'inventory.stock.added':
        return this.text('activityLog.eventDetails.stockAdded', 'Stock added: {{ quantity }} units at {{ unitCost }}/unit', {
          quantity: this.numberValue(payload, 'quantity') ?? 0,
          unitCost: this.money(this.numberValue(payload, 'unit_cost_cents') ?? 0),
        });
      case 'inventory.stock.removed':
        return this.text('activityLog.eventDetails.stockRemoved', 'Stock removed: {{ quantity }} units', { quantity: this.numberValue(payload, 'quantity') ?? 0 });
      case 'inventory.product.written_off':
        return this.text('activityLog.eventDetails.writeOff', 'Product {{ name }} written off: {{ quantity }} units', { name, quantity: this.numberValue(payload, 'quantity') ?? 0 });
      case 'supply.received':
        return this.text('activityLog.eventDetails.supplyReceived', 'Supply received: {{ items }} items, {{ total }} total', { items: this.numberValue(payload, 'item_count') ?? 0, total: this.money(this.numberValue(payload, 'total_cost') ?? 0) });
      case 'product_created':
      case 'product.created':
        return this.text('activityLog.eventDetails.productCreated', "Product '{{ name }}' created", { name });
      case 'product.deleted':
        return this.text('activityLog.eventDetails.productDeleted', "Product '{{ name }}' deleted", { name });
      case 'category.deleted':
        return this.text('activityLog.eventDetails.categoryDeleted', "Category '{{ name }}' deleted", { name });
      case 'supplier.deleted':
        return this.text('activityLog.eventDetails.supplierDeleted', "Supplier '{{ name }}' deleted", { name });
      default:
        return name ? `${entry.event_code}: ${name}` : entry.event_code;
    }
  }

  private text(key: string, fallback: string, params: Readonly<Record<string, string | number>>): string {
    const translated = this.translate.instant(key, params);
    return typeof translated === 'string' && translated.trim() && translated !== key ? translated : this.interpolate(fallback, params);
  }

  private interpolate(template: string, params: Readonly<Record<string, string | number>>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => String(params[key] ?? ''));
  }

  private money(cents: number): string {
    const currency = this.profile.profile.currency.primary;
    return `${(cents / 10 ** currency.precision).toFixed(currency.precision)} ${currency.code}`;
  }

  private record(payload: unknown): PayloadRecord {
    return typeof payload === 'object' && payload !== null ? payload as PayloadRecord : {};
  }

  private numberValue(payload: PayloadRecord, key: string): number | undefined {
    const value = payload[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private stringValue(payload: PayloadRecord, key: string): string | undefined {
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
  }
}

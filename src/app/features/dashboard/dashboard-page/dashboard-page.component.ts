import { Component, computed, inject, OnDestroy, OnInit } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { ActivityLog, StoreProfileService } from "@retail/kernel";
import { TranslationService } from "../../../core/i18n/translation.service";
import { BarChartBar, BarChartComponent } from "../../../shared-ui/bar-chart/bar-chart.component";
import { CircularChartComponent, CircularChartSegment } from "../../../shared-ui/circular-chart/circular-chart.component";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { LinearChartBar, LinearChartComponent } from "../../../shared-ui/linear-chart/linear-chart.component";
import { DashboardFacade } from "../dashboard.facade";

type ActivityPayloadRecord = Readonly<Record<string, unknown>>;
type ActivityTextParams = Readonly<Record<string, string | number>>;
type ActivityTone = "category" | "default" | "product" | "sale" | "settings" | "supply";
type AlertTone = "clear" | "low" | "out";

interface ActivityText {
  readonly fallback: string;
  readonly key: string;
  readonly params: ActivityTextParams;
}

interface CurrencyDefinition {
  readonly code: string;
  readonly precision: number;
}

@Component({
  selector: "app-dashboard-page",
  imports: [
    BarChartComponent,
    CircularChartComponent,
    EmptyStateComponent,
    LinearChartComponent,
    MatButtonModule,
    MatCardModule,
    RouterLink,
    TranslatePipe,
  ],
  providers: [DashboardFacade],
  templateUrl: "./dashboard-page.component.html",
  styleUrl: "./dashboard-page.component.scss",
})
export class DashboardPageComponent implements OnDestroy, OnInit {
  protected readonly facade = inject(DashboardFacade);
  private readonly profile = inject(StoreProfileService).profile;
  private readonly translate = inject(TranslateService);
  private readonly translation = inject(TranslationService);
  private readonly translationChange = toSignal(this.translate.onLangChange, { initialValue: undefined });

  protected readonly weeklyBars = computed<readonly BarChartBar[]>(() => {
    const snapshot = this.facade.snapshot();
    const language = this.translation.activeLanguage();
    if (!snapshot) return [];
    const scale = 10 ** this.profile.currency.primary.precision;
    const values = snapshot.weekly_sales.map(day => day.sales_usd / scale);
    const highestValue = Math.max(0, ...values);
    const maxValue = highestValue > 0 ? highestValue : 1;
    const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
    return snapshot.weekly_sales.map((day, index) => ({
      label: weekday.format(day.date),
      value: values[index] ?? 0,
      maxValue,
      color: day.is_today ? "var(--retail-primary)" : day.is_future ? "var(--retail-outline-variant)" : "var(--retail-primary-container)",
      hatched: day.is_future,
    }));
  });

  protected readonly inventorySegments = computed<readonly CircularChartSegment[]>(() => {
    const health = this.facade.snapshot()?.inventory_health;
    this.translation.activeLanguage();
    this.translationChange();
    if (!health) return [];
    return [
      { label: this.translationText("products.stock.in"), value: health.in_stock, color: "#22c55e" },
      { label: this.translationText("products.stock.low"), value: health.low_stock, color: "#f59e0b" },
      { label: this.translationText("products.stock.out"), value: health.out_of_stock, color: "#ef4444" },
    ];
  });

  protected readonly inventoryHealthPercentage = computed(() => {
    const snapshot = this.facade.snapshot();
    if (!snapshot?.total_products) return "0%";
    return `${Math.round((snapshot.inventory_health.in_stock / snapshot.total_products) * 100)}%`;
  });

  protected readonly topProductBars = computed<readonly LinearChartBar[]>(() => {
    const products = this.facade.snapshot()?.top_products ?? [];
    const maxValue = Math.max(1, ...products.map(product => product.quantity_base_units));
    return products.map(product => ({
      label: product.product_name,
      value: product.quantity_base_units,
      maxValue,
      color: "var(--retail-primary)",
    }));
  });

  protected readonly alertTone = computed<AlertTone>(() => {
    const snapshot = this.facade.snapshot();
    if (!snapshot || snapshot.inventory_health.out_of_stock > 0) return "out";
    return snapshot.low_stock_products.length > 0 ? "low" : "clear";
  });

  protected readonly alertStatusKey = computed(() => `dashboard.alertStatus.${this.alertTone()}`);

  ngOnInit(): void {
    this.facade.load();
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected primaryMoney(value: number): string {
    return this.formatCurrency(value, this.profile.currency.primary);
  }

  protected secondaryMoney(value: number): string {
    return this.formatCurrency(value, this.profile.currency.secondary);
  }

  protected lowStockTone(quantity: number): "low" | "out" {
    return quantity <= 0 ? "out" : "low";
  }

  protected activityTone(entry: ActivityLog): ActivityTone {
    switch (entry.entity_type) {
      case "sale":
      case "supply":
      case "product":
      case "category":
      case "settings":
        return entry.entity_type;
      default:
        return "default";
    }
  }

  protected activityDescription(entry: ActivityLog): string {
    const payload = this.payloadRecord(entry.payload);
    const name = entry.entity_name_snapshot ?? this.stringValue(payload, "name") ?? "";
    const eventCode: string = entry.event_code;
    let text: ActivityText;
    switch (eventCode) {
      case "sale_completed":
        text = {
          key: "activityLog.eventDetails.saleCompleted",
          fallback: "Sale completed: {{ items }} items, {{ total }} total",
          params: {
            items: this.numberValue(payload, "total_items_sold") ?? 0,
            total: this.primaryMoney(this.numberValue(payload, "total_amount") ?? 0),
          },
        };
        break;
      case "inventory.opening_balance.created":
        text = {
          key: "activityLog.eventDetails.openingBalance",
          fallback: "Opening balance: {{ quantity }} units at {{ unitCost }}/unit",
          params: {
            quantity: this.numberValue(payload, "quantity") ?? 0,
            unitCost: this.primaryMoney(this.numberValue(payload, "unit_cost_cents") ?? 0),
          },
        };
        break;
      case "inventory.stock.added":
        text = {
          key: "activityLog.eventDetails.stockAdded",
          fallback: "Stock added: {{ quantity }} units at {{ unitCost }}/unit",
          params: {
            quantity: this.numberValue(payload, "quantity") ?? 0,
            unitCost: this.primaryMoney(this.numberValue(payload, "unit_cost_cents") ?? 0),
          },
        };
        break;
      case "inventory.stock.removed":
        text = {
          key: "activityLog.eventDetails.stockRemoved",
          fallback: "Stock removed: {{ quantity }} units",
          params: { quantity: this.numberValue(payload, "quantity") ?? 0 },
        };
        break;
      case "inventory.product.written_off":
        text = {
          key: "activityLog.eventDetails.writeOff",
          fallback: "Product {{ name }} written off: {{ quantity }} units",
          params: { name, quantity: this.numberValue(payload, "quantity") ?? 0 },
        };
        break;
      case "supply.received":
        text = {
          key: "activityLog.eventDetails.supplyReceived",
          fallback: "Supply received: {{ items }} items, {{ total }} total",
          params: {
            items: this.numberValue(payload, "item_count") ?? 0,
            total: this.primaryMoney(this.numberValue(payload, "total_cost") ?? 0),
          },
        };
        break;
      case "product_created":
      case "product.created":
        text = { key: "activityLog.eventDetails.productCreated", fallback: "Product '{{ name }}' created", params: { name } };
        break;
      case "product.deleted":
        text = { key: "activityLog.eventDetails.productDeleted", fallback: "Product '{{ name }}' deleted", params: { name } };
        break;
      case "category.deleted":
        text = { key: "activityLog.eventDetails.categoryDeleted", fallback: "Category '{{ name }}' deleted", params: { name } };
        break;
      case "supplier.deleted":
        text = { key: "activityLog.eventDetails.supplierDeleted", fallback: "Supplier '{{ name }}' deleted", params: { name } };
        break;
      case "settings.updated":
        text = { key: "activityLog.eventDetails.settingsUpdated", fallback: "Settings updated", params: {} };
        break;
      case "backup_imported":
        text = { key: "activityLog.eventDetails.backupImported", fallback: "Backup imported", params: {} };
        break;
      case "data.cleared":
        text = { key: "activityLog.eventDetails.dataCleared", fallback: "All retail data cleared", params: {} };
        break;
      default:
        text = { key: "activityLog.eventDetails.unknown", fallback: "Activity: {{ code }}", params: { code: eventCode } };
        break;
    }
    return this.translatedText(text);
  }

  protected activityTimestamp(date: Date): string {
    return new Intl.DateTimeFormat(this.translation.activeLanguage(), { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  private formatCurrency(value: number, currency: CurrencyDefinition): string {
    const safeValue = Number.isFinite(value) ? value : 0;
    const major = safeValue / 10 ** currency.precision;
    const trimmed = Number(major.toFixed(currency.precision).replace(/\.?0+$/, ""));
    return new Intl.NumberFormat(this.translation.activeLanguage(), {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: this.decimals(trimmed),
      maximumFractionDigits: currency.precision,
    }).format(trimmed);
  }

  private decimals(value: number): number {
    const text = String(value);
    const dotIndex = text.indexOf(".");
    return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
  }

  private translatedText(text: ActivityText): string {
    const translated: unknown = this.translate.instant(text.key, text.params);
    return typeof translated === "string" && translated.trim() && translated !== text.key ? translated : this.interpolate(text.fallback, text.params);
  }

  private translationText(key: string): string {
    const translated: unknown = this.translate.instant(key);
    return typeof translated === "string" && translated.trim() && translated !== key ? translated : key;
  }

  private interpolate(template: string, params: ActivityTextParams): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => String(params[key] ?? ""));
  }

  private payloadRecord(payload: unknown): ActivityPayloadRecord {
    return typeof payload === "object" && payload !== null ? (payload as ActivityPayloadRecord) : {};
  }

  private numberValue(payload: ActivityPayloadRecord, key: string): number | undefined {
    const value = payload[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private stringValue(payload: ActivityPayloadRecord, key: string): string | undefined {
    const value = payload[key];
    return typeof value === "string" ? value : undefined;
  }
}

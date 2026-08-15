import { inject, Injectable, signal } from "@angular/core";
import { InventoryValuation } from "@retail/kernel/application/dto/inventory-valuation.model";
import { InventoryValuationService } from "@retail/kernel/application/services/inventory-valuation.service";

@Injectable()
export class ValuationFacade {
  private readonly service = inject(InventoryValuationService);
  readonly valuation = signal<InventoryValuation | null>(null);
  readonly loading = signal(true);

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.valuation.set(await this.service.getValuation());
    } finally {
      this.loading.set(false);
    }
  }
}
import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../../domain/models/activity-log.model';
import { Product } from '../../../domain/models/product.model';
import { DexieProductRepository } from '../../../data-access/repositories/dexie-product.repository';
import { ActiveOperatorService } from '../../services/active-operator.service';

@Injectable({ providedIn: 'root' })
export class DeleteEmptyProductUseCase {
  private readonly repository = inject(DexieProductRepository);
  private readonly activeOperator = inject(ActiveOperatorService);
  async execute(product: Product): Promise<void> {
    if (product.quantity !== 0) throw new Error('Only products with zero stock can be deleted.');
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error('An active operator is required.');
    const barcodes = await this.repository.listBarcodes(product.id);
    const activityLog: ActivityLog<{ barcode_count: number }> = {
      id: crypto.randomUUID(), event_code: 'product.deleted', entity_type: 'product', entity_id: product.id,
      entity_name_snapshot: product.name, payload: { barcode_count: barcodes.length }, operator_id: operator.id,
      operator_name: operator.display_name, related_sale_id: null, related_supply_id: null, created_at: new Date(),
    };
    await this.repository.deleteEmptyWithActivity(product, activityLog);
  }
}

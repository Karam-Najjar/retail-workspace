import { InventoryBatch } from '../models/inventory-batch.model';

export interface FifoBatchAllocation {
  readonly batch: InventoryBatch;
  readonly quantity: number;
  readonly allocated_cost: number;
}

export interface FifoAllocationResult {
  readonly allocations: readonly FifoBatchAllocation[];
  readonly total_allocated_cost: number;
}

export function allocateFifo(batches: readonly InventoryBatch[], requestedQuantity: number): FifoAllocationResult {
  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error('Quantity to remove must be a positive whole number.');
  }

  const availableQuantity = batches.reduce((sum, batch) => sum + batch.remaining_quantity, 0);
  if (requestedQuantity > availableQuantity) throw new Error('Stock cannot be reduced below zero.');

  let quantityLeft = requestedQuantity;
  let totalAllocatedCost = 0;
  const allocations: FifoBatchAllocation[] = [];
  const orderedBatches = [...batches].sort((left, right) => left.sequence - right.sequence);

  for (const batch of orderedBatches) {
    if (quantityLeft === 0) break;
    if (batch.remaining_quantity <= 0) continue;
    if (!Number.isSafeInteger(batch.remaining_quantity) || !Number.isSafeInteger(batch.remaining_total_cost)) {
      throw new Error('Inventory batch contains invalid values.');
    }

    const quantity = Math.min(quantityLeft, batch.remaining_quantity);
    const allocatedCost = quantity === batch.remaining_quantity
      ? batch.remaining_total_cost
      : Math.round(batch.remaining_total_cost * quantity / batch.remaining_quantity);
    const updatedBatch: InventoryBatch = {
      ...batch,
      remaining_quantity: batch.remaining_quantity - quantity,
      remaining_total_cost: batch.remaining_total_cost - allocatedCost,
    };

    if (updatedBatch.remaining_quantity === 0 && updatedBatch.remaining_total_cost !== 0) {
      throw new Error('FIFO allocation did not fully consume the batch cost.');
    }

    allocations.push({ batch: updatedBatch, quantity, allocated_cost: allocatedCost });
    totalAllocatedCost += allocatedCost;
    quantityLeft -= quantity;
  }

  if (quantityLeft !== 0) throw new Error('FIFO allocation could not satisfy the requested quantity.');
  return { allocations, total_allocated_cost: totalAllocatedCost };
}

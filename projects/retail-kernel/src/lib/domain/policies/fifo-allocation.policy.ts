import { InventoryBatch } from "../models/inventory-batch.model";

export interface FifoBatchAllocation {
  readonly batch: InventoryBatch;
  readonly quantity: number;
  readonly allocated_cost: number;
}

export interface FifoAllocationResult {
  readonly allocations: readonly FifoBatchAllocation[];
  readonly total_allocated_cost: number;
}

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

export function assertValidInventoryBatch(batch: InventoryBatch): void {
  const costedBatchHasMismatchedDepletion =
    batch.original_total_cost > 0 && (batch.remaining_quantity === 0) !== (batch.remaining_total_cost === 0);
  if (
    !Number.isSafeInteger(batch.sequence) ||
    batch.sequence <= 0 ||
    !Number.isSafeInteger(batch.original_quantity) ||
    batch.original_quantity <= 0 ||
    !Number.isSafeInteger(batch.remaining_quantity) ||
    batch.remaining_quantity < 0 ||
    batch.remaining_quantity > batch.original_quantity ||
    !Number.isSafeInteger(batch.original_total_cost) ||
    batch.original_total_cost < 0 ||
    !Number.isSafeInteger(batch.remaining_total_cost) ||
    batch.remaining_total_cost < 0 ||
    batch.remaining_total_cost > batch.original_total_cost ||
    costedBatchHasMismatchedDepletion
  ) {
    throw new Error("Inventory batch contains invalid values.");
  }
}

export function checkedAddSafeIntegers(left: number, right: number, message: string): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) throw new Error(message);
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new Error(message);
  return result;
}

function checkedSubtractNonNegativeSafeIntegers(left: number, right: number, message: string): number {
  if (!Number.isSafeInteger(left) || left < 0 || !Number.isSafeInteger(right) || right < 0) throw new Error(message);
  const result = left - right;
  if (!Number.isSafeInteger(result) || result < 0) throw new Error(message);
  return result;
}

function allocateProportionalCost(remainingTotalCost: number, quantity: number, remainingQuantity: number): number {
  const numerator = BigInt(remainingTotalCost) * BigInt(quantity);
  const denominator = BigInt(remainingQuantity);
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;

  if (rounded < 0n || rounded > MAX_SAFE_INTEGER) {
    throw new Error("FIFO allocated cost is outside the safe integer range.");
  }
  const maximumPartialCost = remainingTotalCost > 0 ? remainingTotalCost - 1 : 0;
  return Math.min(Number(rounded), maximumPartialCost);
}

export function allocateFifo(batches: readonly InventoryBatch[], requestedQuantity: number): FifoAllocationResult {
  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error("Quantity to remove must be a positive whole number.");
  }

  for (const batch of batches) assertValidInventoryBatch(batch);
  const availableQuantity = batches.reduce(
    (sum, batch) => checkedAddSafeIntegers(sum, batch.remaining_quantity, "Available inventory quantity is too large."),
    0
  );
  if (requestedQuantity > availableQuantity) throw new Error("Stock cannot be reduced below zero.");

  let quantityLeft = requestedQuantity;
  let totalAllocatedCost = 0;
  const allocations: FifoBatchAllocation[] = [];
  const orderedBatches = [...batches].sort((left, right) => left.sequence - right.sequence);

  for (const batch of orderedBatches) {
    if (quantityLeft === 0) break;
    if (batch.remaining_quantity === 0) continue;

    const quantity = Math.min(quantityLeft, batch.remaining_quantity);
    const allocatedCost =
      quantity === batch.remaining_quantity
        ? batch.remaining_total_cost
        : allocateProportionalCost(batch.remaining_total_cost, quantity, batch.remaining_quantity);
    const updatedBatch: InventoryBatch = {
      ...batch,
      remaining_quantity: checkedSubtractNonNegativeSafeIntegers(
        batch.remaining_quantity,
        quantity,
        "FIFO remaining quantity is invalid."
      ),
      remaining_total_cost: checkedSubtractNonNegativeSafeIntegers(
        batch.remaining_total_cost,
        allocatedCost,
        "FIFO remaining cost is invalid."
      ),
    };
    assertValidInventoryBatch(updatedBatch);

    allocations.push({ batch: updatedBatch, quantity, allocated_cost: allocatedCost });
    totalAllocatedCost = checkedAddSafeIntegers(totalAllocatedCost, allocatedCost, "FIFO allocated cost is too large.");
    quantityLeft = checkedSubtractNonNegativeSafeIntegers(quantityLeft, quantity, "FIFO requested quantity is invalid.");
  }

  if (quantityLeft !== 0) throw new Error("FIFO allocation could not satisfy the requested quantity.");
  return { allocations, total_allocated_cost: totalAllocatedCost };
}

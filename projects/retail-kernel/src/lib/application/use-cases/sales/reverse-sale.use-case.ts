import { inject, Injectable } from "@angular/core";
import { DexieSaleRepository } from "../../../data-access/repositories/dexie-sale.repository";
import { Sale } from "../../../domain/models/sale.model";
import { ActiveOperatorService } from "../../services/active-operator.service";

@Injectable({ providedIn: "root" })
export class ReverseSaleUseCase {
  private readonly repository = inject(DexieSaleRepository);
  private readonly activeOperator = inject(ActiveOperatorService);

  async execute(saleId: string): Promise<Sale> {
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required.");

    return this.repository.reverseSale({
      originalSaleId: saleId,
      operatorId: operator.id,
      operatorName: operator.display_name,
      date: new Date(),
    });
  }
}
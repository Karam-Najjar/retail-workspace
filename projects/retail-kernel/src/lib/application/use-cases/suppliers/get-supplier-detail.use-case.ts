import { inject, Injectable } from "@angular/core";
import { Supplier } from "../../../domain/models/supplier.model";
import { DexieSupplierRepository } from "../../../data-access/repositories/dexie-supplier.repository";

@Injectable({ providedIn: "root" })
export class GetSupplierDetailUseCase {
  private readonly repository = inject(DexieSupplierRepository);
  execute(id: string): Promise<Supplier | undefined> {
    return this.repository.getById(id);
  }
}

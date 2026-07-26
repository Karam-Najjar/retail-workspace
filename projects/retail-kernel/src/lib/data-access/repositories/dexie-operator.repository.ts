import { inject, Injectable } from '@angular/core';
import { OperatorRepository } from '../../domain/repository-contracts/operator.repository';
import { Operator } from '../../domain/models/operator.model';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieOperatorRepository implements OperatorRepository {
  private readonly database = inject(RetailDatabase);

  getAll(): Promise<readonly Operator[]> {
    return this.database.operators.orderBy('slot').toArray();
  }

  getById(id: string): Promise<Operator | undefined> {
    return this.database.operators.get(id);
  }
}

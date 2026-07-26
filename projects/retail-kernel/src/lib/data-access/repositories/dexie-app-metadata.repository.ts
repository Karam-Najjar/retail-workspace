import { inject, Injectable } from '@angular/core';
import { AppMetadata } from '../../domain/models/app-metadata.model';
import { AppMetadataRepository } from '../../domain/repository-contracts/app-metadata.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieAppMetadataRepository implements AppMetadataRepository {
  private readonly database = inject(RetailDatabase);

  get(key: string): Promise<AppMetadata | undefined> {
    return this.database.app_metadata.get(key);
  }

  async save(metadata: AppMetadata): Promise<void> {
    await this.database.app_metadata.put(metadata);
  }
}

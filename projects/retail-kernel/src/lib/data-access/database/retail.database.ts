import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { AppMetadata } from '../../domain/models/app-metadata.model';
import { LicenceState } from '../../domain/models/licence-state.model';
import { Operator } from '../../domain/models/operator.model';
import { Settings } from '../../domain/models/settings.model';
import { Category } from '../../domain/models/category.model';
import { Supplier } from '../../domain/models/supplier.model';
import { Product } from '../../domain/models/product.model';
import { ProductBarcode } from '../../domain/models/product-barcode.model';
import { InventoryBatch } from '../../domain/models/inventory-batch.model';
import { InventoryMovement } from '../../domain/models/inventory-movement.model';
import { InventoryAdjustment } from '../../domain/models/inventory-adjustment.model';
import { RETAIL_DATABASE_NAME } from './database.constants';
import { SCHEMA_V2 } from './schema/schema-v2';
import { SCHEMA_V1 } from './schema/schema-v1';
import { SCHEMA_V3 } from './schema/schema-v3';
import { SCHEMA_V4 } from '../schema/schema-v4';
import { SCHEMA_V5 } from '../schema/schema-v5';

@Injectable({ providedIn: 'root' })
export class RetailDatabase extends Dexie {
  readonly operators!: Table<Operator, string>;
  readonly settings!: Table<Settings, 'app'>;
  readonly activity_logs!: Table<ActivityLog, string>;
  readonly licence_state!: Table<LicenceState, 'active'>;
  readonly app_metadata!: Table<AppMetadata, string>;
  readonly categories!: Table<Category, string>;
  readonly suppliers!: Table<Supplier, string>;
  readonly products!: Table<Product, string>;
  readonly productBarcodes!: Table<ProductBarcode, string>;
  readonly inventoryBatches!: Table<InventoryBatch, string>;
  readonly inventoryMovements!: Table<InventoryMovement, string>;
  readonly inventoryAdjustments!: Table<InventoryAdjustment, string>;

  constructor() {
    super(RETAIL_DATABASE_NAME);
    this.version(1).stores(SCHEMA_V1);
    this.version(2).stores(SCHEMA_V2);
    this.version(3).stores(SCHEMA_V3);
    this.version(4).stores(SCHEMA_V4);
    this.version(5).stores(SCHEMA_V5);
  }
}

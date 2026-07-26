import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { AppMetadata } from '../../domain/models/app-metadata.model';
import { LicenceState } from '../../domain/models/licence-state.model';
import { Operator } from '../../domain/models/operator.model';
import { Settings } from '../../domain/models/settings.model';
import { RETAIL_DATABASE_NAME } from './database.constants';
import { SCHEMA_V1 } from './schema/schema-v1';

@Injectable({ providedIn: 'root' })
export class RetailDatabase extends Dexie {
  readonly operators!: Table<Operator, string>;
  readonly settings!: Table<Settings, 'app'>;
  readonly activity_logs!: Table<ActivityLog, string>;
  readonly licence_state!: Table<LicenceState, 'active'>;
  readonly app_metadata!: Table<AppMetadata, string>;

  constructor() {
    super(RETAIL_DATABASE_NAME);
    this.version(1).stores(SCHEMA_V1);
  }
}

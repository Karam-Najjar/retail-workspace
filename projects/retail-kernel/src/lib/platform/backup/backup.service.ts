import { inject, Injectable } from '@angular/core';
import { exportDB } from 'dexie-export-import';
import { RetailDatabase } from '../../data-access/database/retail.database';
import { StoreProfileService } from '../../configuration/store-profile.service';
import { BackupManifest } from '../../domain/models/backup-manifest.model';
import { BackupChecksumService } from './backup-checksum.service';

export interface BackupFile { readonly manifest: BackupManifest; readonly data: unknown; }

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly database = inject(RetailDatabase);
  private readonly profile = inject(StoreProfileService);
  private readonly checksum = inject(BackupChecksumService);
  private readonly excludedTables = ['draftCarts', 'licence_state'];

  async create(): Promise<Blob> {
    const raw = await exportDB(this.database, { prettyJson: false, skipTables: this.excludedTables });
    const data: unknown = JSON.parse(await raw.text());
    const manifest: BackupManifest = { schema_version: 8, app_version: '1.0.0', profile_id: this.profile.profile.profile_id, export_timestamp: new Date().toISOString(), record_counts: await this.counts(), checksum: await this.checksum.sha256(JSON.stringify(data)) };
    return new Blob([JSON.stringify({ manifest, data } satisfies BackupFile)], { type: 'application/json' });
  }

  private async counts(): Promise<Readonly<Record<string, number>>> {
    const result: Record<string, number> = {};
    for (const table of this.database.tables) if (!this.excludedTables.includes(table.name)) result[table.name] = await table.count();
    return result;
  }
}

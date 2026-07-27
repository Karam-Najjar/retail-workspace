import { inject, Injectable } from '@angular/core';
import { BackupChecksumService } from './backup-checksum.service';
import { BackupFile } from './backup.service';

@Injectable({ providedIn: 'root' })
export class BackupValidator {
  private readonly checksum = inject(BackupChecksumService);
  async validate(file: File): Promise<BackupFile> {
    const parsed: unknown = JSON.parse(await file.text());
    if (!this.isBackup(parsed)) throw new Error('The selected file is not a valid retail backup.');
    if (await this.checksum.sha256(JSON.stringify(parsed.data)) !== parsed.manifest.checksum) throw new Error('The backup checksum does not match.');
    return parsed;
  }
  private isBackup(value: unknown): value is BackupFile { if (!value || typeof value !== 'object') return false; const candidate = value as { manifest?: { checksum?: unknown; export_timestamp?: unknown }; data?: unknown }; return typeof candidate.manifest?.checksum === 'string' && typeof candidate.manifest.export_timestamp === 'string' && candidate.data !== undefined; }
}

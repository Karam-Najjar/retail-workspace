import { inject, Injectable, signal } from "@angular/core";
import {
  ActivityLog,
  ActiveOperatorService,
  BackupService,
  BackupValidator,
  DatabaseInitializerService,
  DexieSettingsRepository,
  Operator,
  RestoreService,
  RetailDatabase,
  Settings,
  StorageHealth,
  StorageHealthService,
} from "@retail/kernel";
import { saveAs } from "file-saver";

@Injectable()
export class SettingsFacade {
  private readonly database = inject(RetailDatabase);
  private readonly settingsRepository = inject(DexieSettingsRepository);
  private readonly activeOperator = inject(ActiveOperatorService);
  private readonly backup = inject(BackupService);
  private readonly storageService = inject(StorageHealthService);
  private readonly validator = inject(BackupValidator);
  private readonly restore = inject(RestoreService);
  private readonly initializer = inject(DatabaseInitializerService);
  readonly settings = signal<Settings | null>(null);
  readonly operators = signal<readonly Operator[]>([]);
  readonly storage = signal<StorageHealth | null>(null);
  readonly busy = signal(false);
  readonly storageFeedback = signal<string | null>(null);
  async load(): Promise<void> {
    const [settings, operators, storage] = await Promise.all([
      this.settingsRepository.get(),
      this.database.operators.toArray(),
      this.storageService.getHealth(),
    ]);
    this.settings.set(settings ?? null);
    this.operators.set(operators);
    this.storage.set(storage);
  }
  async save(input: {
    readonly operatorOne: string;
    readonly operatorTwo: string;
    readonly rate: string;
    readonly threshold: number;
    readonly language: "en" | "ar";
  }): Promise<void> {
    const settings = this.settings();
    const actor = this.activeOperator.activeOperator();
    if (!settings || !actor) throw new Error("Settings could not be loaded.");
    this.busy.set(true);
    try {
      await this.database.transaction("rw", [this.database.settings, this.database.operators, this.database.activity_logs], async () => {
        const now = new Date();
        const next = {
          ...settings,
          currency_rate: input.rate,
          low_stock_threshold: input.threshold,
          language: input.language,
          last_modified_by_operator_id: actor.id,
        };
        await this.database.settings.put(next);
        const operators = this.operators();
        const first = operators.find(operator => operator.slot === 1);
        const second = operators.find(operator => operator.slot === 2);
        if (first) await this.database.operators.put({ ...first, display_name: input.operatorOne.trim(), updated_at: now });
        if (second) await this.database.operators.put({ ...second, display_name: input.operatorTwo.trim(), updated_at: now });
        const event: ActivityLog<{ readonly changed: readonly string[] }> = {
          id: crypto.randomUUID(),
          event_code: "settings.updated",
          entity_type: "settings",
          entity_id: "app",
          entity_name_snapshot: null,
          payload: { changed: ["operators", "currency_rate", "low_stock_threshold", "language"] },
          operator_id: actor.id,
          operator_name: actor.display_name,
          related_sale_id: null,
          related_supply_id: null,
          created_at: now,
        };
        await this.database.activity_logs.add(event);
      });
      await this.activeOperator.initialize();
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  async exportBackup(): Promise<void> {
    this.busy.set(true);
    try {
      const blob = await this.backup.create();
      saveAs(blob, `retail-backup-${new Date().toISOString().slice(0, 10)}.json`);
      const settings = this.settings();
      if (settings) await this.settingsRepository.save({ ...settings, last_backup_date: new Date() });
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  async persistStorage(): Promise<void> {
    this.busy.set(true);
    this.storageFeedback.set(null);
    try {
      const result = await this.storageService.requestPersistence();
      this.storageFeedback.set(`settings.persistence.${result}`);
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  async restoreBackup(file: File): Promise<void> {
    this.busy.set(true);
    try {
      const backup = await this.validator.validate(file);
      await this.restore.restore(backup);
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  async clearAllData(): Promise<void> {
    const actor = this.activeOperator.activeOperator();
    this.busy.set(true);
    try {
      if (actor)
        await this.database.activity_logs.add({
          id: crypto.randomUUID(),
          event_code: "data.cleared",
          entity_type: "system",
          entity_id: null,
          entity_name_snapshot: null,
          payload: {},
          operator_id: actor.id,
          operator_name: actor.display_name,
          related_sale_id: null,
          related_supply_id: null,
          created_at: new Date(),
        });
      for (const table of this.database.tables) await table.clear();
      await this.initializer.initialize();
      await this.activeOperator.initialize();
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
}

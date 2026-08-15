import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import {
  ActivityLog,
  ActiveOperatorService,
  BackupFile,
  BackupService,
  BackupValidator,
  CriticalOperationService,
  DatabaseInitializerService,
  DexieSettingsRepository,
  Operator,
  RestoreService,
  RetailDatabase,
  Settings,
  SettingsChangedField,
  StorageHealth,
  StorageHealthService,
  UpdateCurrencyRateUseCase,
  UpdateLowStockThresholdUseCase,
  UpdateOperatorsUseCase,
} from "@retail/kernel";
import { saveAs } from "file-saver";

const SETTINGS_OPERATION_ERROR_KEYS = {
  load: "settings.errors.load",
  save: "settings.errors.save",
  export: "settings.errors.export",
  persistence: "settings.errors.persistence",
  restore: "settings.errors.restore",
  clear: "settings.errors.clear",
} as const;

const CLEAR_ALL_EXCLUDED_TABLES = new Set<string>(["licence_state"]);

export type SettingsOperation = keyof typeof SETTINGS_OPERATION_ERROR_KEYS;

export interface SettingsOperationError {
  readonly operation: SettingsOperation;
  readonly messageKey: (typeof SETTINGS_OPERATION_ERROR_KEYS)[SettingsOperation];
}

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
  private readonly router = inject(Router);
  private readonly updateOperators = inject(UpdateOperatorsUseCase);
  private readonly updateCurrencyRate = inject(UpdateCurrencyRateUseCase);
  private readonly updateThreshold = inject(UpdateLowStockThresholdUseCase);
  private readonly criticalOperations = inject(CriticalOperationService);
  readonly settings = signal<Settings | null>(null);
  readonly operators = signal<readonly Operator[]>([]);
  readonly storage = signal<StorageHealth | null>(null);
  readonly busy = signal(false);
  readonly storageFeedback = signal<string | null>(null);
  readonly operationError = signal<SettingsOperationError | null>(null);

  async load(): Promise<void> {
    await this.runOperation("load", false, () => this.refresh());
  }

  private async refresh(): Promise<void> {
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
  }): Promise<void> {
    await this.runOperation("save", true, async () => {
      const settings = this.settings();
      const actor = this.activeOperator.activeOperator();
      if (!settings || !actor) throw new Error("Settings could not be loaded.");
      const currencyRate = this.updateCurrencyRate.execute(input.rate);
      const lowStockThreshold = this.updateThreshold.execute(input.threshold);
      await this.database.transaction("rw", [this.database.settings, this.database.operators, this.database.activity_logs], async () => {
        const operators = await this.database.operators.toArray();
        const [first, second] = this.updateOperators.execute(input, operators);
        const changed: SettingsChangedField[] = [];
        if (
          operators.find(operator => operator.slot === 1)?.display_name !== first.display_name ||
          operators.find(operator => operator.slot === 2)?.display_name !== second.display_name
        )
          changed.push("operators");
        if (settings.currency_rate !== currencyRate) changed.push("currency_rate");
        if (settings.low_stock_threshold !== lowStockThreshold) changed.push("low_stock_threshold");
        if (changed.length === 0) return;

        if (changed.includes("operators")) await this.database.operators.bulkPut([first, second]);
        await this.database.settings.put({
          ...settings,
          currency_rate: currencyRate,
          low_stock_threshold: lowStockThreshold,
          last_modified_by_operator_id: actor.id,
        });
        const event: ActivityLog<"settings.updated"> = {
          id: crypto.randomUUID(),
          event_code: "settings.updated",
          entity_type: "settings",
          entity_id: "app",
          entity_name_snapshot: null,
          payload: { changed },
          operator_id: actor.id,
          operator_name: actor.display_name,
          related_sale_id: null,
          related_supply_id: null,
          created_at: new Date(),
        };
        await this.database.activity_logs.add(event);
      });
      await this.activeOperator.initialize();
      await this.refresh();
    });
  }

  async exportBackup(): Promise<void> {
    await this.runOperation("export", true, async () => {
      const actor = this.activeOperator.activeOperator();
      if (!actor) throw new Error("An active operator is required to export a backup.");
      const blob = await this.backup.create();
      saveAs(blob, `retail-backup-${new Date().toISOString().slice(0, 10)}.json`);
      const settings = this.settings();
      if (settings) {
        const now = new Date();
        const event: ActivityLog<"settings.updated"> = {
          id: crypto.randomUUID(),
          event_code: "settings.updated",
          entity_type: "settings",
          entity_id: "app",
          entity_name_snapshot: null,
          payload: { changed: ["last_backup_date"] },
          operator_id: actor.id,
          operator_name: actor.display_name,
          related_sale_id: null,
          related_supply_id: null,
          created_at: now,
        };
        await this.database.transaction("rw", [this.database.settings, this.database.activity_logs], async () => {
          await this.database.settings.put({ ...settings, last_backup_date: now, last_modified_by_operator_id: actor.id });
          await this.database.activity_logs.add(event);
        });
      }
      await this.refresh();
    });
  }

  async persistStorage(): Promise<void> {
    await this.runOperation("persistence", true, async () => {
      this.storageFeedback.set(null);
      const result = await this.storageService.requestPersistence();
      this.storageFeedback.set(`settings.persistence.${result}`);
      await this.refresh();
    });
  }

  async validateBackup(file: File): Promise<BackupFile> {
    return this.runOperation("restore", false, () => this.validator.validate(file));
  }

  async restoreBackup(backup: BackupFile): Promise<void> {
    await this.runOperation("restore", true, async () => {
      const hasValidLicence = await this.restore.restore(backup);
      if (!hasValidLicence) {
        await this.router.navigateByUrl("/setup/licence");
        return;
      }
      window.location.reload();
    });
  }

  async clearAllData(): Promise<void> {
    await this.runOperation("clear", true, async () => {
      const actor = this.activeOperator.activeOperator();
      if (!actor) throw new Error("An active operator is required to clear application data.");
      try {
        const recoveryBackup = await this.backup.create();
        saveAs(recoveryBackup, `retail-pre-clear-backup-${new Date().toISOString().slice(0, 10)}.json`);
      } catch (error: unknown) {
        throw new Error("Data was not cleared because a recovery backup could not be prepared.", { cause: error });
      }

      try {
        const tablesToClear = this.database.tables.filter(table => !CLEAR_ALL_EXCLUDED_TABLES.has(table.name));
        await this.database.transaction("rw", tablesToClear, async () => {
          for (const table of tablesToClear) await table.clear();
          const event: ActivityLog<"data.cleared"> = {
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
          };
          await this.database.activity_logs.add(event);
        });
        await this.initializer.initialize();
      } catch (error: unknown) {
        throw new Error("The atomic data clear failed. The pre-clear recovery backup was downloaded.", { cause: error });
      }

      try {
        await this.activeOperator.initialize();
        await this.refresh();
      } catch (error: unknown) {
        throw new Error("Data was cleared, but application state could not be refreshed. Use the pre-clear recovery backup if needed.", {
          cause: error,
        });
      }
    });
  }

  private async runOperation<T>(operation: SettingsOperation, critical: boolean, action: () => Promise<T>): Promise<T> {
    this.operationError.set(null);
    const execute = async (): Promise<T> => {
      this.busy.set(true);
      try {
        return await action();
      } catch (error: unknown) {
        this.operationError.set({ operation, messageKey: SETTINGS_OPERATION_ERROR_KEYS[operation] });
        throw error;
      } finally {
        this.busy.set(false);
      }
    };
    return critical ? this.criticalOperations.run(execute) : execute();
  }
}

import { computed, inject, Injectable, signal } from "@angular/core";
import { RetailDatabase } from "../../data-access/database/retail.database";
import { Operator } from "../../domain/models/operator.model";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { SettingsEventPayload } from "../../domain/events/settings-event.payload";
import { isSettingsLanguage, SettingsLanguage } from "../use-cases/settings/change-language.use-case";
import { DexieOperatorRepository } from "../../data-access/repositories/dexie-operator.repository";
import { DexieSettingsRepository } from "../../data-access/repositories/dexie-settings.repository";

@Injectable({ providedIn: "root" })
export class ActiveOperatorService {
  private readonly operatorRepository = inject(DexieOperatorRepository);
  private readonly settingsRepository = inject(DexieSettingsRepository);
  private readonly database = inject(RetailDatabase);

  readonly operators = signal<readonly Operator[]>([]);
  readonly language = signal<SettingsLanguage>("en");
  private readonly activeOperatorId = signal<string | null>(null);
  readonly activeOperator = computed(() => this.operators().find(operator => operator.id === this.activeOperatorId()) ?? null);

  async initialize(): Promise<void> {
    const [operators, settings] = await Promise.all([this.operatorRepository.getAll(), this.settingsRepository.get()]);
    this.operators.set(operators);
    this.activeOperatorId.set(settings?.active_operator_id ?? null);
    this.language.set(isSettingsLanguage(settings?.language) ? settings.language : "en");
  }

  async setActiveOperator(operatorId: string): Promise<void> {
    const [operator, settings] = await Promise.all([this.operatorRepository.getById(operatorId), this.settingsRepository.get()]);
    const actor = this.activeOperator();

    if (!operator || !settings || !actor) {
      throw new Error("The selected operator could not be activated.");
    }
    if (settings.active_operator_id === operator.id) return;

    const event: ActivityLog<SettingsEventPayload<"settings.updated">> = {
      id: crypto.randomUUID(),
      event_code: "settings.updated",
      entity_type: "settings",
      entity_id: "app",
      entity_name_snapshot: null,
      payload: { changed: ["active_operator_id"] },
      operator_id: actor.id,
      operator_name: actor.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: new Date(),
    };
    await this.database.transaction("rw", [this.database.settings, this.database.activity_logs], async () => {
      await this.database.settings.put({
        ...settings,
        active_operator_id: operator.id,
        last_modified_by_operator_id: actor.id,
      });
      await this.database.activity_logs.add(event);
    });
    this.activeOperatorId.set(operator.id);
  }

  async setLanguage(value: unknown): Promise<void> {
    if (!isSettingsLanguage(value)) throw new Error("Language must be English or Arabic.");
    const actor = this.activeOperator();
    const settings = await this.settingsRepository.get();
    if (!actor || !settings) throw new Error("Settings and an active operator are required to change language.");
    if (settings.language === value) return;

    const event: ActivityLog<SettingsEventPayload<"settings.updated">> = {
      id: crypto.randomUUID(),
      event_code: "settings.updated",
      entity_type: "settings",
      entity_id: "app",
      entity_name_snapshot: null,
      payload: { changed: ["language"] },
      operator_id: actor.id,
      operator_name: actor.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: new Date(),
    };
    await this.database.transaction("rw", [this.database.settings, this.database.activity_logs], async () => {
      await this.database.settings.put({ ...settings, language: value, last_modified_by_operator_id: actor.id });
      await this.database.activity_logs.add(event);
    });
    this.language.set(value);
  }
}

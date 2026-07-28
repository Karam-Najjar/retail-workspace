import { inject, Injectable } from "@angular/core";
import { Settings } from "../../domain/models/settings.model";
import { SettingsRepository } from "../../domain/repository-contracts/settings.repository";
import { APP_SETTINGS_KEY } from "../database/database.constants";
import { RetailDatabase } from "../database/retail.database";

@Injectable({ providedIn: "root" })
export class DexieSettingsRepository implements SettingsRepository {
  private readonly database = inject(RetailDatabase);

  get(): Promise<Settings | undefined> {
    return this.database.settings.get(APP_SETTINGS_KEY);
  }

  async save(settings: Settings): Promise<void> {
    await this.database.settings.put(settings);
  }
}

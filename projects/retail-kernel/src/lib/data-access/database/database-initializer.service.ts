import { inject, Injectable } from "@angular/core";
import { AppMetadata } from "../../domain/models/app-metadata.model";
import { Operator } from "../../domain/models/operator.model";
import { Settings } from "../../domain/models/settings.model";
import { Category } from "../../domain/models/category.model";
import { APP_SETTINGS_KEY, CURRENT_SCHEMA_VERSION, OPERATOR_ONE_ID, OPERATOR_TWO_ID } from "./database.constants";
import { RetailDatabase } from "./retail.database";

@Injectable({ providedIn: "root" })
export class DatabaseInitializerService {
  private readonly database = inject(RetailDatabase);

  async initialize(): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.operators,
      this.database.settings,
      this.database.app_metadata,
      this.database.categories,
      async () => {
        const now = new Date();
        const systemCategory: Category = {
          id: "category-system-other",
          name: "Other",
          system_code: "other",
          created_by_operator_id: OPERATOR_ONE_ID,
          last_modified_by_operator_id: OPERATOR_ONE_ID,
          created_at: now,
          updated_at: now,
        };
        const existingOperators = await this.database.operators.count();

        if (existingOperators === 0) {
          const operators: readonly Operator[] = [
            { id: OPERATOR_ONE_ID, slot: 1, display_name: "User 1", created_at: now, updated_at: now },
            { id: OPERATOR_TWO_ID, slot: 2, display_name: "User 2", created_at: now, updated_at: now },
          ];
          await this.database.operators.bulkAdd(operators);
        }

        const settings = await this.database.settings.get(APP_SETTINGS_KEY);
        if (!settings) {
          const initialSettings: Settings = {
            _singleton_key: APP_SETTINGS_KEY,
            active_operator_id: OPERATOR_ONE_ID,
            currency_rate: "13300",
            low_stock_threshold: 5,
            language: "en",
            last_backup_date: null,
            last_modified_by_operator_id: OPERATOR_ONE_ID,
          };
          await this.database.settings.add(initialSettings);
        }

        const schemaMetadata: AppMetadata = { key: "schema_version", value: CURRENT_SCHEMA_VERSION, updated_at: now };
        await this.database.app_metadata.put(schemaMetadata);

        if (!(await this.database.app_metadata.get("app_version"))) {
          const appVersionMetadata: AppMetadata = { key: "app_version", value: "1.0.0", updated_at: now };
          await this.database.app_metadata.add(appVersionMetadata);
        }
        if (!(await this.database.categories.where("system_code").equals("other").first())) {
          await this.database.categories.add(systemCategory);
        }
      }
    );
  }
}

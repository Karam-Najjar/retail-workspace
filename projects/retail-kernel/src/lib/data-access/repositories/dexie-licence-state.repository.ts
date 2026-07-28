import { inject, Injectable } from "@angular/core";
import { LicenceState } from "../../domain/models/licence-state.model";
import { LicenceStateRepository } from "../../domain/repository-contracts/licence-state.repository";
import { ACTIVE_LICENCE_KEY } from "../database/database.constants";
import { RetailDatabase } from "../database/retail.database";

@Injectable({ providedIn: "root" })
export class DexieLicenceStateRepository implements LicenceStateRepository {
  private readonly database = inject(RetailDatabase);

  getActive(): Promise<LicenceState | undefined> {
    return this.database.licence_state.get(ACTIVE_LICENCE_KEY);
  }

  async save(state: LicenceState): Promise<void> {
    await this.database.licence_state.put(state);
  }

  async clear(): Promise<void> {
    await this.database.licence_state.delete(ACTIVE_LICENCE_KEY);
  }
}

import { LicenceState } from "../models/licence-state.model";

export interface LicenceStateRepository {
  getActive(): Promise<LicenceState | undefined>;
  save(state: LicenceState): Promise<void>;
  clear(): Promise<void>;
}

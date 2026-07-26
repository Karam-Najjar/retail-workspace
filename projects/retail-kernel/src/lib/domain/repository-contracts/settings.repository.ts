import { Settings } from '../models/settings.model';

export interface SettingsRepository {
  get(): Promise<Settings | undefined>;
  save(settings: Settings): Promise<void>;
}

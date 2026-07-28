import { AppMetadata } from "../models/app-metadata.model";

export interface AppMetadataRepository {
  get(key: string): Promise<AppMetadata | undefined>;
  save(metadata: AppMetadata): Promise<void>;
}

import { inject, Injectable } from "@angular/core";
import { saveAs } from "file-saver";
import { RetailDatabase, StorageHealth, StorageHealthService, StoreProfile, StoreProfileService } from "@retail/kernel";
import { ErrorLogEntry, ErrorLogService } from "../../core/errors/error-log.service";

export interface ReportIssueInput {
  readonly title: string;
  readonly description: string;
  readonly images: readonly File[];
}

interface DiagnosticCollectionError {
  readonly source: "metadata" | "recent_activity" | "storage";
  readonly message: string;
}

interface ReportIssueDiagnostics {
  readonly generated_at: string;
  readonly profile: StoreProfile;
  readonly version: {
    readonly app: string | number | boolean | null;
    readonly schema: string | number | boolean | null;
  };
  readonly storage: StorageHealth | null;
  readonly recent_activity: readonly unknown[];
  readonly error_log: readonly ErrorLogEntry[];
  readonly collection_errors: readonly DiagnosticCollectionError[];
}

const RECENT_ACTIVITY_LIMIT = 50;

@Injectable()
export class ReportIssueExportService {
  private readonly database = inject(RetailDatabase);
  private readonly profile = inject(StoreProfileService);
  private readonly storage = inject(StorageHealthService);
  private readonly errorLog = inject(ErrorLogService);

  async export(input: ReportIssueInput): Promise<void> {
    const generatedAt = new Date().toISOString();
    const diagnostics = await this.collectDiagnostics(generatedAt);
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    zip.file(
      "issue.json",
      formatJson({
        title: input.title.trim(),
        description: input.description.trim(),
        created_at: generatedAt,
        attachments: input.images.map((image, index) => `attachments/${attachmentName(image, index)}`),
      }),
    );
    zip.file("diagnostics.json", formatJson(diagnostics));
    input.images.forEach((image, index) => zip.file(`attachments/${attachmentName(image, index)}`, image));

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    saveAs(blob, `retail-issue-report-${fileTimestamp(generatedAt)}.zip`);
  }

  private async collectDiagnostics(generatedAt: string): Promise<ReportIssueDiagnostics> {
    const [metadataResult, activityResult, storageResult] = await Promise.allSettled([
      this.database.app_metadata.bulkGet(["app_version", "schema_version"]),
      this.database.activity_logs.orderBy("created_at").reverse().limit(RECENT_ACTIVITY_LIMIT).toArray(),
      this.storage.getHealth(),
    ]);
    const collectionErrors: DiagnosticCollectionError[] = [];

    if (metadataResult.status === "rejected") collectionErrors.push(collectionError("metadata", metadataResult.reason));
    if (activityResult.status === "rejected") collectionErrors.push(collectionError("recent_activity", activityResult.reason));
    if (storageResult.status === "rejected") collectionErrors.push(collectionError("storage", storageResult.reason));

    const metadata = metadataResult.status === "fulfilled" ? metadataResult.value : [];
    return {
      generated_at: generatedAt,
      profile: this.profile.profile,
      version: {
        app: diagnosticVersion(metadata.find(item => item?.key === "app_version")?.value),
        schema: diagnosticVersion(metadata.find(item => item?.key === "schema_version")?.value),
      },
      storage: storageResult.status === "fulfilled" ? storageResult.value : null,
      recent_activity: activityResult.status === "fulfilled" ? activityResult.value : [],
      error_log: this.errorLog.recent(),
      collection_errors: collectionErrors,
    };
  }
}

function collectionError(source: DiagnosticCollectionError["source"], error: unknown): DiagnosticCollectionError {
  return { source, message: error instanceof Error ? error.message : String(error) };
}

function diagnosticVersion(value: unknown): string | number | boolean | null {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null;
}

function attachmentName(file: File, index: number): string {
  const safeName = file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim() || `image-${index + 1}`;
  return `${String(index + 1).padStart(2, "0")}-${safeName}`;
}

function fileTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-");
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

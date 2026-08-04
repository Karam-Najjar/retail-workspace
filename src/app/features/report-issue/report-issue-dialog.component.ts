import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { TranslatePipe } from "@ngx-translate/core";
import { ReportIssueExportService } from "./report-issue-export.service";

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageSelectionError = "reportIssue.errors.imageCount" | "reportIssue.errors.imageSize" | "reportIssue.errors.imageType";

@Component({
  selector: "app-report-issue-dialog",
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, TranslatePipe],
  providers: [ReportIssueExportService],
  templateUrl: "./report-issue-dialog.component.html",
  styleUrl: "./report-issue-dialog.component.scss",
})
export class ReportIssueDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ReportIssueDialogComponent>);
  private readonly exporter = inject(ReportIssueExportService);
  protected title = "";
  protected description = "";
  protected images: readonly File[] = [];
  protected selectionError: ImageSelectionError | null = null;
  protected exportFailed = false;
  protected exporting = false;

  protected valid(): boolean {
    return this.title.trim().length > 0 && this.description.trim().length > 0;
  }

  protected selectImages(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const selected = Array.from(input.files ?? []);
    input.value = "";
    this.selectionError = validateImages(selected);
    if (!this.selectionError) this.images = selected;
  }

  protected removeImage(index: number): void {
    this.images = this.images.filter((_, imageIndex) => imageIndex !== index);
    this.selectionError = null;
  }

  protected formatBytes(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async submit(): Promise<void> {
    if (!this.valid() || this.exporting) return;
    this.exporting = true;
    this.exportFailed = false;
    try {
      await this.exporter.export({ title: this.title, description: this.description, images: this.images });
      this.close();
    } catch (error: unknown) {
      console.error("Issue report export failed.", error);
      this.exportFailed = true;
    } finally {
      this.exporting = false;
    }
  }
}

function validateImages(images: readonly File[]): ImageSelectionError | null {
  if (images.length > MAX_IMAGE_COUNT) return "reportIssue.errors.imageCount";
  if (images.some(image => !image.type.startsWith("image/"))) return "reportIssue.errors.imageType";
  if (images.some(image => image.size > MAX_IMAGE_BYTES)) return "reportIssue.errors.imageSize";
  return null;
}

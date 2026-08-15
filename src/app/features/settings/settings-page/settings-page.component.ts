import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { firstValueFrom } from "rxjs";
import { BackupFile, isValidLowStockThreshold, isValidOperatorName, normalizePositiveDecimal, StorageHealth } from "@retail/kernel";
import { TranslationService } from "../../../core/i18n/translation.service";
import { NotificationService } from "../../../core/notifications/notification.service";
import { SettingsConfirmationDialogComponent } from "../settings-confirmation-dialog/settings-confirmation-dialog.component";
import { SettingsFacade, SettingsOperation } from "../settings.facade";
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: "app-settings-page",
  imports: [FormsModule, MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatInputModule, TranslatePipe, MatIcon],
  providers: [SettingsFacade],
  templateUrl: "./settings-page.component.html",
  styleUrl: "./settings-page.component.scss",
})
export class SettingsPageComponent implements OnInit {
  protected readonly facade = inject(SettingsFacade);
  private readonly translation = inject(TranslationService);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  protected readonly normalizePositiveDecimal = normalizePositiveDecimal;
  protected readonly isValidLowStockThreshold = isValidLowStockThreshold;
  protected operatorOne = "";
  protected operatorTwo = "";
  protected rate = "";
  protected threshold = 5;
  protected storeNameEn = "";
  protected storeNameAr = "";

  async ngOnInit(): Promise<void> {
    try {
      await this.facade.load();
      this.fill();
    } catch (error: unknown) {
      this.logHandledError("load", error);
      this.notifications.error("settings.errors.load");
    }
  }

  protected async save(): Promise<void> {
    try {
      await this.facade.save({
        operatorOne: this.operatorOne,
        operatorTwo: this.operatorTwo,
        rate: this.rate,
        threshold: this.threshold,
        storeNameEn: this.storeNameEn,
        storeNameAr: this.storeNameAr,
      });
      this.notifications.success("notifications.success.settingsSaved");
    } catch (error: unknown) {
      this.logHandledError("save", error);
      this.notifications.error("settings.errors.save");
    }
  }

  protected async export(): Promise<void> {
    try {
      await this.facade.exportBackup();
      this.notifications.success("notifications.success.backupExported");
    } catch (error: unknown) {
      this.logHandledError("export", error);
      this.notifications.error("settings.errors.export");
    }
  }

  protected async persist(): Promise<void> {
    try {
      await this.facade.persistStorage();
      const feedback = this.facade.storageFeedback();
      if (feedback === "settings.persistence.granted") this.notifications.success(feedback);
      else if (feedback) this.notifications.warning(feedback);
    } catch (error: unknown) {
      this.logHandledError("persistence", error);
      this.notifications.error("settings.errors.persistence");
    }
  }

  protected async restore(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    try {
      const backup = await this.facade.validateBackup(input.files[0]);
      if (!(await this.confirmRestorePreview(backup))) return;
      if (
        !(await this.confirmAction({
          titleKey: "settings.restore.confirmTitle",
          messageKey: "settings.restore.confirmMessage",
        }))
      )
        return;
      await this.facade.restoreBackup(backup);
      this.notifications.success("notifications.success.backupRestored");
    } catch (error: unknown) {
      this.logHandledError("restore", error);
      this.notifications.error("settings.errors.restore");
    } finally {
      input.value = "";
    }
  }

  protected async clearAll(): Promise<void> {
    try {
      if (!(await this.confirmAction({ titleKey: "settings.clear.title", messageKey: "settings.clear.message" }))) return;
      if (
        !(await this.confirmAction({
          titleKey: "settings.clear.verifyTitle",
          messageKey: "settings.clear.verifyMessage",
          requiredText: "DELETE",
          confirmationLabelKey: "settings.clear.verifyLabel",
        }))
      )
        return;
      await this.facade.clearAllData();
      this.notifications.success("notifications.success.dataCleared");
    } catch (error: unknown) {
      this.logHandledError("clear", error);
      this.notifications.error("settings.errors.clear");
    }
  }
  protected settingsFormValid(): boolean {
    return (
      isValidOperatorName(this.operatorOne) &&
      isValidOperatorName(this.operatorTwo) &&
      normalizePositiveDecimal(this.rate) !== null &&
      isValidLowStockThreshold(this.threshold)
    );
  }
  protected storageUsagePercent(health: StorageHealth): number {
    if (health.usage === null || health.quota === null || health.quota <= 0) return 0;
    return Math.min(100, Math.max(0, (health.usage / health.quota) * 100));
  }
  protected formatBytes(value: number | null): string {
    if (value === null) return "—";
    const bytes = Math.max(0, value);
    const units = ["bytes", "kilobytes", "megabytes", "gigabytes", "terabytes"] as const;
    const unitIndex = bytes === 0 ? 0 : Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const amount = bytes / 1024 ** unitIndex;
    const formatted = new Intl.NumberFormat(this.translation.activeLanguage(), { maximumFractionDigits: 1 }).format(amount);
    return `${formatted} ${String(this.translate.instant(`settings.storageUnits.${units[unitIndex]}`))}`;
  }
  private async confirmRestorePreview(backup: BackupFile): Promise<boolean> {
    const manifest = backup.manifest;
    const date = new Intl.DateTimeFormat(this.translation.activeLanguage(), { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(manifest.export_timestamp)
    );
    const details = [
      String(this.translate.instant("settings.restore.profile", { value: manifest.profile_id })),
      String(this.translate.instant("settings.restore.schema", { value: manifest.schema_version })),
      String(this.translate.instant("settings.restore.appVersion", { value: manifest.app_version })),
      String(this.translate.instant("settings.restore.timestamp", { value: date })),
      ...Object.entries(manifest.record_counts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([table, count]) => String(this.translate.instant("settings.restore.recordCount", { table, count }))),
    ];
    return this.confirmAction({ titleKey: "settings.restore.previewTitle", messageKey: "settings.restore.previewMessage", details });
  }
  private async confirmAction(options: {
    readonly titleKey: string;
    readonly messageKey: string;
    readonly details?: readonly string[];
    readonly requiredText?: string;
    readonly confirmationLabelKey?: string;
  }): Promise<boolean> {
    const dialogRef = this.dialog.open(SettingsConfirmationDialogComponent, { width: "min(34rem, calc(100vw - 2rem))" });
    dialogRef.componentRef?.setInput("titleKey", options.titleKey);
    dialogRef.componentRef?.setInput("message", String(this.translate.instant(options.messageKey)));
    dialogRef.componentRef?.setInput("details", options.details ?? []);
    dialogRef.componentRef?.setInput("requiredText", options.requiredText ?? null);
    dialogRef.componentRef?.setInput(
      "confirmationLabel",
      options.confirmationLabelKey ? String(this.translate.instant(options.confirmationLabelKey)) : ""
    );
    return (await firstValueFrom(dialogRef.afterClosed())) === true;
  }
  private fill(): void {
    const operators = this.facade.operators();
    this.operatorOne = operators.find(operator => operator.slot === 1)?.display_name ?? "";
    this.operatorTwo = operators.find(operator => operator.slot === 2)?.display_name ?? "";
    const settings = this.facade.settings();
    this.rate = settings?.currency_rate ?? "";
    this.threshold = settings?.low_stock_threshold ?? 5;
    this.storeNameEn = settings?.store_name_en ?? "";
    this.storeNameAr = settings?.store_name_ar ?? "";
  }

  private logHandledError(operation: SettingsOperation, error: unknown): void {
    console.error(`Settings ${operation} operation failed.`, error);
  }
}

import { Component, computed, inject, output, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatToolbarModule } from "@angular/material/toolbar";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { liveQuery } from "dexie";
import { TranslationService } from "../../core/i18n/translation.service";
import { ActiveOperatorService, DexieSettingsRepository, Settings } from "@retail/kernel";
import type { SettingsLanguage } from "@retail/kernel";

@Component({
  selector: "app-top-bar",
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatMenuModule, MatToolbarModule, TranslatePipe],
  templateUrl: "./top-bar.component.html",
  styleUrl: "./top-bar.component.scss",
})
export class TopBarComponent {
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  protected readonly translation = inject(TranslationService);
  protected readonly activeOperator = inject(ActiveOperatorService);
  private readonly settingsRepo = inject(DexieSettingsRepository);
  private readonly settingsSignal = signal<Settings | undefined>(undefined);
  readonly navigationToggle = output<void>();

  protected readonly storeName = computed(() => {
    const settings = this.settingsSignal();
    if (!settings) return "";
    return this.translation.activeLanguage() === "ar" ? (settings.store_name_ar ?? "") : (settings.store_name_en ?? "");
  });

  constructor() {
    liveQuery(() => this.settingsRepo.get()).subscribe(settings => {
      this.settingsSignal.set(settings);
    });
  }

  protected async openReportIssue(): Promise<void> {
    const { ReportIssueDialogComponent } = await import("../../features/report-issue/report-issue-dialog.component");
    this.dialog.open(ReportIssueDialogComponent, {
      width: "min(40rem, calc(100vw - 2rem))",
      maxHeight: "calc(100vh - 2rem)",
    });
  }

  protected async selectOperator(operatorId: string): Promise<void> {
    await this.activeOperator.setActiveOperator(operatorId);
  }

  protected async toggleLanguage(): Promise<void> {
    const language: SettingsLanguage = this.translation.activeLanguage() === "en" ? "ar" : "en";
    await this.activeOperator.setLanguage(language);
    this.translation.setLanguage(language);
  }
}

import { Component, inject, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { TranslatePipe } from "@ngx-translate/core";
import { TranslationService } from "../../../core/i18n/translation.service";
import { SettingsFacade } from "../settings.facade";
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: "app-settings-page",
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, TranslatePipe, MatIcon],
  providers: [SettingsFacade],
  templateUrl: "./settings-page.component.html",
  styleUrl: "./settings-page.component.scss",
})
export class SettingsPageComponent implements OnInit {
  protected readonly facade = inject(SettingsFacade);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);
  protected operatorOne = "";
  protected operatorTwo = "";
  protected rate = "";
  protected threshold = 5;
  protected language: "en" | "ar" = "en";
  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.fill();
  }
  protected async save(): Promise<void> {
    await this.facade.save({
      operatorOne: this.operatorOne,
      operatorTwo: this.operatorTwo,
      rate: this.rate,
      threshold: this.threshold,
      language: this.language,
    });
    this.translation.setLanguage(this.language);
  }
  protected export(): void {
    void this.facade.exportBackup();
  }
  protected persist(): void {
    void this.facade.persistStorage();
  }
  protected restore(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    if (confirm("This will replace ALL current data. Continue?")) void this.facade.restoreBackup(input.files[0]);
  }
  protected async clearAll(): Promise<void> {
    if (!confirm("This will permanently delete ALL data. This cannot be undone.")) return;
    if (prompt("Type 'DELETE' to confirm") !== "DELETE") return;
    await this.facade.clearAllData();
    await this.router.navigate(["/setup/licence"]);
  }
  private fill(): void {
    const operators = this.facade.operators();
    this.operatorOne = operators.find(operator => operator.slot === 1)?.display_name ?? "";
    this.operatorTwo = operators.find(operator => operator.slot === 2)?.display_name ?? "";
    const settings = this.facade.settings();
    this.rate = settings?.currency_rate ?? "";
    this.threshold = settings?.low_stock_threshold ?? 5;
    this.language = settings?.language ?? "en";
  }
}

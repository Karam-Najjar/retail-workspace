import { inject, Injectable, signal } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { firstValueFrom } from "rxjs";
import { AppLanguage, DirectionalityService } from "./directionality.service";

@Injectable({ providedIn: "root" })
export class TranslationService {
  private readonly translate = inject(TranslateService);
  private readonly directionality = inject(DirectionalityService);

  readonly activeLanguage = signal<AppLanguage>("en");

  constructor() {
    this.translate.addLangs(["en", "ar"]);
  }

  async setLanguage(language: AppLanguage): Promise<void> {
    this.activeLanguage.set(language);
    this.directionality.setLanguage(language);
    await firstValueFrom(this.translate.use(language));
  }

  async toggleLanguage(): Promise<void> {
    await this.setLanguage(this.activeLanguage() === "en" ? "ar" : "en");
  }
}

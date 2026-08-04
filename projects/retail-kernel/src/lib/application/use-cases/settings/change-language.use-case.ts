import { Injectable } from "@angular/core";

export type SettingsLanguage = "en" | "ar";

export function isSettingsLanguage(value: unknown): value is SettingsLanguage {
  return value === "en" || value === "ar";
}

@Injectable({ providedIn: "root" })
export class ChangeLanguageUseCase {
  execute(language: unknown): SettingsLanguage {
    if (!isSettingsLanguage(language)) throw new Error("Language must be English or Arabic.");
    return language;
  }
}

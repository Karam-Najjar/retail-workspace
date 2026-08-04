import { inject, Injectable, NgZone } from "@angular/core";
import { Direction } from "@angular/cdk/bidi";
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from "@angular/material/snack-bar";
import { TranslateService } from "@ngx-translate/core";
import { DirectionalityService } from "../i18n/directionality.service";

export type NotificationType = "success" | "info" | "warning" | "error";

export interface NotificationRequest {
  readonly type: NotificationType;
  readonly messageKey: string;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly dedupeKey?: string;
}

type TranslationRecord = Readonly<Record<string, unknown>>;

const NOTIFICATION_DURATION: Readonly<Record<Exclude<NotificationType, "error">, number>> = {
  success: 3_000,
  info: 3_000,
  warning: 5_000,
};

@Injectable({ providedIn: "root" })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly directionality = inject(DirectionalityService);
  private readonly zone = inject(NgZone);
  private englishTranslations: TranslationRecord = {};
  private initializePromise: Promise<void> | null = null;
  private activeReference: MatSnackBarRef<TextOnlySnackBar> | null = null;
  private activeDedupeKey: string | null = null;

  initialize(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = this.loadEnglishTranslations();
    }

    return this.initializePromise;
  }

  success(messageKey: string, params?: NotificationRequest["params"], dedupeKey?: string): void {
    this.show({ type: "success", messageKey, params, dedupeKey });
  }

  info(messageKey: string, params?: NotificationRequest["params"], dedupeKey?: string): void {
    this.show({ type: "info", messageKey, params, dedupeKey });
  }

  warning(messageKey: string, params?: NotificationRequest["params"], dedupeKey?: string): void {
    this.show({ type: "warning", messageKey, params, dedupeKey });
  }

  error(messageKey: string, params?: NotificationRequest["params"], dedupeKey?: string): void {
    this.show({ type: "error", messageKey, params, dedupeKey });
  }

  show(request: NotificationRequest): void {
    const dedupeKey = request.dedupeKey ?? this.createDedupeKey(request);
    if (this.activeReference && this.activeDedupeKey === dedupeKey) return;

    this.zone.run(() => {
      this.activeReference?.dismiss();
      const reference = this.snackBar.open(this.message(request.messageKey, request.params), request.type === "error" ? this.message("notifications.dismiss") : undefined, {
        duration: request.type === "error" ? undefined : NOTIFICATION_DURATION[request.type],
        horizontalPosition: "end",
        verticalPosition: "top",
        direction: this.direction(),
        politeness: request.type === "error" ? "assertive" : "polite",
        panelClass: [`app-notification--${request.type}`],
      });

      this.activeReference = reference;
      this.activeDedupeKey = dedupeKey;
      reference.afterDismissed().subscribe(() => {
        if (this.activeReference === reference) {
          this.activeReference = null;
          this.activeDedupeKey = null;
        }
      });
    });
  }

  private async loadEnglishTranslations(): Promise<void> {
    const translations: unknown = this.translate.getTranslations("en");
    this.englishTranslations = isTranslationRecord(translations) ? translations : {};
  }

  private message(key: string, params?: NotificationRequest["params"]): string {
    const translated: unknown = this.translate.instant(key, params);
    if (typeof translated === "string" && translated.trim().length > 0 && translated !== key) return translated;

    return interpolate(this.translationValue(key), params) || key;
  }

  private translationValue(key: string): string {
    let value: unknown = this.englishTranslations;
    for (const segment of key.split(".")) {
      if (!isTranslationRecord(value)) return "";
      value = value[segment];
    }

    return typeof value === "string" ? value : "";
  }

  private createDedupeKey(request: NotificationRequest): string {
    const params = request.params
      ? Object.keys(request.params)
          .sort()
          .map(key => `${key}:${request.params?.[key]}`)
          .join("|")
      : "";

    return `${request.type}:${request.messageKey}:${params}`;
  }

  private direction(): Direction {
    return this.directionality.direction();
  }
}

function isTranslationRecord(value: unknown): value is TranslationRecord {
  return typeof value === "object" && value !== null;
}

function interpolate(template: string, params: NotificationRequest["params"]): string {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (_match, parameter: string) => String(params?.[parameter] ?? ""));
}

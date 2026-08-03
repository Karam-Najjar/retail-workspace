import { DestroyRef, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { SwUpdate } from "@angular/service-worker";

@Injectable({ providedIn: "root" })
export class PwaUpdateService {
  private static readonly checkIntervalMs = 60 * 60 * 1000;
  private readonly updates = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);
  private checking = false;
  readonly ready = signal(false);
  readonly enabled = this.updates.isEnabled;
  readonly checkFailed = signal(false);

  constructor() {
    this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event.type === "VERSION_READY") this.ready.set(true);
    });

    if (!this.enabled) return;

    const checkWhenAvailable = (): void => {
      void this.checkForUpdate();
    };
    const checkWhenVisible = (): void => {
      if (document.visibilityState === "visible") checkWhenAvailable();
    };
    const intervalId = window.setInterval(checkWhenAvailable, PwaUpdateService.checkIntervalMs);
    window.addEventListener("online", checkWhenAvailable);
    document.addEventListener("visibilitychange", checkWhenVisible);
    this.destroyRef.onDestroy(() => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", checkWhenAvailable);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    });
    checkWhenAvailable();
  }

  async apply(): Promise<void> {
    if (this.ready() && (await this.updates.activateUpdate())) location.reload();
  }

  private async checkForUpdate(): Promise<void> {
    if (this.checking || !navigator.onLine || document.visibilityState !== "visible") return;
    this.checking = true;
    try {
      await this.updates.checkForUpdate();
      this.checkFailed.set(false);
    } catch (error: unknown) {
      this.checkFailed.set(true);
      console.error("PWA update check failed.", error);
    } finally {
      this.checking = false;
    }
  }
}

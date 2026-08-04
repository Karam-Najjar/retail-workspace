import { Injectable, OnDestroy } from "@angular/core";

@Injectable({ providedIn: "root" })
export class MultiTabService implements OnDestroy {
  private acquisition: Promise<boolean> | null = null;
  private releaseCurrentLock: (() => void) | null = null;

  async claimPos(): Promise<boolean> {
    if (this.releaseCurrentLock) return true;
    if (this.acquisition) return this.acquisition;
    if (typeof navigator === "undefined" || !("locks" in navigator)) return false;

    this.acquisition = this.acquireLock();
    try {
      return await this.acquisition;
    } finally {
      this.acquisition = null;
    }
  }

  releasePos(): void {
    this.releaseCurrentLock?.();
    this.releaseCurrentLock = null;
  }

  ngOnDestroy(): void {
    this.releasePos();
  }

  private acquireLock(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      void navigator.locks
        .request("retail-pos", { mode: "exclusive", ifAvailable: true }, async lock => {
          if (!lock) {
            resolve(false);
            return;
          }

          const released = new Promise<void>(release => {
            this.releaseCurrentLock = release;
          });
          resolve(true);
          await released;
        })
        .catch((error: unknown) => {
          console.error("POS ownership could not be acquired.", error);
          resolve(false);
        });
    });
  }
}

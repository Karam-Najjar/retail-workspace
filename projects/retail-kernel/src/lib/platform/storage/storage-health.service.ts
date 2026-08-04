import { Injectable } from "@angular/core";

export interface StorageHealth {
  readonly available: boolean;
  readonly error: boolean;
  readonly quota: number | null;
  readonly usage: number | null;
  readonly persisted: boolean;
  readonly persistence_supported: boolean;
  readonly persistence_error: boolean;
  readonly low_space: boolean;
}
export type PersistenceRequestResult = "granted" | "denied" | "unsupported" | "error";

@Injectable({ providedIn: "root" })
export class StorageHealthService {
  async getHealth(): Promise<StorageHealth> {
    if (!("indexedDB" in globalThis) || typeof navigator === "undefined" || !navigator.storage) return unavailableHealth(false);
    const storage = navigator.storage;
    let quota: number | null = null;
    let usage: number | null = null;
    let estimateError = false;
    if (typeof storage.estimate === "function") {
      try {
        const estimate = await storage.estimate();
        quota = estimate.quota ?? null;
        usage = estimate.usage ?? null;
      } catch (error: unknown) {
        console.error("navigator.storage.estimate() failed:", error);
        estimateError = true;
      }
    }

    const persistenceSupported = typeof storage.persisted === "function" && typeof storage.persist === "function";
    let persisted = false;
    let persistenceError = false;
    if (persistenceSupported) {
      try {
        persisted = await storage.persisted();
      } catch (error: unknown) {
        console.error("navigator.storage.persisted() failed:", error);
        persistenceError = true;
      }
    }

    const available = !estimateError && typeof storage.estimate === "function";
    return {
      available,
      error: estimateError,
      quota,
      usage,
      persisted,
      persistence_supported: persistenceSupported,
      persistence_error: persistenceError,
      low_space: available && quota !== null && usage !== null && quota > 0 && (quota - usage) / quota < 0.1,
    };
  }
  async requestPersistence(): Promise<PersistenceRequestResult> {
    if (!navigator.storage || typeof navigator.storage.persist !== "function") {
      console.info("Persistent storage API is not supported by this browser.");
      return "unsupported";
    }
    try {
      const granted = await navigator.storage.persist();
      console.info("navigator.storage.persist() resolved:", granted);
      return granted ? "granted" : "denied";
    } catch (error: unknown) {
      console.error("navigator.storage.persist() failed:", error);
      return "error";
    }
  }
}

function unavailableHealth(error: boolean): StorageHealth {
  return {
    available: false,
    error,
    quota: null,
    usage: null,
    persisted: false,
    persistence_supported: false,
    persistence_error: false,
    low_space: false,
  };
}

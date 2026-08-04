import { computed, Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class CriticalOperationService {
  private readonly activeCount = signal(0);

  readonly active = computed(() => this.activeCount() > 0);

  async run<T>(operation: () => Promise<T>): Promise<T> {
    this.activeCount.update(count => count + 1);
    try {
      return await operation();
    } finally {
      this.activeCount.update(count => Math.max(0, count - 1));
    }
  }
}

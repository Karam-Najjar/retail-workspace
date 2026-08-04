import { Injectable } from "@angular/core";

export interface ErrorLogEntry {
  readonly occurred_at: string;
  readonly name: string;
  readonly message: string;
  readonly stack: string | null;
}

const MAX_ERROR_ENTRIES = 50;

@Injectable({ providedIn: "root" })
export class ErrorLogService {
  private readonly entries: ErrorLogEntry[] = [];

  record(error: unknown): void {
    this.entries.push(toErrorLogEntry(error));
    if (this.entries.length > MAX_ERROR_ENTRIES) this.entries.splice(0, this.entries.length - MAX_ERROR_ENTRIES);
  }

  recent(): readonly ErrorLogEntry[] {
    return [...this.entries].reverse();
  }
}

function toErrorLogEntry(error: unknown): ErrorLogEntry {
  if (error instanceof Error) {
    return {
      occurred_at: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    occurred_at: new Date().toISOString(),
    name: "UnknownError",
    message: describeUnknown(error),
    stack: null,
  };
}

function describeUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  try {
    const serialized = JSON.stringify(value);
    return serialized ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

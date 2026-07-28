import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class BackupChecksumService {
  async sha256(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
}

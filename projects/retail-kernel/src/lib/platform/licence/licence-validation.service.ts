import { inject, Injectable } from "@angular/core";
import { importJWK, jwtVerify, JWK } from "jose";
import { STORE_PROFILE } from "../../configuration/store-profile.token";
import { LicenceState } from "../../domain/models/licence-state.model";
import { DexieLicenceStateRepository } from "../../data-access/repositories/dexie-licence-state.repository";

export interface VerifiedLicencePayload {
  readonly sub: string;
  readonly profile_id: string;
  readonly features: readonly string[];
  readonly iat: number;
  readonly exp: number;
}

export type LicenceValidationResult =
  { readonly valid: true; readonly payload: VerifiedLicencePayload } | { readonly valid: false; readonly error: string };

const TEMPORARY_PUBLIC_JWK_BASE64URL =
  "eyJrdHkiOiJFQyIsIngiOiJpYVJjeW1hZUtFcE5kX3FSMEY1N1o1WTY3WGozTEltcGFodzdMcHFSU3BnIiwieSI6IkxBWjNyTkFWUVRDeWpleERfcWxPaFZwNi12cU9LSUpuZjlsSkdadHJCVk0iLCJjcnYiOiJQLTI1NiJ9";

function decodePublicJwk(): JWK {
  const encoded = TEMPORARY_PUBLIC_JWK_BASE64URL.replace(/-/g, "+").replace(/_/g, "/");
  const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const parsed: unknown = JSON.parse(atob(padded));

  if (!isRecord(parsed) || parsed["kty"] !== "EC" || parsed["crv"] !== "P-256") {
    throw new Error("The embedded licence public key is invalid.");
  }
  return parsed as JWK;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVerifiedLicencePayload(value: unknown): value is VerifiedLicencePayload {
  if (!isRecord(value)) {
    return false;
  }

  const features = value["features"];
  return (
    typeof value["sub"] === "string" &&
    value["sub"].length > 0 &&
    typeof value["profile_id"] === "string" &&
    Array.isArray(features) &&
    features.every(feature => typeof feature === "string") &&
    isValidNumericDate(value["iat"]) &&
    isValidNumericDate(value["exp"])
  );
}

function isValidNumericDate(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

@Injectable({ providedIn: "root" })
export class LicenceValidationService {
  private readonly profile = inject(STORE_PROFILE);
  private readonly repository = inject(DexieLicenceStateRepository);

  async verifyAndActivate(compactJws: string): Promise<LicenceValidationResult> {
    const normalizedJws = compactJws.trim();
    const result = await this.verifyCompactJws(normalizedJws);
    if (!result.valid) {
      return result;
    }

    const state: LicenceState = {
      id: "active",
      compact_jws: normalizedJws,
      verified_payload: result.payload,
      verified_at: new Date(),
    };
    await this.repository.save(state);
    return result;
  }

  async hasValidLicence(): Promise<boolean> {
    const state = await this.repository.getActive();
    if (!state) {
      return false;
    }

    return (await this.verifyCompactJws(state.compact_jws)).valid;
  }

  private async verifyCompactJws(compactJws: string): Promise<LicenceValidationResult> {
    try {
      const key = await importJWK(decodePublicJwk(), "ES256");
      const { payload, protectedHeader } = await jwtVerify(compactJws, key, { algorithms: ["ES256"] });
      if (protectedHeader.alg !== "ES256" || !isVerifiedLicencePayload(payload)) {
        return { valid: false, error: "The licence format is invalid." };
      }
      if (payload.profile_id !== this.profile.profile_id) {
        return { valid: false, error: "This licence does not match the active store profile." };
      }
      const now = Math.floor(Date.now() / 1000);
      if (payload.iat > now || payload.exp <= payload.iat) {
        return { valid: false, error: "The licence format is invalid." };
      }
      if (payload.exp <= now) {
        return { valid: false, error: "This licence has expired." };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false, error: "The licence signature could not be verified." };
    }
  }
}

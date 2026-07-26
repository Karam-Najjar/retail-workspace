export interface LicenceState {
  readonly id: 'active';
  readonly compact_jws: string;
  readonly verified_payload: unknown;
  readonly verified_at: Date;
}

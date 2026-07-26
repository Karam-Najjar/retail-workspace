import { inject, Injectable } from '@angular/core';
import { StoreProfileService } from '../../configuration/store-profile.service';
import { DexieSettingsRepository } from '../../data-access/repositories/dexie-settings.repository';
import { SupplyCurrencySnapshot } from '../../domain/models/supply-currency-snapshot.model';
import { CURRENCY_ROUNDING_POLICY, roundCurrencyMinorUnits } from '../../domain/policies/currency-rounding.policy';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly settings = inject(DexieSettingsRepository);
  private readonly storeProfile = inject(StoreProfileService);

  async currentExchangeRate(): Promise<string> {
    const settings = await this.settings.get();
    const rate = settings?.currency_rate ?? '';
    if (!this.validRate(rate)) throw new Error('A valid exchange rate is required.');
    return rate;
  }

  async createSupplySnapshot(primaryTotalCost: number): Promise<SupplyCurrencySnapshot> {
    if (!Number.isSafeInteger(primaryTotalCost) || primaryTotalCost < 0) throw new Error('Supply total must be a valid currency amount.');
    const exchangeRate = await this.currentExchangeRate();
    const profile = this.storeProfile.profile;
    const primaryScale = 10 ** profile.currency.primary.precision;
    const secondaryScale = 10 ** profile.currency.secondary.precision;
    const secondaryTotalCost = roundCurrencyMinorUnits((primaryTotalCost / primaryScale) * Number(exchangeRate) * secondaryScale);
    return {
      primary_code: profile.currency.primary.code,
      primary_precision: profile.currency.primary.precision,
      secondary_code: profile.currency.secondary.code,
      secondary_precision: profile.currency.secondary.precision,
      exchange_rate: exchangeRate,
      rate_direction: 'secondary_per_primary',
      rounding_policy: CURRENCY_ROUNDING_POLICY,
      secondary_total_cost: secondaryTotalCost,
    };
  }

  private validRate(value: string): boolean {
    const rate = Number(value);
    return Number.isFinite(rate) && rate > 0;
  }
}

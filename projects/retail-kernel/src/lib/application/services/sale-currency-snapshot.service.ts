import { inject, Injectable } from '@angular/core';
import { StoreProfileService } from '../../configuration/store-profile.service';
import { SaleCurrencySnapshot } from '../../domain/models/sale-currency-snapshot.model';
import { CURRENCY_ROUNDING_POLICY, roundCurrencyMinorUnits } from '../../domain/policies/currency-rounding.policy';
import { SaleCurrencySnapshotFactory } from '../../domain/repository-contracts/sale.repository';
import { CurrencyService } from './currency.service';

@Injectable({ providedIn: 'root' })
export class SaleCurrencySnapshotService {
  private readonly currency = inject(CurrencyService);
  private readonly storeProfile = inject(StoreProfileService);

  async createFactory(): Promise<SaleCurrencySnapshotFactory> {
    const exchangeRate = await this.currency.currentExchangeRate();
    const profile = this.storeProfile.profile;
    const primaryCode = profile.currency.primary.code;
    const primaryPrecision = profile.currency.primary.precision;
    const secondaryCode = profile.currency.secondary.code;
    const secondaryPrecision = profile.currency.secondary.precision;
    const numericRate = Number(exchangeRate);

    return (totalAmount, totalCost) => {
      this.assertPrimaryAmount(totalAmount);
      this.assertPrimaryAmount(totalCost);
      const primaryScale = 10 ** primaryPrecision;
      const secondaryScale = 10 ** secondaryPrecision;
      const convert = (amount: number): number => roundCurrencyMinorUnits(
        (amount / primaryScale) * numericRate * secondaryScale,
      );
      const secondaryTotalAmount = convert(totalAmount);
      const secondaryTotalCost = convert(totalCost);
      const secondaryTotalProfit = secondaryTotalAmount - secondaryTotalCost;

      return {
        primary_code: primaryCode,
        primary_precision: primaryPrecision,
        secondary_code: secondaryCode,
        secondary_precision: secondaryPrecision,
        exchange_rate: exchangeRate,
        rate_direction: 'secondary_per_primary',
        rounding_policy: CURRENCY_ROUNDING_POLICY,
        secondary_total_amount: secondaryTotalAmount,
        secondary_total_cost: secondaryTotalCost,
        secondary_total_profit: secondaryTotalProfit,
      } satisfies SaleCurrencySnapshot;
    };
  }

  async create(totalAmount: number, totalCost: number): Promise<SaleCurrencySnapshot> {
    const factory = await this.createFactory();
    return factory(totalAmount, totalCost);
  }

  private assertPrimaryAmount(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('Sale total must be a valid currency amount.');
    }
  }
}

import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { Direction, Directionality } from '@angular/cdk/bidi';

export type AppLanguage = 'en' | 'ar';

@Injectable({ providedIn: 'root' })
export class DirectionalityService {
  private readonly document = inject(DOCUMENT);
  private readonly cdkDirectionality = inject(Directionality);

  readonly direction = signal<Direction>('ltr');

  setLanguage(language: AppLanguage): void {
    const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

    this.direction.set(direction);
    this.document.documentElement.lang = language;
    this.document.documentElement.dir = direction;
    this.cdkDirectionality.valueSignal.set(direction);
    this.cdkDirectionality.change.emit(direction);
  }
}

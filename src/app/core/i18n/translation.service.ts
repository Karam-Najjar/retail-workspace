import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppLanguage, DirectionalityService } from './directionality.service';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly translate = inject(TranslateService);
  private readonly directionality = inject(DirectionalityService);

  readonly activeLanguage = signal<AppLanguage>('en');

  constructor() {
    this.translate.addLangs(['en', 'ar']);
    this.setLanguage('en');
  }

  setLanguage(language: AppLanguage): void {
    this.activeLanguage.set(language);
    this.directionality.setLanguage(language);
    this.translate.use(language).subscribe();
  }

  toggleLanguage(): void {
    this.setLanguage(this.activeLanguage() === 'en' ? 'ar' : 'en');
  }
}

import { ApplicationConfig, ErrorHandler, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { provideTranslateService } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";
import { ActiveOperatorService, DatabaseInitializerService, STORE_PROFILE } from "@retail/kernel";
import { TOBACCO_PROFILE } from "@retail/profiles";

import { routes } from "./app.routes";
import { provideServiceWorker } from "@angular/service-worker";
import { GlobalErrorHandler } from "./core/errors/global-error.handler";
import { TranslationService } from "./core/i18n/translation.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes),
    provideTranslateService({
      lang: "en",
      fallbackLang: "en",
      loader: provideTranslateHttpLoader({
        prefix: "assets/i18n/",
        suffix: ".json",
      }),
    }),
    { provide: STORE_PROFILE, useValue: TOBACCO_PROFILE },
    provideAppInitializer(() => {
      const databaseInitializer = inject(DatabaseInitializerService);
      const activeOperator = inject(ActiveOperatorService);
      const translation = inject(TranslationService);

      return databaseInitializer.initialize().then(() => activeOperator.initialize()).then(() => translation.setLanguage(activeOperator.language()));
    }),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};

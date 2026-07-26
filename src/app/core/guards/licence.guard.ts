import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { LicenceValidationService } from '@retail/kernel';

export const licenceGuard: CanMatchFn = async () => {
  const licenceValidation = inject(LicenceValidationService);
  const router = inject(Router);

  return (await licenceValidation.hasValidLicence())
    ? true
    : router.createUrlTree(['/setup/licence']);
};

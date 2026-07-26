import { inject, Injectable } from '@angular/core';
import { STORE_PROFILE } from './store-profile.token';

@Injectable({ providedIn: 'root' })
export class StoreProfileService {
  readonly profile = inject(STORE_PROFILE);
}

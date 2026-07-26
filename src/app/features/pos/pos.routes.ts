import { Routes } from '@angular/router';
import { pendingCartGuard } from './pending-cart.guard';

export const posRoutes: Routes = [
  { path: 'pos', canDeactivate: [pendingCartGuard], loadComponent: () => import('./pos-page/pos-page.component').then((module) => module.PosPageComponent) },
];

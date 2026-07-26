import { Routes } from '@angular/router';

export const salesRoutes: Routes = [
  {
    path: 'sales',
    loadComponent: () => import('./sale-list/sale-list.component').then((module) => module.SaleListComponent),
  },
  {
    path: 'sales/:saleId',
    loadComponent: () => import('./sale-detail/sale-detail.component').then((module) => module.SaleDetailComponent),
  },
];

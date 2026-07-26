import { Routes } from '@angular/router';

export const productsRoutes: Routes = [
  { path: 'products', loadComponent: () => import('./product-list/product-list.component').then((module) => module.ProductListComponent) },
  { path: 'products/:productId', loadComponent: () => import('./product-detail/product-detail.component').then((module) => module.ProductDetailComponent) },
  { path: 'products/new', outlet: 'modal', loadComponent: () => import('./product-form/product-form.component').then((module) => module.ProductFormComponent) },
  { path: 'products/:productId/edit', outlet: 'modal', loadComponent: () => import('./product-form/product-form.component').then((module) => module.ProductFormComponent) },
  { path: 'inventory/adjust/:productId', outlet: 'modal', loadComponent: () => import('../inventory/stock-adjustment/stock-adjustment.component').then((module) => module.StockAdjustmentComponent) },
];

import { Routes } from '@angular/router';

export const categoriesRoutes: Routes = [
  {
    path: 'categories',
    loadComponent: () =>
      import('./category-list/category-list.component').then((module) => module.CategoryListComponent),
  },
  {
    path: 'categories/:categoryId',
    loadComponent: () =>
      import('./category-detail/category-detail.component').then((module) => module.CategoryDetailComponent),
  },
];

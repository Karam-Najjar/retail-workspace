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
  {
    path: 'categories/new',
    outlet: 'modal',
    loadComponent: () =>
      import('./category-form/category-form.component').then((module) => module.CategoryFormComponent),
  },
  {
    path: 'categories/:categoryId/edit',
    outlet: 'modal',
    loadComponent: () =>
      import('./category-form/category-form.component').then((module) => module.CategoryFormComponent),
  },
];

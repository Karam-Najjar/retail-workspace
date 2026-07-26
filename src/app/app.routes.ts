import { Routes } from '@angular/router';
import { AppShellComponent } from './shell/app-shell/app-shell.component';
import { licenceGuard } from './core/guards/licence.guard';
import { categoriesRoutes } from './features/categories/categories.routes';
import { suppliersRoutes } from './features/suppliers/suppliers.routes';

export const routes: Routes = [
  {
    path: 'setup/licence',
    loadComponent: () =>
      import('./features/licence/licence-setup/licence-setup.component').then(
        (module) => module.LicenceSetupComponent,
      ),
  },
  {
    path: '',
    component: AppShellComponent,
    canMatch: [licenceGuard],
    children: [
      ...categoriesRoutes,
      ...suppliersRoutes,
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-placeholder/dashboard-placeholder.component').then(
            (module) => module.DashboardPlaceholderComponent,
          ),
      },
      {
        path: 'not-found',
        loadComponent: () =>
          import('./features/not-found/not-found.component').then((module) => module.NotFoundComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'not-found' },
];

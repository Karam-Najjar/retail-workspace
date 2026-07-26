import { Routes } from '@angular/router';
import { AppShellComponent } from './shell/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
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

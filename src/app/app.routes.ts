import { Routes } from "@angular/router";
import { AppShellComponent } from "./shell/app-shell/app-shell.component";
import { licenceGuard } from "./core/guards/licence.guard";
import { categoriesRoutes } from "./features/categories/categories.routes";
import { suppliersRoutes } from "./features/suppliers/suppliers.routes";
import { productsRoutes } from "./features/products/products.routes";
import { suppliesRoutes } from "./features/supplies/supplies.routes";
import { posRoutes } from "./features/pos/pos.routes";
import { salesRoutes } from "./features/sales/sales.routes";
import { activityLogRoutes } from "./features/activity-log/activity-log.routes";
import { settingsRoutes } from "./features/settings/settings.routes";

export const routes: Routes = [
  {
    path: "setup/licence",
    loadComponent: () => import("./features/licence/licence-setup/licence-setup.component").then(module => module.LicenceSetupComponent),
  },
  {
    path: "",
    component: AppShellComponent,
    canMatch: [licenceGuard],
    children: [
      ...categoriesRoutes,
      ...suppliersRoutes,
      ...productsRoutes,
      ...suppliesRoutes,
      ...posRoutes,
      ...salesRoutes,
      ...activityLogRoutes,
      ...settingsRoutes,
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
      {
        path: "dashboard",
        loadComponent: () => import("./features/dashboard/dashboard-page/dashboard-page.component").then(module => module.DashboardPageComponent),
      },
      {
        path: "valuation",
        loadComponent: () => import("./features/valuation/valuation-page/valuation-page.component").then(module => module.ValuationPageComponent),
      },
      {
        path: "not-found",
        loadComponent: () => import("./features/not-found/not-found.component").then(module => module.NotFoundComponent),
      },
    ],
  },
  { path: "**", redirectTo: "not-found" },
];

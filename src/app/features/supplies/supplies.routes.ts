import { Routes } from "@angular/router";

export const suppliesRoutes: Routes = [
  { path: "supplies", loadComponent: () => import("./supply-list/supply-list.component").then(module => module.SupplyListComponent) },
  { path: "supplies/:supplyId", loadComponent: () => import("./supply-detail/supply-detail.component").then(module => module.SupplyDetailComponent) },
  {
    path: "supplies/new",
    outlet: "modal",
    loadComponent: () => import("./add-stock-form/add-stock-form.component").then(module => module.AddStockFormComponent),
  },
];

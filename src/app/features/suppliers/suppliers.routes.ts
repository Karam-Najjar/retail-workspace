import { Routes } from "@angular/router";

export const suppliersRoutes: Routes = [
  { path: "suppliers", loadComponent: () => import("./supplier-list/supplier-list.component").then(module => module.SupplierListComponent) },
  {
    path: "suppliers/:supplierId",
    loadComponent: () => import("./supplier-detail/supplier-detail.component").then(module => module.SupplierDetailComponent),
  },
];

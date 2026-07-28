import { Routes } from "@angular/router";
export const settingsRoutes: Routes = [
  { path: "settings", loadComponent: () => import("./settings-page/settings-page.component").then(module => module.SettingsPageComponent) },
];

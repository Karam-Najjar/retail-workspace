import { Component, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface NavigationItem {
  readonly labelKey: string;
  readonly icon: string;
  readonly route?: string;
}

@Component({
  selector: 'app-side-nav',
  imports: [MatIconModule, MatListModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
})
export class SideNavComponent {
  readonly navigate = output<void>();

  protected readonly navigationItems: readonly NavigationItem[] = [
    { labelKey: 'navigation.dashboard', icon: 'dashboard', route: '/dashboard' },
    { labelKey: 'navigation.pos', icon: 'point_of_sale' },
    { labelKey: 'navigation.products', icon: 'inventory_2', route: '/products' },
    { labelKey: 'navigation.categories', icon: 'category', route: '/categories' },
    { labelKey: 'navigation.sales', icon: 'receipt_long' },
    { labelKey: 'navigation.supplies', icon: 'local_shipping', route: '/supplies' },
    { labelKey: 'navigation.suppliers', icon: 'storefront', route: '/suppliers' },
    { labelKey: 'navigation.activityLog', icon: 'history' },
    { labelKey: 'navigation.settings', icon: 'settings' },
  ];
}

import { Component, computed, effect, inject, viewChild } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { PosCartStore, PwaUpdateService } from "@retail/kernel";
import { TranslatePipe } from "@ngx-translate/core";
import { MatSidenav, MatSidenavModule } from "@angular/material/sidenav";
import { RouterOutlet } from "@angular/router";
import { ModalOutletComponent } from "../modal-outlet/modal-outlet.component";
import { SideNavComponent } from "../side-nav/side-nav.component";
import { TopBarComponent } from "../top-bar/top-bar.component";

@Component({
  selector: "app-shell",
  imports: [MatButtonModule, MatSidenavModule, ModalOutletComponent, RouterOutlet, SideNavComponent, TopBarComponent, TranslatePipe],
  templateUrl: "./app-shell.component.html",
  styleUrl: "./app-shell.component.scss",
})
export class AppShellComponent {
  private readonly sidenav = viewChild.required(MatSidenav);
  protected readonly updates = inject(PwaUpdateService);
  private readonly cart = inject(PosCartStore);
  protected readonly cartHasItems = computed(() => this.cart.items().length > 0);
  constructor() {
    effect(() => {
      if (this.updates.ready() && !this.cartHasItems()) void this.updates.apply();
    });
  }

  toggleNavigation(): void {
    void this.sidenav().toggle();
  }

  closeNavigation(): void {
    void this.sidenav().close();
  }
}

import { Component, viewChild } from '@angular/core';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { ModalOutletComponent } from '../modal-outlet/modal-outlet.component';
import { SideNavComponent } from '../side-nav/side-nav.component';
import { TopBarComponent } from '../top-bar/top-bar.component';

@Component({
  selector: 'app-shell',
  imports: [MatSidenavModule, ModalOutletComponent, RouterOutlet, SideNavComponent, TopBarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly sidenav = viewChild.required(MatSidenav);

  toggleNavigation(): void {
    void this.sidenav().toggle();
  }

  closeNavigation(): void {
    void this.sidenav().close();
  }
}

import { Component, inject, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatToolbarModule } from "@angular/material/toolbar";
import { TranslatePipe } from "@ngx-translate/core";
import { TranslationService } from "../../core/i18n/translation.service";
import { ActiveOperatorService } from "@retail/kernel";

@Component({
  selector: "app-top-bar",
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatToolbarModule, TranslatePipe],
  templateUrl: "./top-bar.component.html",
  styleUrl: "./top-bar.component.scss",
})
export class TopBarComponent {
  protected readonly translation = inject(TranslationService);
  protected readonly activeOperator = inject(ActiveOperatorService);
  readonly navigationToggle = output<void>();

  protected async selectOperator(operatorId: string): Promise<void> {
    await this.activeOperator.setActiveOperator(operatorId);
  }
}

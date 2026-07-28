import { Component, input, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
  selector: "app-detail-page-header",
  imports: [MatButtonModule, TranslatePipe],
  templateUrl: "./detail-page-header.component.html",
  styleUrl: "./detail-page-header.component.scss",
})
export class DetailPageHeaderComponent {
  readonly title = input.required<string>();
  readonly back = output<void>();
}

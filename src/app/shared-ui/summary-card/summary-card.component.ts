import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';

@Component({ selector: 'app-summary-card', imports: [MatCardModule, TranslatePipe], templateUrl: './summary-card.component.html', styleUrl: './summary-card.component.scss' })
export class SummaryCardComponent {
  readonly labelKey = input.required<string>();
  readonly value = input.required<string | number>();
}

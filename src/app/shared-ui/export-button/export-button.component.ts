import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({ selector: 'app-export-button', imports: [MatButtonModule, TranslatePipe], templateUrl: './export-button.component.html', styleUrl: './export-button.component.scss' })
export class ExportButtonComponent {
  readonly busy = input(false);
  readonly export = output<void>();
}

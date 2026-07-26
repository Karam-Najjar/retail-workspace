import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({ selector: 'app-line-item-editor', imports: [MatButtonModule, TranslatePipe], templateUrl: './line-item-editor.component.html', styleUrl: './line-item-editor.component.scss' })
export class LineItemEditorComponent {
  readonly canAdd = input(true);
  readonly add = output<void>();
}

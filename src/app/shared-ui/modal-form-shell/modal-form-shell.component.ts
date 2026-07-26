import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-modal-form-shell',
  imports: [MatButtonModule, MatCardModule, TranslatePipe],
  templateUrl: './modal-form-shell.component.html',
  styleUrl: './modal-form-shell.component.scss',
})
export class ModalFormShellComponent {
  readonly titleKey = input.required<string>();
  readonly cancel = output<void>();
  readonly submit = output<void>();
}

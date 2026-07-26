import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-modal-form-shell',
  imports: [MatButtonModule, MatCardModule, TranslatePipe],
  templateUrl: './modal-form-shell.component.html',
  styleUrl: './modal-form-shell.component.scss',
})
export class ModalFormShellComponent {
  private readonly dialogRef = inject(MatDialogRef<ModalFormShellComponent>, { optional: true });
  readonly titleKey = input.required<string>();
  readonly cancel = output<void>();
  readonly submit = output<void>();

  close(): void {
    this.dialogRef?.close();
    this.cancel.emit();
  }
}

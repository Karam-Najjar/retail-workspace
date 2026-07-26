import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [MatButtonModule, MatCardModule, TranslatePipe],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
})
export class ConfirmationDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>, { optional: true });
  readonly titleKey = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  cancel(): void { this.dialogRef?.close(false); this.cancelled.emit(); }
  confirm(): void { this.dialogRef?.close(true); this.confirmed.emit(); }
}

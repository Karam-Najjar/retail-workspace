import { Component, inject, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
  selector: "app-settings-confirmation-dialog",
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  templateUrl: "./settings-confirmation-dialog.component.html",
  styleUrl: "./settings-confirmation-dialog.component.scss",
})
export class SettingsConfirmationDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SettingsConfirmationDialogComponent>);
  readonly titleKey = input.required<string>();
  readonly message = input.required<string>();
  readonly details = input<readonly string[]>([]);
  readonly requiredText = input<string | null>(null);
  readonly confirmationLabel = input("");
  protected confirmationValue = "";

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    if (this.canConfirm()) this.dialogRef.close(true);
  }

  protected canConfirm(): boolean {
    const requiredText = this.requiredText();
    return requiredText === null || this.confirmationValue === requiredText;
  }
}

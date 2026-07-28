import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { TranslatePipe } from "@ngx-translate/core";

interface UnknownBarcodeDialogData {
  readonly barcode: string;
}

@Component({
  selector: "app-unknown-barcode-dialog",
  imports: [MatButtonModule, MatDialogModule, TranslatePipe],
  templateUrl: "./unknown-barcode-dialog.component.html",
  styleUrl: "./unknown-barcode-dialog.component.scss",
})
export class UnknownBarcodeDialogComponent {
  protected readonly data = inject(MAT_DIALOG_DATA) as UnknownBarcodeDialogData;
  private readonly dialogRef = inject(MatDialogRef<UnknownBarcodeDialogComponent>);
  protected close(): void {
    this.dialogRef.close(false);
  }
  protected createProduct(): void {
    this.dialogRef.close(true);
  }
}

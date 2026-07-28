import { Component, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";
import { TranslatePipe } from "@ngx-translate/core";
import { Supplier } from "@retail/kernel";

@Component({
  selector: "app-supplier-picker",
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule, TranslatePipe],
  templateUrl: "./supplier-picker.component.html",
  styleUrl: "./supplier-picker.component.scss",
})
export class SupplierPickerComponent {
  readonly suppliers = input.required<readonly Supplier[]>();
  readonly selectedId = input.required<string>();
  readonly selectedIdChange = output<string>();
  readonly addRequested = output<void>();
}

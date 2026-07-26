import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

@Component({ selector: 'app-barcode-input', imports: [FormsModule, MatFormFieldModule, MatInputModule, TranslatePipe], templateUrl: './barcode-input.component.html', styleUrl: './barcode-input.component.scss' })
export class BarcodeInputComponent {
  readonly value = input(''); readonly valueChange = output<string>(); readonly labelKey = input('products.barcode');
}

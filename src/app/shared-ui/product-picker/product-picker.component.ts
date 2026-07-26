import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Product } from '@retail/kernel';

@Component({ selector: 'app-product-picker', imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, TranslatePipe], templateUrl: './product-picker.component.html', styleUrl: './product-picker.component.scss' })
export class ProductPickerComponent {
  readonly products = input.required<readonly Product[]>();
  readonly selectedId = input.required<string>();
  readonly selectedIdChange = output<string>();
  protected readonly search = signal('');
  protected readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.products().filter((product) => !query || product.name.toLocaleLowerCase().includes(query));
  });
}

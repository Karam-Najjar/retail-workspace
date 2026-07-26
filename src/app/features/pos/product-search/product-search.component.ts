import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { Product } from '@retail/kernel';

@Component({ selector: 'app-product-search', imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, TranslatePipe], templateUrl: './product-search.component.html', styleUrl: './product-search.component.scss' })
export class ProductSearchComponent {
  readonly products = input.required<readonly Product[]>();
  readonly productSelected = output<string>();
  protected readonly query = signal('');
  protected readonly matches = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.products().filter((product) => !query || product.name.toLocaleLowerCase().includes(query));
  });
  protected select(productId: string): void { this.productSelected.emit(productId); this.query.set(''); }
}

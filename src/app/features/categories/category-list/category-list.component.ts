import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DataTableComponent, DataTableColumn, DataTableRow } from '../../../shared-ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { CategoriesFacade } from '../categories.facade';

@Component({
  selector: 'app-category-list',
  imports: [DataTableComponent, EmptyStateComponent, MatButtonModule, TranslatePipe],
  providers: [CategoriesFacade],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
})
export class CategoryListComponent implements OnInit {
  protected readonly facade = inject(CategoriesFacade);
  private readonly router = inject(Router);
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: 'categories.name' },
    { labelKey: 'categories.type' },
  ];

  readonly rows = (): readonly DataTableRow[] =>
    this.facade.categories().map((category) => ({
      id: category.id,
      values: [category.system_code ? `categories.system.${category.system_code}` : category.name, category.system_code ? 'categories.systemLabel' : 'categories.customLabel'],
    }));

  ngOnInit(): void {
    void this.facade.load();
  }

  openCreate(): void {
    void this.router.navigate([{ outlets: { modal: ['categories', 'new'] } }]);
  }

  openDetail(id: string): void {
    void this.router.navigate(['/categories', id]);
  }
}

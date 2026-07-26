import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DataTableComponent, DataTableColumn, DataTableRow } from '../../../shared-ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { CategoriesFacade } from '../categories.facade';
import { CategoryFormComponent } from '../category-form/category-form.component';

@Component({
  selector: 'app-category-list',
  imports: [DataTableComponent, EmptyStateComponent, MatButtonModule, MatDialogModule, TranslatePipe],
  providers: [CategoriesFacade],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
})
export class CategoryListComponent implements OnInit {
  protected readonly facade = inject(CategoriesFacade);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
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
    this.dialog.open(CategoryFormComponent, { width: 'min(32rem, calc(100vw - 2rem))' })
      .afterClosed()
      .subscribe(() => void this.facade.load());
  }

  openDetail(id: string): void {
    void this.router.navigate(['/categories', id]);
  }
}

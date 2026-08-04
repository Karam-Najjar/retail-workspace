import { Component, inject, OnInit, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { ActiveOperatorService, Category } from "@retail/kernel";
import { ConfirmationDialogComponent } from "../../../shared-ui/confirmation-dialog/confirmation-dialog.component";
import { DataTableComponent, DataTableColumn, DataTableRow } from "../../../shared-ui/data-table/data-table.component";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { CategoriesFacade } from "../categories.facade";
import { CategoryFormComponent } from "../category-form/category-form.component";

@Component({
  selector: "app-category-list",
  imports: [DataTableComponent, EmptyStateComponent, MatButtonModule, MatDialogModule, TranslatePipe],
  providers: [CategoriesFacade],
  templateUrl: "./category-list.component.html",
  styleUrl: "./category-list.component.scss",
})
export class CategoryListComponent implements OnInit {
  protected readonly facade = inject(CategoriesFacade);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly operators = inject(ActiveOperatorService);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  protected readonly selectedCategory = signal<Category | null>(null);
  protected readonly affectedProducts = signal(0);
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: "categories.name", sortable: true, sortKey: "name" },
    { labelKey: "categories.type", sortable: true, sortKey: "type" },
    { labelKey: "common.createdBy", sortable: true, sortKey: "createdBy" },
    { labelKey: "common.createdAt", sortable: true, sortKey: "createdAt" },
    { labelKey: "common.lastModifiedBy", sortable: true, sortKey: "lastModifiedBy" },
  ];

  readonly rows = (): readonly DataTableRow[] =>
    this.facade.categories().map(category => ({
      id: category.id,
      canEdit: !category.system_code,
      canDelete: !category.system_code,
      sortValues: {
        name: category.name,
        type: category.system_code ? "system" : "custom",
        createdBy: this.operatorName(category.created_by_operator_id),
        createdAt: category.created_at.getTime(),
        lastModifiedBy: this.operatorName(category.last_modified_by_operator_id),
      },
      values: [
        category.system_code ? `categories.system.${category.system_code}` : category.name,
        category.system_code ? "categories.systemLabel" : "categories.customLabel",
        this.operatorName(category.created_by_operator_id),
        this.dateFormatter.format(category.created_at),
        this.operatorName(category.last_modified_by_operator_id),
      ],
    }));

  ngOnInit(): void {
    void this.facade.load();
  }

  openCreate(): void {
    this.dialog
      .open(CategoryFormComponent, { width: "min(32rem, calc(100vw - 2rem))" })
      .afterClosed()
      .subscribe(() => void this.facade.load());
  }

  openDetail(id: string): void {
    void this.router.navigate(["/categories", id]);
  }

  edit(id: string): void {
    this.dialog
      .open(CategoryFormComponent, { width: "min(32rem, calc(100vw - 2rem))", data: { categoryId: id } })
      .afterClosed()
      .subscribe(() => void this.facade.load());
  }

  async prepareDelete(id: string): Promise<void> {
    const category = this.facade.categories().find(item => item.id === id);
    if (!category || category.system_code) return;
    this.selectedCategory.set(category);
    const count = await this.facade.countAffectedProducts(id);
    this.affectedProducts.set(count);
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, { width: "min(30rem, calc(100vw - 2rem))" });
    dialogRef.componentRef?.setInput("titleKey", "categories.deleteTitle");
    dialogRef.componentRef?.setInput(
      "message",
      String(this.translate.instant("categories.deleteMessage", { count, name: this.translate.instant("categories.system.other") }))
    );
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed === true) void this.deleteSelected();
      else this.selectedCategory.set(null);
    });
  }

  async deleteSelected(): Promise<void> {
    const category = this.selectedCategory();
    if (!category) return;
    if ((await this.facade.delete(category)) !== null) this.selectedCategory.set(null);
  }

  private operatorName(id: string): string {
    return this.operators.operators().find(operator => operator.id === id)?.display_name ?? "—";
  }
}

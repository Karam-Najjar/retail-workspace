import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { ActiveOperatorService, Product } from "@retail/kernel";
import { ConfirmationDialogComponent } from "../../../shared-ui/confirmation-dialog/confirmation-dialog.component";
import { DataTableColumn, DataTableComponent, DataTableRow } from "../../../shared-ui/data-table/data-table.component";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { ProductsFacade } from "../products.facade";
import { ProductFormComponent } from "../product-form/product-form.component";

@Component({
  selector: "app-product-list",
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DataTableComponent,
    EmptyStateComponent,
    TranslatePipe,
  ],
  providers: [ProductsFacade],
  templateUrl: "./product-list.component.html",
  styleUrl: "./product-list.component.scss",
})
export class ProductListComponent implements OnInit {
  protected readonly facade = inject(ProductsFacade);
  private readonly operators = inject(ActiveOperatorService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  protected search = "";
  protected categoryId = "";
  protected readonly selected = signal<Product | null>(null);
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: "products.name" },
    { labelKey: "products.category" },
    { labelKey: "products.sellingPrice" },
    { labelKey: "products.quantity" },
    { labelKey: "common.createdBy" },
    { labelKey: "common.createdAt" },
    { labelKey: "common.lastModifiedBy" },
  ];
  readonly rows = (): readonly DataTableRow[] =>
    this.facade
      .products()
      .map(product => ({
        id: product.id,
        values: [
          product.name,
          this.categoryName(product.category_id),
          `$${(product.selling_price / 100).toFixed(2)}`,
          String(product.quantity),
          this.operatorName(product.created_by_operator_id),
          this.dateFormatter.format(product.created_at),
          this.operatorName(product.last_modified_by_operator_id),
        ],
      }));
  ngOnInit(): void {
    void this.load();
  }
  load(): void {
    void this.facade.load(this.search, this.categoryId || undefined);
  }
  openCreate(): void {
    this.dialog
      .open(ProductFormComponent, { width: "min(42rem, calc(100vw - 2rem))" })
      .afterClosed()
      .subscribe(() => this.load());
  }
  openDetail(id: string): void {
    void this.router.navigate(["/products", id]);
  }
  edit(id: string): void {
    this.dialog
      .open(ProductFormComponent, { width: "min(42rem, calc(100vw - 2rem))", data: { productId: id } })
      .afterClosed()
      .subscribe(() => this.load());
  }
  prepareDelete(id: string): void {
    const product = this.facade.products().find(item => item.id === id);
    if (!product) return;
    this.selected.set(product);
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, { width: "min(30rem, calc(100vw - 2rem))" });
    dialogRef.componentRef?.setInput("titleKey", "products.deleteTitle");
    dialogRef.componentRef?.setInput("message", "products.deleteMessage");
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed === true) void this.deleteSelected();
      else this.selected.set(null);
    });
  }
  private async deleteSelected(): Promise<void> {
    const product = this.selected();
    if (product && (await this.facade.delete(product))) {
      this.selected.set(null);
      this.load();
    }
  }
  private categoryName(id: string): string {
    return this.facade.categories().find(category => category.id === id)?.name ?? "—";
  }
  private operatorName(id: string): string {
    return this.operators.operators().find(operator => operator.id === id)?.display_name ?? "—";
  }
}

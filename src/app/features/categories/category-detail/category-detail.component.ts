import { DatePipe } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { TranslatePipe } from "@ngx-translate/core";
import { ActiveOperatorService, Category } from "@retail/kernel";
import { ConfirmationDialogComponent } from "../../../shared-ui/confirmation-dialog/confirmation-dialog.component";
import { DetailPageHeaderComponent } from "../../../shared-ui/detail-page-header/detail-page-header.component";
import { CategoriesFacade } from "../categories.facade";
import { CategoryFormComponent } from "../category-form/category-form.component";

@Component({
  selector: "app-category-detail",
  imports: [DatePipe, ConfirmationDialogComponent, DetailPageHeaderComponent, MatButtonModule, MatCardModule, MatDialogModule, TranslatePipe],
  providers: [CategoriesFacade],
  templateUrl: "./category-detail.component.html",
  styleUrl: "./category-detail.component.scss",
})
export class CategoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(CategoriesFacade);
  private readonly dialog = inject(MatDialog);
  private readonly operators = inject(ActiveOperatorService);
  protected readonly category = signal<Category | null>(null);
  protected readonly confirmDelete = signal(false);
  protected readonly affectedProducts = signal(0);
  protected error: string | null = null;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("categoryId");
    if (id) this.category.set((await this.facade.get(id)) ?? null);
  }

  goBack(): void {
    void this.router.navigate(["/categories"]);
  }

  edit(): void {
    const id = this.category()?.id;
    if (id) {
      this.dialog
        .open(CategoryFormComponent, {
          width: "min(32rem, calc(100vw - 2rem))",
          data: { categoryId: id },
        })
        .afterClosed()
        .subscribe(() => void this.reload());
    }
  }

  async prepareDelete(): Promise<void> {
    const category = this.category();
    if (!category) return;
    this.affectedProducts.set(await this.facade.countAffectedProducts(category.id));
    this.confirmDelete.set(true);
  }

  async delete(): Promise<void> {
    const category = this.category();
    if (!category) return;
    const deleted = await this.facade.delete(category);
    if (deleted !== null) this.goBack();
    else this.error = this.facade.error();
  }

  protected operatorName(id: string): string {
    return this.operators.operators().find(operator => operator.id === id)?.display_name ?? "—";
  }

  private async reload(): Promise<void> {
    const id = this.category()?.id;
    if (id) this.category.set((await this.facade.get(id)) ?? null);
  }
}

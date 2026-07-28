import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { TranslatePipe } from "@ngx-translate/core";
import { ModalFormShellComponent } from "../../../shared-ui/modal-form-shell/modal-form-shell.component";
import { CategoriesFacade } from "../categories.facade";

@Component({
  selector: "app-category-form",
  imports: [FormsModule, MatFormFieldModule, MatInputModule, ModalFormShellComponent, TranslatePipe],
  providers: [CategoriesFacade],
  templateUrl: "./category-form.component.html",
  styleUrl: "./category-form.component.scss",
})
export class CategoryFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(CategoriesFacade);
  private readonly dialogRef = inject(MatDialogRef<CategoryFormComponent>, { optional: true });
  private readonly dialogData = inject(MAT_DIALOG_DATA, { optional: true }) as { categoryId?: string } | null;
  protected categoryId: string | undefined;
  protected name = "";
  protected error: string | null = null;

  async ngOnInit(): Promise<void> {
    this.categoryId = this.dialogData?.categoryId ?? this.route.snapshot.paramMap.get("categoryId") ?? undefined;
    if (this.categoryId) {
      const category = await this.facade.get(this.categoryId);
      if (category) this.name = category.name;
    }
  }

  close(): void {
    if (this.dialogRef) this.dialogRef.close();
    else void this.router.navigate(["/categories"]);
  }

  async save(): Promise<void> {
    this.error = null;
    const category = await this.facade.save({ id: this.categoryId, name: this.name });
    if (category) {
      if (this.dialogRef) this.dialogRef.close(category);
      else this.close();
    } else this.error = this.facade.error();
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { ModalFormShellComponent } from '../../../shared-ui/modal-form-shell/modal-form-shell.component';
import { CategoriesFacade } from '../categories.facade';

@Component({
  selector: 'app-category-form',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, ModalFormShellComponent, TranslatePipe],
  providers: [CategoriesFacade],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
})
export class CategoryFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(CategoriesFacade);
  protected categoryId: string | undefined;
  protected name = '';
  protected error: string | null = null;

  async ngOnInit(): Promise<void> {
    this.categoryId = this.route.snapshot.paramMap.get('categoryId') ?? undefined;
    if (this.categoryId) {
      const category = await this.facade.get(this.categoryId);
      if (category) this.name = category.name;
    }
  }

  close(): void {
    void this.router.navigate(['/categories']);
  }

  async save(): Promise<void> {
    this.error = null;
    const category = await this.facade.save({ id: this.categoryId, name: this.name });
    if (category) this.close();
    else this.error = this.facade.error();
  }
}

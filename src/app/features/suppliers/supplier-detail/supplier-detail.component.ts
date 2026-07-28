import { DatePipe } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { TranslatePipe } from "@ngx-translate/core";
import { ActiveOperatorService, Supplier, Supply } from "@retail/kernel";
import { ConfirmationDialogComponent } from "../../../shared-ui/confirmation-dialog/confirmation-dialog.component";
import { DetailPageHeaderComponent } from "../../../shared-ui/detail-page-header/detail-page-header.component";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { SuppliersFacade } from "../suppliers.facade";
import { SupplierFormComponent } from "../supplier-form/supplier-form.component";
import { SuppliesFacade } from "../../supplies/supplies.facade";

@Component({
  selector: "app-supplier-detail",
  imports: [
    DatePipe,
    ConfirmationDialogComponent,
    DetailPageHeaderComponent,
    EmptyStateComponent,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    TranslatePipe,
  ],
  providers: [SuppliersFacade, SuppliesFacade],
  templateUrl: "./supplier-detail.component.html",
  styleUrl: "./supplier-detail.component.scss",
})
export class SupplierDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly facade = inject(SuppliersFacade);
  private readonly operators = inject(ActiveOperatorService);
  private readonly suppliesFacade = inject(SuppliesFacade);
  protected readonly supplier = signal<Supplier | null>(null);
  protected readonly confirmDelete = signal(false);
  protected readonly affectedSupplies = signal(0);
  protected readonly recentSupplies = signal<readonly Supply[]>([]);
  protected error: string | null = null;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("supplierId");
    if (id) {
      const [supplier, supplies] = await Promise.all([this.facade.get(id), this.suppliesFacade.recentForSupplier(id, 10)]);
      this.supplier.set(supplier ?? null);
      this.recentSupplies.set(supplies);
    }
  }

  goBack(): void {
    void this.router.navigate(["/suppliers"]);
  }

  edit(): void {
    const id = this.supplier()?.id;
    if (id) {
      this.dialog
        .open(SupplierFormComponent, { width: "min(42rem, calc(100vw - 2rem))", data: { supplierId: id } })
        .afterClosed()
        .subscribe(() => void this.reload());
    }
  }

  async prepareDelete(): Promise<void> {
    const supplier = this.supplier();
    if (!supplier) return;
    this.affectedSupplies.set(await this.facade.countAffectedSupplies(supplier.id));
    this.confirmDelete.set(true);
  }

  async delete(): Promise<void> {
    const supplier = this.supplier();
    if (!supplier) return;
    const deleted = await this.facade.delete(supplier);
    if (deleted !== null) this.goBack();
    else this.error = this.facade.error();
  }

  protected operatorName(id: string): string {
    return this.operators.operators().find(operator => operator.id === id)?.display_name ?? "—";
  }
  protected openSupply(id: string): void {
    void this.router.navigate(["/supplies", id]);
  }

  private async reload(): Promise<void> {
    const id = this.supplier()?.id;
    if (id) this.supplier.set((await this.facade.get(id)) ?? null);
  }
}

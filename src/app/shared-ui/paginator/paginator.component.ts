import { Directionality } from "@angular/cdk/bidi";
import { Component, inject, input, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
  selector: "app-paginator",
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: "./paginator.component.html",
  styleUrl: "./paginator.component.scss",
})
export class PaginatorComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();
  private readonly directionality = inject(Directionality);

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageChange.emit(page);
    }
  }

  protected isRtl(): boolean {
    return this.directionality.value === "rtl";
  }
}

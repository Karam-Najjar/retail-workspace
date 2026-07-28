import { DatePipe } from "@angular/common";
import { Component, input } from "@angular/core";
import { TranslatePipe } from "@ngx-translate/core";
import { InventoryBatch } from "@retail/kernel";
import { MoneyDisplayComponent } from "../../../shared-ui/money-display/money-display.component";

@Component({
  selector: "app-inventory-batch-status",
  imports: [DatePipe, MoneyDisplayComponent, TranslatePipe],
  templateUrl: "./inventory-batch-status.component.html",
  styleUrl: "./inventory-batch-status.component.scss",
})
export class InventoryBatchStatusComponent {
  readonly batches = input.required<readonly InventoryBatch[]>();
}

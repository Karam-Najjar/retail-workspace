import { Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';

export interface DataTableColumn {
  readonly labelKey: string;
}

export interface DataTableRow {
  readonly id: string;
  readonly values: readonly string[];
}

@Component({
  selector: 'app-data-table',
  imports: [MatTableModule, TranslatePipe],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  readonly columns = input.required<readonly DataTableColumn[]>();
  readonly rows = input.required<readonly DataTableRow[]>();
  readonly rowClick = output<string>();
}

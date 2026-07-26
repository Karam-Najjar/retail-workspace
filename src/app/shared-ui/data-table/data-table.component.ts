import { Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface DataTableColumn {
  readonly labelKey: string;
}

export interface DataTableRow {
  readonly id: string;
  readonly values: readonly string[];
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
}

@Component({
  selector: 'app-data-table',
  imports: [MatButtonModule, MatIconModule, MatTableModule, TranslatePipe],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  readonly columns = input.required<readonly DataTableColumn[]>();
  readonly rows = input.required<readonly DataTableRow[]>();
  readonly rowClick = output<string>();
  readonly showActions = input(false);
  readonly editCallback = output<string>();
  readonly deleteCallback = output<string>();
}

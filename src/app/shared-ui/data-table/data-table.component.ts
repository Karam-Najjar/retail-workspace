import { afterNextRender, Component, effect, input, output, viewChild } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { TranslatePipe } from "@ngx-translate/core";

export interface DataTableColumn {
  readonly labelKey: string;
  readonly sortable?: boolean;
  readonly sortKey?: string;
}

export interface DataTableRow {
  readonly id: string;
  readonly values: readonly string[];
  readonly sortValues?: Record<string, string | number>;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
}

@Component({
  selector: "app-data-table",
  imports: [MatButtonModule, MatIconModule, MatSortModule, MatTableModule, TranslatePipe],
  templateUrl: "./data-table.component.html",
  styleUrl: "./data-table.component.scss",
})
export class DataTableComponent {
  readonly columns = input.required<readonly DataTableColumn[]>();
  readonly rows = input.required<readonly DataTableRow[]>();
  readonly dataSource = new MatTableDataSource<DataTableRow>();
  readonly rowClick = output<string>();
  readonly showActions = input(false);
  readonly editCallback = output<string>();
  readonly deleteCallback = output<string>();

  private readonly sort = viewChild.required(MatSort);
  private previousRows: readonly DataTableRow[] | undefined;

  constructor() {
    this.dataSource.sortingDataAccessor = (row, sortKey): string | number =>
      row.sortValues?.[sortKey] ?? "";

    effect(() => {
      const rows = this.rows();

      if (this.rowsAreEqual(rows, this.previousRows)) {
        return;
      }

      this.previousRows = rows;
      this.dataSource.data = [...rows];
    });

    afterNextRender(() => {
      this.dataSource.sort = this.sort();
    });
  }

  isSortable(column: DataTableColumn): boolean {
    return column.sortable !== false && typeof column.sortKey === "string" && column.sortKey.length > 0;
  }

  getSortKey(column: DataTableColumn): string {
    return column.sortKey ?? column.labelKey;
  }

  private rowsAreEqual(
    currentRows: readonly DataTableRow[],
    previousRows: readonly DataTableRow[] | undefined,
  ): boolean {
    if (currentRows === previousRows) {
      return true;
    }

    if (!previousRows || currentRows.length !== previousRows.length) {
      return false;
    }

    return currentRows.every((currentRow, index) => {
      const previousRow = previousRows[index];

      return (
        currentRow.id === previousRow.id &&
        currentRow.canEdit === previousRow.canEdit &&
        currentRow.canDelete === previousRow.canDelete &&
        this.valuesAreEqual(currentRow.values, previousRow.values) &&
        this.sortValuesAreEqual(currentRow.sortValues, previousRow.sortValues)
      );
    });
  }

  private valuesAreEqual(currentValues: readonly string[], previousValues: readonly string[]): boolean {
    return (
      currentValues === previousValues ||
      (currentValues.length === previousValues.length &&
        currentValues.every((currentValue, index) => currentValue === previousValues[index]))
    );
  }

  private sortValuesAreEqual(
    currentValues: Record<string, string | number> | undefined,
    previousValues: Record<string, string | number> | undefined,
  ): boolean {
    if (currentValues === previousValues) {
      return true;
    }

    if (!currentValues || !previousValues) {
      return false;
    }

    const currentKeys = Object.keys(currentValues);
    const previousKeys = Object.keys(previousValues);

    return (
      currentKeys.length === previousKeys.length &&
      currentKeys.every(key => currentValues[key] === previousValues[key])
    );
  }
}

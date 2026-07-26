import { Component, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { DateRange, DateRangePreset } from '@retail/kernel';

@Component({ selector: 'app-date-range-filter', imports: [FormsModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, TranslatePipe], templateUrl: './date-range-filter.component.html', styleUrl: './date-range-filter.component.scss' })
export class DateRangeFilterComponent implements OnInit {
  readonly rangeChange = output<DateRange>();
  protected preset: DateRangePreset = 'today';
  protected customFrom = '';
  protected customTo = '';

  ngOnInit(): void { this.emitRange(); }

  protected emitRange(): void {
    const now = new Date();
    let from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1);
    if (this.preset === 'week') {
      const day = (now.getDay() + 6) % 7;
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      to = now;
    } else if (this.preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = now;
    } else if (this.preset === 'custom') {
      if (this.customFrom) from = new Date(`${this.customFrom}T00:00:00`);
      if (this.customTo) to = new Date(`${this.customTo}T23:59:59.999`);
    }
    this.rangeChange.emit({ from, to, preset: this.preset });
  }
}

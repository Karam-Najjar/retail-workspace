import { Directionality } from "@angular/cdk/bidi";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";

export interface LinearChartBar {
  readonly label: string;
  readonly value: number;
  readonly maxValue: number;
  readonly color: string;
}

interface RenderedLinearChartBar extends LinearChartBar {
  readonly fillStart: number;
  readonly fillWidth: number;
  readonly accessibleLabel: string;
}

@Component({
  selector: "app-linear-chart",
  templateUrl: "./linear-chart.component.html",
  styleUrl: "./linear-chart.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinearChartComponent {
  private readonly directionality = inject(Directionality);

  readonly bars = input.required<readonly LinearChartBar[]>();

  protected readonly renderedBars = computed<readonly RenderedLinearChartBar[]>(() => {
    const isRtl = this.directionality.valueSignal() === "rtl";

    return this.bars().map(bar => {
      const value = this.sanitizeValue(bar.value);
      const maxValue = this.sanitizeValue(bar.maxValue);
      const fillWidth = maxValue > 0 ? this.clampPercentage((value / maxValue) * 100) : 0;
      return {
        ...bar,
        value,
        maxValue,
        fillStart: isRtl ? 100 - fillWidth : 0,
        fillWidth,
        accessibleLabel: `${bar.label}: ${value} / ${maxValue}`,
      };
    });
  });

  private sanitizeValue(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  private clampPercentage(value: number): number {
    return Math.min(Math.max(value, 0), 100);
  }
}

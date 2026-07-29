import { Component, computed, input } from "@angular/core";

export interface BarChartBar {
  readonly label: string;
  readonly value: number;
  readonly maxValue: number;
  readonly color: string;
  readonly hatched?: boolean;
}

interface RenderedBarChartBar {
  readonly index: number;
  readonly label: string;
  readonly value: number;
  readonly color: string;
  readonly hatched: boolean;
  readonly x: number;
  readonly centerX: number;
  readonly width: number;
  readonly radius: number;
  readonly valueY: number;
  readonly valueHeight: number;
  readonly title: string;
}

const VIEWBOX_WIDTH = 700;
const PLOT_START_X = 14;
const PLOT_TOP = 12;
const PLOT_WIDTH = VIEWBOX_WIDTH - PLOT_START_X * 2;
const PLOT_HEIGHT = 232;
const MAX_BAR_WIDTH = 48;
const DEFAULT_BAR_COLOR = "var(--retail-primary)";

let nextBarChartInstanceId = 0;

@Component({
  selector: "app-bar-chart",
  templateUrl: "./bar-chart.component.html",
  styleUrl: "./bar-chart.component.scss",
})
export class BarChartComponent {
  readonly bars = input.required<readonly BarChartBar[]>();

  readonly hatchPatternId = `bar-chart-hatch-${nextBarChartInstanceId++}`;
  readonly hatchPatternFill = `url(#${this.hatchPatternId})`;
  readonly plotTop = PLOT_TOP;
  readonly plotHeight = PLOT_HEIGHT;
  readonly labelY = PLOT_TOP + PLOT_HEIGHT + 30;

  readonly renderedBars = computed<readonly RenderedBarChartBar[]>(() => {
    const bars = this.bars();

    if (bars.length === 0) {
      return [];
    }

    const slotWidth = PLOT_WIDTH / bars.length;
    const width = Math.min(MAX_BAR_WIDTH, slotWidth * 0.5);
    const radius = width / 2;

    return bars.map((bar, index) => {
      const value = this.normalizeNumber(bar.value);
      const maxValue = this.normalizeNumber(bar.maxValue);
      const ratio = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
      const valueHeight = ratio * PLOT_HEIGHT;
      const centerX = PLOT_START_X + slotWidth * (index + 0.5);
      const label = bar.label.trim();

      return {
        index,
        label,
        value,
        color: bar.color.trim() || DEFAULT_BAR_COLOR,
        hatched: bar.hatched === true,
        x: centerX - width / 2,
        centerX,
        width,
        radius,
        valueY: PLOT_TOP + PLOT_HEIGHT - valueHeight,
        valueHeight,
        title: `${label}: ${value}`,
      };
    });
  });

  readonly accessibleLabel = computed(() =>
    this.renderedBars()
      .map(bar => bar.title)
      .join(", ")
  );

  private normalizeNumber(value: number): number {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
}

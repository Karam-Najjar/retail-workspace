import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export interface CircularChartSegment {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

interface RenderedCircularChartSegment extends CircularChartSegment {
  readonly dashArray: string;
  readonly dashOffset: number;
}

@Component({
  selector: "app-circular-chart",
  templateUrl: "./circular-chart.component.html",
  styleUrl: "./circular-chart.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CircularChartComponent {
  readonly segments = input.required<readonly CircularChartSegment[]>();
  readonly centerText = input.required<string>();
  readonly centerLabel = input.required<string>();

  protected readonly renderedSegments = computed<readonly RenderedCircularChartSegment[]>(() => {
    const segments = this.segments().map(segment => ({ ...segment, value: this.sanitizeValue(segment.value) }));
    const maximum = segments.reduce((current, segment) => Math.max(current, segment.value), 0);
    const scaledTotal = maximum > 0 ? segments.reduce((total, segment) => total + segment.value / maximum, 0) : 0;
    let offset = 0;

    return segments.map(segment => {
      const percentage = scaledTotal > 0 ? this.clampPercentage((segment.value / maximum / scaledTotal) * 100) : 0;
      const renderedSegment: RenderedCircularChartSegment = {
        ...segment,
        dashArray: `${percentage} ${100 - percentage}`,
        dashOffset: -Math.min(offset, 100),
      };
      offset += percentage;
      return renderedSegment;
    });
  });

  protected readonly hasData = computed(() => this.renderedSegments().some(segment => segment.value > 0));
  protected readonly accessibleLabel = computed(() => {
    const segmentSummary = this.renderedSegments()
      .map(segment => `${segment.label}: ${segment.value}`)
      .join(", ");
    const centerSummary = `${this.centerLabel()}: ${this.centerText()}`;
    return segmentSummary ? `${centerSummary}. ${segmentSummary}` : centerSummary;
  });

  private sanitizeValue(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  private clampPercentage(value: number): number {
    return Math.min(Math.max(value, 0), 100);
  }
}

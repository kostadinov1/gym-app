import { Dimensions } from 'react-native';

export type Period = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface ChartLayoutInput {
  dataCount: number;
  period: Period;
  screenPadding?: number; 
}

interface ChartLayoutOutput {
  barWidth: number;
  spacing: number;
  initialSpacing: number;
  endSpacing: number;
  chartWidth: number | undefined; // undefined = scroll, number = fixed
  showLabels: boolean;
  isScrollable: boolean;
  xAxisLabelWidth: number;
}

type PeriodConfig = {
  visibleBarsBeforeScroll: number;
  targetBarRatio: number;
  maxBarWidth: number;
  minSpacing: number;
  showTopLabelsUpTo: number;
};

const PERIOD_CONFIG: Record<Period, PeriodConfig> = {
  '1M': {
    visibleBarsBeforeScroll: 24,
    targetBarRatio: 0.62,
    maxBarWidth: 18,
    minSpacing: 2,
    showTopLabelsUpTo: 10,
  },
  '3M': {
    visibleBarsBeforeScroll: 16,
    targetBarRatio: 0.6,
    maxBarWidth: 24,
    minSpacing: 5,
    showTopLabelsUpTo: 12,
  },
  '6M': {
    visibleBarsBeforeScroll: 20,
    targetBarRatio: 0.6,
    maxBarWidth: 20,
    minSpacing: 3,
    showTopLabelsUpTo: 10,
  },
  '1Y': {
    visibleBarsBeforeScroll: 14,
    targetBarRatio: 0.58,
    maxBarWidth: 26,
    minSpacing: 6,
    showTopLabelsUpTo: 12,
  },
  ALL: {
    visibleBarsBeforeScroll: 28,
    targetBarRatio: 0.58,
    maxBarWidth: 16,
    minSpacing: 2,
    showTopLabelsUpTo: 0,
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const getSmartChartLayout = ({ 
  dataCount, 
  period,
  screenPadding = 48, // Standard padding (card padding + margins)
}: ChartLayoutInput): ChartLayoutOutput => {
  const screenWidth = Dimensions.get('window').width;
  const availableWidth = Math.max(screenWidth - screenPadding, 0); // space for bars + gaps
  const config = PERIOD_CONFIG[period];
  const minBarWidth = 5;
  const maxSpacing = 18;
  const initialSpacing = 12;
  const endSpacing = 12;
  const usableWidth = Math.max(availableWidth - initialSpacing - endSpacing, 0);

  // Start from defaults
  let barWidth = 10;
  let spacing = 6;
  let chartWidth: number | undefined = undefined;
  let showLabels = dataCount <= config.showTopLabelsUpTo;
  let isScrollable = false;
  let xAxisLabelWidth = 36;

  // Quick guard
  if (dataCount <= 0) {
    return { barWidth, spacing, initialSpacing, endSpacing, chartWidth, showLabels, isScrollable, xAxisLabelWidth };
  }

  const visibleBars = Math.min(dataCount, config.visibleBarsBeforeScroll);
  const slotWidth = usableWidth / Math.max(1, visibleBars);
  const calculatedBarWidth = slotWidth * config.targetBarRatio;
  barWidth = clamp(Math.round(calculatedBarWidth), minBarWidth, config.maxBarWidth);
  spacing = clamp(Math.round(slotWidth - barWidth), config.minSpacing, maxSpacing);

  // If this count does not comfortably fit at the computed density, use scroll mode.
  const totalContentWidth = dataCount * (barWidth + spacing) + initialSpacing + endSpacing;
  if (dataCount > config.visibleBarsBeforeScroll && totalContentWidth > availableWidth) {
    isScrollable = true;
    chartWidth = undefined;
  } else {
    isScrollable = false;
    chartWidth = availableWidth;
  }

  // Adapt x-axis label width to density and period so labels avoid overlap.
  if (isScrollable) {
    xAxisLabelWidth = period === 'ALL' ? 28 : 32;
  } else if (dataCount <= 12) {
    xAxisLabelWidth = 44;
  } else if (dataCount <= 20) {
    xAxisLabelWidth = 38;
  } else {
    xAxisLabelWidth = 32;
  }

  // In dense layouts, suppress top labels.
  if (period === 'ALL') {
    showLabels = false;
  } else if (isScrollable) {
    showLabels = dataCount <= Math.min(10, config.showTopLabelsUpTo);
  } else {
    showLabels = dataCount <= config.showTopLabelsUpTo;
  }

  return {
    barWidth,
    spacing,
    initialSpacing,
    endSpacing,
    chartWidth,
    xAxisLabelWidth,
    showLabels,
    isScrollable
  };
}

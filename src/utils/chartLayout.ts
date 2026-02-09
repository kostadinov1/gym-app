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
  chartWidth: number | undefined; // undefined = scroll, number = fixed
  showLabels: boolean;
  isScrollable: boolean;
}

export const getSmartChartLayout = ({ 
  dataCount, 
  period,
  screenPadding = 48, // Standard padding (card padding + margins)
}: ChartLayoutInput): ChartLayoutOutput => {
  
  const screenWidth = Dimensions.get('window').width;
  const availableWidth = screenWidth - screenPadding; // space for bars + gaps

  // Density controls
  const minBarWidth = 6;
  const maxBarWidth = 20;

  const minSpacing = 4;
  const maxSpacing = 14;

  // Start from a reasonable default
  let barWidth = 12;
  let spacing = 8;
  let chartWidth: number | undefined = undefined;
  let showLabels = false;
  let isScrollable = false;
  let initialSpacing = 10;

  // Quick guard
  if (dataCount <= 0) {
    return { barWidth, spacing, initialSpacing, chartWidth, showLabels, isScrollable };
  }

  // Helper: given total available width and count, compute fit values
  const fitInAvailableWidth = (count: number) => {
    // Reserve a bit of initial spacing at left
    const usable = Math.max(availableWidth - initialSpacing, 0);
    // Prefer a 65/35 split by default, then clamp
    const rawBar = Math.floor((usable * 0.65) / count);
    const rawGap = Math.floor((usable * 0.35) / count);

    // Clamp
    barWidth = Math.max(minBarWidth, Math.min(maxBarWidth, rawBar));
    spacing = Math.max(minSpacing, Math.min(maxSpacing, rawGap));

    // If the density is too tight, allow a bit more gap to improve readability
    if (barWidth + spacing > availableWidth / Math.max(1, count)) {
      // Slightly reduce both if they overflow
      const overflow = (barWidth + spacing) - (availableWidth / Math.max(1, count));
      barWidth = Math.max(minBarWidth, barWidth - Math.ceil(overflow * 0.6));
      spacing = Math.max(minSpacing, spacing - Math.ceil(overflow * 0.4));
    }

    // No chartWidth: we are fitting, not scrolling
    chartWidth = availableWidth;
    showLabels = period !== 'ALL' && count <= 26; // reasonable heuristic
    isScrollable = false;
    initialSpacing = 10;
  };

  // Per-period policy: aim for a clean fit, but allow scroll if impossible
  switch (period) {
    case '1M':
      // ~30 bars -> try to fit, but if density is too high, we allow limited scroll by still fitting
      fitInAvailableWidth(dataCount);
      // If after fit, bars look too crowded (barWidth at min), enable a tiny horizontal scroll hint
      if (barWidth <= minBarWidth && dataCount > 26) {
        // Enable scroll for readability
        isScrollable = true;
        chartWidth = undefined;
      }
      showLabels = true;
      break;

    case '3M':
      // ~12 bars -> fit
      fitInAvailableWidth(dataCount);
      showLabels = true;
      break;

    case '6M':
      // ~26 bars -> fit, but be stricter on density
      fitInAvailableWidth(dataCount);
      // If density is still tight, reduce label clutter
      showLabels = barWidth > 12;
      break;

    case '1Y':
      // ~12 bars -> fit
      fitInAvailableWidth(dataCount);
      showLabels = true;
      break;

    case 'ALL':
      // Many bars; try to fit but allow some scrolling if necessary
      fitInAvailableWidth(dataCount);
      if (barWidth <= minBarWidth || dataCount > Math.floor(availableWidth / (minBarWidth + minSpacing))) {
        isScrollable = true;
        chartWidth = undefined;
      }
      showLabels = false;
      break;
  }

  // Final sanity clamp (in case calculations push out of bounds)
  barWidth = Math.max(minBarWidth, Math.min(maxBarWidth, barWidth));
  spacing = Math.max(minSpacing, Math.min(maxSpacing, spacing));

  return {
    barWidth,
    spacing,
    initialSpacing,
    chartWidth,
    showLabels,
    isScrollable
  };
}
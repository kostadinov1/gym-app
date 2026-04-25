import { lightTheme } from '../theme/tokens';

type Colors = typeof lightTheme.colors;

export function buildCalendarTheme(colors: Colors) {
  return {
    calendarBackground: colors.card,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: '#ffffff',
    todayTextColor: colors.primary,
    dayTextColor: colors.text,
    textDisabledColor: colors.border,
    dotColor: colors.primary,
    selectedDotColor: '#ffffff',
    arrowColor: colors.primary,
    monthTextColor: colors.text,
    indicatorColor: colors.primary,
    textDayFontSize: 13,
    textMonthFontSize: 13,
    textDayHeaderFontSize: 11,
    'stylesheet.calendar.main': {
      week: { marginTop: 2, marginBottom: 2, flexDirection: 'row', justifyContent: 'space-around' },
    },
  };
}

export const CALENDAR_STYLE = {
  borderRadius: 12,
  marginHorizontal: 16,
  overflow: 'hidden',
} as const;

// Colors assigned to plans on the period calendar. Avoids brand red to
// prevent confusion with primary UI elements.
export const PLAN_COLORS = ['#3b82f6', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16'];

// Deterministic color from plan ID — consistent across all screens.
export function planColor(planId: string): string {
  let hash = 0;
  for (let i = 0; i < planId.length; i++) hash = hash * 31 + planId.charCodeAt(i);
  return PLAN_COLORS[Math.abs(hash) % PLAN_COLORS.length];
}

// Parse a YYYY-MM-DD string in local timezone (avoids UTC midnight shift).
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Build react-native-calendars period marking for a list of plans.
export function buildPeriodMarks(
  plans: Array<{ id: string; start_date: string; end_date: string }>,
  colorFn: (plan: { id: string }) => string,
): Record<string, any> {
  const marks: Record<string, any> = {};
  plans.forEach(plan => {
    const color = colorFn(plan);
    const start = parseLocalDate(plan.start_date);
    const end = parseLocalDate(plan.end_date);
    const cur = new Date(start);
    while (cur <= end) {
      const key = dateKey(cur);
      marks[key] = {
        startingDay: cur.getTime() === start.getTime(),
        endingDay: cur.getTime() === end.getTime(),
        color,
        textColor: '#fff',
      };
      cur.setDate(cur.getDate() + 1);
    }
  });
  return marks;
}

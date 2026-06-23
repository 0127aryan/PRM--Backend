/** Monday-based week helpers (date strings YYYY-MM-DD, UTC calendar dates). */

export function assertMondayWeekStart(weekStart: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new Error('weekStart must be YYYY-MM-DD');
  }
  const day = new Date(`${weekStart}T00:00:00Z`).getUTCDay();
  if (day !== 1) {
    throw new Error('weekStart must be a Monday');
  }
}

export function weekEndFromStart(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

/** Previous Monday on or before the given date (YYYY-MM-DD). */
export function mondayOnOrBefore(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** List Monday weekStart values for the last `count` weeks (excluding current week if incomplete). */
/** Monday of the most recent week whose Sunday is before `todayStr`. */
export function lastCompletedWeekMonday(todayStr: string): string {
  let monday = mondayOnOrBefore(todayStr);
  while (weekEndFromStart(monday) >= todayStr) {
    const d = new Date(`${monday}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    monday = d.toISOString().slice(0, 10);
  }
  return monday;
}

export function recentMondayWeekStarts(
  count: number,
  throughDate = new Date(),
): string[] {
  const today = throughDate.toISOString().slice(0, 10);
  let monday = mondayOnOrBefore(today);
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    results.push(monday);
    const d = new Date(`${monday}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    monday = d.toISOString().slice(0, 10);
  }
  return results;
}

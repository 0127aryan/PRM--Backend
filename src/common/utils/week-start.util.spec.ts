import {
  assertMondayWeekStart,
  lastCompletedWeekMonday,
  mondayOnOrBefore,
  weekEndFromStart,
} from './week-start.util';

describe('week-start.util', () => {
  it('assertMondayWeekStart accepts Monday', () => {
    expect(() => assertMondayWeekStart('2026-03-02')).not.toThrow();
  });

  it('assertMondayWeekStart rejects Tuesday', () => {
    expect(() => assertMondayWeekStart('2026-03-03')).toThrow(/Monday/);
  });

  it('weekEndFromStart returns Sunday', () => {
    expect(weekEndFromStart('2026-03-02')).toBe('2026-03-08');
  });

  it('mondayOnOrBefore finds Monday of current week', () => {
    expect(mondayOnOrBefore('2026-03-05')).toBe('2026-03-02');
  });

  it('lastCompletedWeekMonday returns prior week when mid-week', () => {
    expect(lastCompletedWeekMonday('2026-03-05')).toBe('2026-02-23');
  });
});

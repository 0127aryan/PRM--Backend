import { maxDateOnly, toDateOnly } from './allocation-date.util';

describe('allocation-date.util', () => {
  it('strips time from date strings', () => {
    expect(toDateOnly('2026-06-10T18:30:00.000Z')).toBe('2026-06-10');
  });

  it('uses local calendar day for Date values', () => {
    const date = new Date(2026, 5, 11, 15, 0, 0);
    expect(toDateOnly(date)).toBe('2026-06-11');
  });

  it('maxDateOnly picks the later day', () => {
    expect(maxDateOnly('2026-06-10', '2026-06-11')).toBe('2026-06-11');
  });
});

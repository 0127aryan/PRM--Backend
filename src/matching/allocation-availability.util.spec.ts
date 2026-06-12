import { availableUtilizationOnDate, activeUtilizationOnDate } from './allocation-availability.util';

describe('allocation-availability.util', () => {
  it('returns 100% available when there are no active allocations', () => {
    expect(availableUtilizationOnDate([])).toBe(100);
    expect(activeUtilizationOnDate([])).toBe(0);
  });

  it('sums overlapping active allocations for the given date', () => {
    const allocations = [
      {
        utilizationPct: 60,
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
        isActive: true,
      },
      {
        utilizationPct: 40,
        fromDate: '2026-06-01',
        toDate: '2026-12-31',
        isActive: true,
      },
    ];

    expect(activeUtilizationOnDate(allocations, '2026-06-12')).toBe(100);
    expect(availableUtilizationOnDate(allocations, '2026-06-12')).toBe(0);
  });

  it('ignores inactive or out-of-range allocations', () => {
    const allocations = [
      {
        utilizationPct: 100,
        fromDate: '2025-01-01',
        toDate: '2025-12-31',
        isActive: true,
      },
      {
        utilizationPct: 50,
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
        isActive: false,
      },
    ];

    expect(availableUtilizationOnDate(allocations, '2026-06-12')).toBe(100);
  });
});

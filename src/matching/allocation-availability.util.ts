import { toDateOnly } from '../manager/allocations/allocation-date.util';

export interface AllocationWindow {
  utilizationPct: number;
  fromDate: string;
  toDate: string;
  isActive: boolean;
}

export function activeUtilizationOnDate(
  allocations: AllocationWindow[],
  asOf: string = toDateOnly(new Date()),
): number {
  const day = toDateOnly(asOf);
  return allocations
    .filter(
      (allocation) =>
        allocation.isActive &&
        toDateOnly(allocation.fromDate) <= day &&
        toDateOnly(allocation.toDate) >= day,
    )
    .reduce((sum, allocation) => sum + allocation.utilizationPct, 0);
}

export function availableUtilizationOnDate(
  allocations: AllocationWindow[],
  asOf: string = toDateOnly(new Date()),
): number {
  return Math.max(0, 100 - activeUtilizationOnDate(allocations, asOf));
}

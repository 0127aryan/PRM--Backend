/** Compare allocation ranges using YYYY-MM-DD (ignores time/timezone from DB). */
export function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

/** Latest of two YYYY-MM-DD strings. */
export function maxDateOnly(left: string, right: string): string {
  return left >= right ? left : right;
}

export function allocationRangesOverlap(
  fromDate: string,
  toDate: string,
  existingFrom: string,
  existingTo: string,
): boolean {
  const from = toDateOnly(fromDate);
  const to = toDateOnly(toDate);
  const existingFromDay = toDateOnly(existingFrom);
  const existingToDay = toDateOnly(existingTo);
  return existingFromDay <= to && from <= existingToDay;
}

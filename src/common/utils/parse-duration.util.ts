/** Parses JWT-style duration strings (e.g. 15m, 7d, 1h) to milliseconds. */
export function parseDurationToMs(duration: string): number {
  const trimmed = duration.trim();
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit]!;
}

export function addDurationToDate(base: Date, duration: string): Date {
  return new Date(base.getTime() + parseDurationToMs(duration));
}

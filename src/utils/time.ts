export function isWithinLastDays(date: Date, days: number): boolean {
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() < ms;
}

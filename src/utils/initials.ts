export function getInitials(username: string): string {
  const parts = username
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function getGreeting(now: Date = new Date()): string {
  const ukHour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(now),
  );
  if (ukHour < 12) return 'Good morning';
  if (ukHour < 18) return 'Good afternoon';
  return 'Good evening';
}

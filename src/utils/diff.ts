/**
 * Builds a "field: old → new" summary for fields that changed between two
 * flat records. Used to populate security_log.details on update events.
 */
export function summariseChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): string | null {
  const changes: string[] = [];
  for (const field of fields) {
    const oldValue = before[field];
    const newValue = after[field];
    if (oldValue !== newValue) {
      changes.push(`${field}: ${formatValue(oldValue)} → ${formatValue(newValue)}`);
    }
  }
  return changes.length > 0 ? changes.join('; ') : null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(none)';
  return String(value);
}

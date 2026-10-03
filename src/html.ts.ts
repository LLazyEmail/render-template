/** Normalize a part's return value into a string, or throw a TypeError. */
export function normalizeHtml(partId: string, value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'string') {
    throw new TypeError(`part "${partId}" returned ${typeof value}, expected a string`);
  }
  return value;
}
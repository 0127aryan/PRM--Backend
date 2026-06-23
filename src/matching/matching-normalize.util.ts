/**
 * Normalize skill names and search keywords for fuzzy substring matching.
 * Strips punctuation and spaces so e.g. "Node.js" matches "nodejs".
 */
export function normalizeMatchToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#]/g, '');
}

export function tokensMatch(left: string, right: string): boolean {
  const a = normalizeMatchToken(left);
  const b = normalizeMatchToken(right);
  if (!a || !b) {
    return false;
  }
  return a.includes(b) || b.includes(a);
}

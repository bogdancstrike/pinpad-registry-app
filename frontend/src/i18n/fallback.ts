// Looks up a key in the active locale and falls back to English when it is
// missing there. Returns the raw key only if English lacks it too.
export function translateWithFallback(
  key: string,
  active: Record<string, string>,
  english: Record<string, string>,
): string {
  return active[key] ?? english[key] ?? key
}

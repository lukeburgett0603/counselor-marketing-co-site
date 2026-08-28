// Splits a business's display name so the last word (often a suffix like
// "Co.", "LLC", "Group", "Studio") can be styled in the accent color while
// the rest stays in ink — a common, tasteful wordmark pattern that works
// for most business names without per-client logic. If the name is a
// single word, everything goes in `main` and `accent` is empty.
export function splitWordmark(displayName: string): { main: string; accent: string } {
  const words = displayName.trim().split(/\s+/);
  if (words.length <= 1) return { main: displayName, accent: '' };
  return { main: words.slice(0, -1).join(' ') + ' ', accent: words[words.length - 1] };
}

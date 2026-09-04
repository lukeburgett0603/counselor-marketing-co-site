// A simple words-per-minute estimate for a blog post card's "X min
// read" — the standard ~200 wpm average reading speed most publishing
// platforms use. Computed from the raw markdown word count, not
// rendered HTML — close enough for a card-level estimate, and avoids
// rendering markdown just to count words.
const WORDS_PER_MINUTE = 200;

export function estimateReadingTime(markdown: string | null): number {
  if (!markdown) return 1;
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

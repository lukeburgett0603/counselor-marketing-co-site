import { marked, Renderer } from 'marked';
import type { Tokens } from 'marked';

// `pages.copy` is plain markdown (webpage-copywriter's copy.md content,
// synced as-is) rather than Wix's Ricos JSON — this is the one deliberate
// simplification versus the Wix version, since there's no proprietary rich
// content format to walk a node-tree for.

// Matches GitHub's heading-slug convention closely enough for this site's
// purposes: lowercase, non-alphanumerics collapsed to a single hyphen, no
// leading/trailing hyphen. Both renderCopy() and extractTableOfContents()
// use this on the same `text` field, so an H2's rendered `id` and the TOC
// link that points at it always agree.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// H3s get a stable `id` so a table of contents (ContentPillar.astro /
// TableOfContents.astro) can link straight to them with `#<id>` — plain
// `marked.parse()` doesn't do this on its own. H3, not H2: this site's
// long-form copy convention (established across Service Pages and hub
// pages alike) uses a single `##` as the opening hook, then `###` for
// every actual section — H3 is the real TOC-worthy level here, and the
// opening hook deliberately has no TOC entry of its own.
const renderer = new Renderer();
renderer.heading = function ({ tokens, depth, text }: Tokens.Heading) {
  const html = this.parser.parseInline(tokens);
  if (depth === 3) {
    return `<h3 id="${slugify(text)}">${html}</h3>\n`;
  }
  return `<h${depth}>${html}</h${depth}>\n`;
};

export function renderCopy(markdown: string | null): string {
  if (!markdown) return '';
  return marked.parse(markdown, { async: false, renderer }) as string;
}

// Pulled from the same tokens renderCopy() renders from, via the lexer
// directly, rather than re-parsing the rendered HTML — keeps the two in
// sync by construction instead of by convention.
export function extractTableOfContents(markdown: string | null): { text: string; id: string }[] {
  if (!markdown) return [];
  const tokens = marked.lexer(markdown);
  return tokens
    .filter((t): t is Tokens.Heading => t.type === 'heading' && t.depth === 3)
    .map((t) => ({ text: t.text, id: slugify(t.text) }));
}

import { marked, Renderer } from 'marked';
import type { Tokens } from 'marked';
import { withBase } from './url';

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

// GitHub Pages serves the site under a base path (e.g. /repo-name/), so a
// plain relative link written into `copy` as [text](/seo) needs the same
// withBase() treatment every other internal link in this codebase gets —
// otherwise it 404s the moment a client isn't on a custom domain. Only
// touches a genuinely internal path (starts with exactly one `/`, not
// `//` which is protocol-relative to another host) — external URLs,
// mailto:, tel:, and same-page #anchors pass through untouched.
renderer.link = function ({ href, title, tokens }: Tokens.Link) {
  const html = this.parser.parseInline(tokens);
  const resolvedHref = /^\/(?!\/)/.test(href) ? withBase(href) : href;
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${resolvedHref}"${titleAttr}>${html}</a>`;
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

const SHORT_LIST_MAX_ITEMS_LENGTH = 220;
const SHORT_LIST_MIN_ITEMS = 3;
const SHORT_LIST_MAX_ITEMS = 4;

export interface ExtractedBenefit {
  title: string;
  description: string;
}

export interface SplitStoryBrandCopy {
  beforeHtml: string;
  benefits: ExtractedBenefit[];
  afterHtml: string;
}

// A StoryBrand copy field (storybrand_success/storybrand_pitch) sometimes
// embeds a short 3-4 item benefit list inline as consecutive "### Title" +
// one-sentence-paragraph pairs (e.g. Homepage's "Find Peace / Gain Clarity
// / Move Toward Hope" beat) — structurally identical to pages.concerns,
// just written inline instead of living in its own column. Rendered as
// flowing prose, three one-line H3s in a row reads as redundant rather
// than three real section openings (each one picks up the same arch-motif
// marker `.prose h3::before` applies to every genuine section heading
// elsewhere on the site — see global.css). This finds the single longest
// such run and pulls it out so the caller can give it FeatureGrid's card
// treatment instead, same "structured, not prose" discipline as
// plan_steps/faqs/concerns, just detected from existing markdown rather
// than requiring its own migration.
//
// Deliberately conservative: only a *short* paragraph immediately after an
// H3 counts, and only a run of exactly 3-4 counts as "a benefit list"
// rather than "the page's real section structure" — a long-form page's
// `copy` field (Service Hub/Service Page) uses H3 for every substantial
// section with real body text, often more than 4 of them, so this never
// fires there; the fallback (empty `benefits`) renders the field exactly
// as renderCopy() always has.
export function extractShortBenefitList(markdown: string | null): SplitStoryBrandCopy {
  if (!markdown) return { beforeHtml: '', benefits: [], afterHtml: '' };

  // marked.lexer() interleaves a 'space' token between every block-level
  // token (heading, paragraph, etc.) — real, verified via a direct lexer
  // dump, not assumed. Left in place, a heading at index i has its
  // paragraph at i+1 only when nothing sits between them in the source,
  // which is never true for real markdown (a blank line always separates
  // a heading from its following paragraph) — the adjacency check below
  // would never match anything. Stripping them first is what actually
  // makes heading/paragraph pairs adjacent by index; they carry no content
  // of their own, so dropping them before re-parsing back to HTML doesn't
  // change the rendered output.
  // `.filter()` returns a plain array, which drops the `.links` property
  // `marked.lexer()`'s result carries (link reference definitions) —
  // captured from the original before filtering, reattached below.
  const lexed = marked.lexer(markdown);
  const tokens = lexed.filter((t) => t.type !== 'space');
  let runStart = -1;
  let runLength = 0;
  let bestStart = -1;
  let bestLength = 0;

  for (let i = 0; i < tokens.length; i++) {
    const heading = tokens[i];
    const body = tokens[i + 1];
    const isPair =
      heading.type === 'heading' &&
      (heading as Tokens.Heading).depth === 3 &&
      body?.type === 'paragraph' &&
      (body as Tokens.Paragraph).text.length <= SHORT_LIST_MAX_ITEMS_LENGTH;
    if (isPair) {
      if (runStart === -1) runStart = i;
      runLength++;
      i++; // also consumes the paragraph just checked
    } else {
      if (runLength > bestLength) {
        bestStart = runStart;
        bestLength = runLength;
      }
      runStart = -1;
      runLength = 0;
    }
  }
  if (runLength > bestLength) {
    bestStart = runStart;
    bestLength = runLength;
  }

  if (bestLength < SHORT_LIST_MIN_ITEMS || bestLength > SHORT_LIST_MAX_ITEMS) {
    return { beforeHtml: renderCopy(markdown), benefits: [], afterHtml: '' };
  }

  const benefits: ExtractedBenefit[] = [];
  for (let i = bestStart; i < bestStart + bestLength * 2; i += 2) {
    benefits.push({
      title: (tokens[i] as Tokens.Heading).text,
      description: (tokens[i + 1] as Tokens.Paragraph).text,
    });
  }

  const beforeTokens = tokens.slice(0, bestStart) as ReturnType<typeof marked.lexer>;
  beforeTokens.links = lexed.links;
  const afterTokens = tokens.slice(bestStart + bestLength * 2) as ReturnType<typeof marked.lexer>;
  afterTokens.links = lexed.links;

  return {
    beforeHtml: beforeTokens.length ? (marked.parser(beforeTokens, { renderer }) as string) : '',
    benefits,
    afterHtml: afterTokens.length ? (marked.parser(afterTokens, { renderer }) as string) : '',
  };
}

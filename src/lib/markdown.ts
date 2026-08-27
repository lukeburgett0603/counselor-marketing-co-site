import { marked } from 'marked';

// `pages.copy` is plain markdown (webpage-copywriter's copy.md content,
// synced as-is) rather than Wix's Ricos JSON — this is the one deliberate
// simplification versus the Wix version, since there's no proprietary rich
// content format to walk a node-tree for.
export function renderCopy(markdown: string | null): string {
  if (!markdown) return '';
  return marked.parse(markdown, { async: false }) as string;
}

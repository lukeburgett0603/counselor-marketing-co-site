import TurndownService from 'turndown';
import { renderCopy } from './markdown';

// Wires up the toolbar + contenteditable box rendered by
// components/RichTextEditor.astro (same `id`, matching element ids). The
// underlying `pages.copy`-style column stays markdown regardless of which
// admin field uses this — every other reader of it (renderCopy() itself,
// the copywriter pipeline, every non-editor page type) assumes markdown —
// so this round-trips through it silently: an existing value is rendered
// to HTML to seed the editor (renderCopy), and the edited HTML is
// converted back to markdown on save (turndown).
const turndownService = new TurndownService({ headingStyle: 'atx' });
// Markdown has no native underline syntax; keep it as inline HTML, which
// marked.parse() (renderCopy, in markdown.ts) passes through untouched.
turndownService.addRule('underline', {
  filter: ['u'],
  replacement: (content) => `<u>${content}</u>`,
});

export interface RichTextEditorHandle {
  editor: HTMLElement;
  getMarkdown(): string;
  setMarkdown(markdown: string | null): void;
}

// execCommand is deprecated but still the only way to drive a plain
// contenteditable without pulling in a full editor framework — fine for
// this small, fixed feature set (style/bold/italic/underline/link) on a
// low-traffic internal admin tool. Clicking a toolbar button would
// otherwise blur the editor and collapse the selection before the click
// handler runs, so the last selection inside the editor is tracked and
// restored immediately before every execCommand call.
export function initRichTextEditor(id: string): RichTextEditorHandle {
  const editor = document.getElementById(id)!;
  const styleSelect = document.getElementById(`${id}-style`) as HTMLSelectElement;
  const boldButton = document.getElementById(`${id}-bold`)!;
  const italicButton = document.getElementById(`${id}-italic`)!;
  const underlineButton = document.getElementById(`${id}-underline`)!;
  const linkButton = document.getElementById(`${id}-link`)!;

  document.execCommand('defaultParagraphSeparator', false, 'p');
  let savedRange: Range | null = null;

  function saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  function applyCommand(command: string, value?: string) {
    editor.focus();
    if (savedRange) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
    }
    document.execCommand(command, false, value);
    saveSelection();
  }

  editor.addEventListener('keyup', saveSelection);
  editor.addEventListener('mouseup', saveSelection);
  editor.addEventListener('input', saveSelection);

  for (const button of [boldButton, italicButton, underlineButton, linkButton]) {
    button.addEventListener('mousedown', (event) => event.preventDefault());
  }
  boldButton.addEventListener('click', () => applyCommand('bold'));
  italicButton.addEventListener('click', () => applyCommand('italic'));
  underlineButton.addEventListener('click', () => applyCommand('underline'));
  linkButton.addEventListener('click', () => {
    const url = window.prompt('Link URL:');
    if (!url) return;
    applyCommand('createLink', url);
  });
  styleSelect.addEventListener('mousedown', saveSelection);
  styleSelect.addEventListener('change', () => {
    applyCommand('formatBlock', styleSelect.value);
    styleSelect.value = '<p>';
  });

  return {
    editor,
    getMarkdown: () => turndownService.turndown(editor.innerHTML),
    setMarkdown: (markdown) => {
      editor.innerHTML = renderCopy(markdown);
    },
  };
}

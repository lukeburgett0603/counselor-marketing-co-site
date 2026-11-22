// Shared "50 at a time" pager for admin lists (Luke, 2026-11-22: no list
// should grow forever). Builds a Previous / "1–50 of 120" / Next bar right
// after the list and hides it at 50 or fewer rows.
//
//   const pager = createListPager(tableWrap, 'Partner pages', render);
//   // inside render():
//   const pageRows = pager.slice(rows, [search, filter].join('|'));
//
// The second argument to slice() describes the current search and filters:
// when it changes, the list goes back to page 1. Re-rendering with the same
// filters (after an edit) keeps the page. Uses the .q-pager styles in
// admin.css; pass extraClass 'i-pager' inside an unpadded .i-list card.

export const LIST_PAGE_SIZE = 50;

export type ListPager = {
  slice<T>(rows: T[], filterKey?: string): T[];
};

export function createListPager(
  after: HTMLElement,
  label: string,
  onChange: () => void,
  opts: { extraClass?: string; scrollTo?: HTMLElement; pageSize?: number } = {}
): ListPager {
  const size = opts.pageSize ?? LIST_PAGE_SIZE;
  const nav = document.createElement('nav');
  nav.className = opts.extraClass ? `q-pager ${opts.extraClass}` : 'q-pager';
  nav.setAttribute('aria-label', label);
  nav.hidden = true;
  nav.innerHTML =
    '<button type="button" class="a-btn i-btn" data-page-step="-1">Previous</button>' +
    '<span class="a-num" aria-live="polite"></span>' +
    '<button type="button" class="a-btn i-btn" data-page-step="1">Next</button>';
  after.insertAdjacentElement('afterend', nav);
  const [prev, next] = Array.from(nav.querySelectorAll<HTMLButtonElement>('button'));
  const range = nav.querySelector('span')!;

  let page = 0;
  let key: string | null = null;

  nav.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-page-step]');
    if (!button || button.disabled) return;
    page += Number(button.dataset.pageStep);
    onChange();
    (opts.scrollTo ?? after).scrollIntoView({ block: 'start' });
  });

  return {
    slice<T>(rows: T[], filterKey = ''): T[] {
      if (filterKey !== key) {
        key = filterKey;
        page = 0;
      }
      const pages = Math.max(1, Math.ceil(rows.length / size));
      page = Math.min(Math.max(0, page), pages - 1);
      const start = page * size;
      const shown = rows.slice(start, start + size);
      nav.hidden = rows.length <= size;
      range.textContent = `${start + 1}–${start + shown.length} of ${rows.length}`;
      prev.disabled = page === 0;
      next.disabled = page >= pages - 1;
      return shown;
    },
  };
}

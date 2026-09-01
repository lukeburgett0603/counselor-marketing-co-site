import { supabase } from './supabase';

// Shared status-select rendering + update wiring for any admin page that
// lets someone change a lead's status inline. Extracted once the Lead CRM
// page needed the identical select-with-color-coding-and-optimistic-update
// behavior the Leads and analytics dashboard already had — see CLAUDE.md's
// discipline on pulling a pattern into a shared module the second time it's
// needed, rather than copy-pasting it again.

export const LEAD_STATUSES = ['new', 'contacted', 'closed'] as const;

export const STATUS_SELECT_CLASS: Record<string, string> = {
  new: 'border-slate-300 bg-white text-slate-700',
  contacted: 'border-amber-300 bg-amber-50 text-amber-800',
  closed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
};

export function renderStatusSelect(leadId: string, status: string | null): string {
  const current = status ?? 'new';
  const options = LEAD_STATUSES.map(
    (s) => `<option value="${s}" ${s === current ? 'selected' : ''}>${s[0].toUpperCase()}${s.slice(1)}</option>`
  ).join('');
  const colorClass = STATUS_SELECT_CLASS[current] ?? STATUS_SELECT_CLASS.new;
  return `<select data-lead-id="${leadId}" data-previous-status="${current}" class="status-select rounded-md border px-2 py-1 text-xs font-semibold ${colorClass}">${options}</select>`;
}

// Event delegation on whichever container holds one or more
// `.status-select` elements — call once per container after it's in the
// DOM. Safe to re-render the container's innerHTML afterward (a detail
// view swapping to a different lead, a list re-rendering its rows) since
// the listener lives on the stable container, not the individual
// <select> elements.
export function initStatusSelectHandler(
  container: HTMLElement,
  onChanged?: (leadId: string, newStatus: string) => void
) {
  container.addEventListener('change', async (event) => {
    const select = event.target as HTMLSelectElement;
    if (!select.classList.contains('status-select')) return;

    const leadId = select.dataset.leadId!;
    const newStatus = select.value;
    const previousStatus = select.dataset.previousStatus ?? 'new';

    select.disabled = true;
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    select.disabled = false;

    if (error) {
      select.value = previousStatus;
      window.alert('Could not update status: ' + error.message);
      return;
    }

    select.dataset.previousStatus = newStatus;
    for (const classes of Object.values(STATUS_SELECT_CLASS)) {
      select.classList.remove(...classes.split(' '));
    }
    select.classList.add(...(STATUS_SELECT_CLASS[newStatus] ?? STATUS_SELECT_CLASS.new).split(' '));
    onChanged?.(leadId, newStatus);
  });
}

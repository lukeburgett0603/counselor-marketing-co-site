import { supabase } from './supabase';

// Wires up the modal rendered by components/UnsplashSearchModal.astro
// (fixed ids — only one instance is ever open on a page at a time, so
// this doesn't need per-instance uniqueness the way RichTextEditor.astro
// does). Each consuming page renders its own "Search Unsplash" trigger
// button (id="search-unsplash-button") near whichever image field it's
// for, and passes an `onSelect` callback deciding what to do with the
// chosen photo — this module only handles the search/selection UI itself.

export interface UnsplashPhoto {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  alt: string;
  creditName: string;
  creditUrl: string;
  downloadLocation: string;
}

interface UnsplashSearchModalOptions {
  onSelect: (photo: UnsplashPhoto) => void;
}

async function callSearchFunction(body: Record<string, unknown>): Promise<any> {
  const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search-unsplash`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sessionData.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: result.error ?? 'Something went wrong.' };
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export function initUnsplashSearchModal({ onSelect }: UnsplashSearchModalOptions) {
  const triggerButton = document.getElementById('search-unsplash-button');
  const modal = document.getElementById('unsplash-modal')!;
  const closeButton = document.getElementById('unsplash-close-button')!;
  const queryInput = document.getElementById('unsplash-query') as HTMLInputElement;
  const searchButton = document.getElementById('unsplash-search-button')!;
  const status = document.getElementById('unsplash-status')!;
  const results = document.getElementById('unsplash-results')!;

  let lastResults: UnsplashPhoto[] = [];

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    queryInput.focus();
  }
  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  triggerButton?.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);

  async function runSearch() {
    const query = queryInput.value.trim();
    if (!query) return;
    status.textContent = 'Searching...';
    results.innerHTML = '';
    const result = await callSearchFunction({ action: 'search', query });
    if (!result.ok) {
      status.textContent =
        result.error === 'Live image search is not configured for this site'
          ? "Live search isn't set up for this site — upload an image instead."
          : 'Could not search: ' + result.error;
      return;
    }
    lastResults = result.results;
    status.textContent = `${lastResults.length} results`;
    results.innerHTML = lastResults
      .map(
        (photo, i) => `
      <button type="button" class="unsplash-result-button overflow-hidden rounded-md border border-slate-200 hover:ring-2 hover:ring-brand-primary" data-index="${i}">
        <img src="${photo.thumbUrl}" alt="" class="h-24 w-full object-cover" />
      </button>`
      )
      .join('');
  }

  searchButton.addEventListener('click', runSearch);
  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });

  results.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('.unsplash-result-button');
    if (!button) return;
    const photo = lastResults[Number(button.dataset.index)];
    if (!photo) return;

    onSelect(photo);
    closeModal();

    // Unsplash's API guidelines require this ping the moment a photo is
    // actually used, not just displayed in search results.
    if (photo.downloadLocation) {
      callSearchFunction({ action: 'trackDownload', downloadLocation: photo.downloadLocation });
    }
  });
}

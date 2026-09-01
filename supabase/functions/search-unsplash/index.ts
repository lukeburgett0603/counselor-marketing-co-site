// Secure proxy for Unsplash's Search API, used by the Lead Magnets admin
// screen's live image search. The Unsplash Access Key is a real secret —
// unlike PUBLIC_UNSPLASH_APP_NAME (just an attribution label already safe
// in the built site's JS), a live search needs a key that can actually
// call Unsplash's API on the caller's behalf, so it can never touch the
// browser. Same "hold the secret server-side, browser calls this instead"
// shape as publish-site, kept as its own function since this is an
// unrelated concern (an image-search utility, not site publishing/team
// management).
//
// Auth: same verify_jwt-isn't-enough pattern as publish-site — a real
// logged-in admin session is required, but no further role check beyond
// that (any authenticated admin can search, same reasoning as "publish"
// there: it's a read-only proxy, nothing gets written).
//
// Config (`supabase secrets set UNSPLASH_ACCESS_KEY=... --project-ref <ref>`):
// the SAME Unsplash Access Key already used for local/offline image
// sourcing during content authoring (see CLAUDE.md's "Handling the
// Unsplash API key") — set it as an Edge Function secret too if this
// client's site should have live search in the Lead Magnets screen. If
// unset, this function returns a clear "not configured" error and the
// admin UI falls back to direct upload only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!accessKey) {
    return jsonResponse({ error: 'Live image search is not configured for this site' }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  // "trackDownload": Unsplash's API guidelines require pinging a photo's
  // own download_location endpoint at the moment it's actually used (not
  // just displayed in search results) — this fires that, fire-and-forget
  // from the caller's point of view, when an admin picks a photo.
  if (body.action === 'trackDownload') {
    const downloadLocation = typeof body.downloadLocation === 'string' ? body.downloadLocation : '';
    if (!downloadLocation) {
      return jsonResponse({ error: 'downloadLocation is required' }, 400);
    }
    try {
      await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } });
    } catch {
      // Best-effort — not worth failing the admin's photo selection over.
    }
    return jsonResponse({ ok: true });
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) {
    return jsonResponse({ error: 'query is required' }, 400);
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );
    if (!response.ok) {
      const detail = await response.text();
      return jsonResponse({ error: 'Unsplash API rejected the search', detail }, 502);
    }
    const data = await response.json();
    const results = (data.results ?? []).map((photo: any) => ({
      id: photo.id,
      thumbUrl: photo.urls?.small,
      fullUrl: photo.urls?.regular,
      alt: photo.alt_description ?? photo.description ?? '',
      creditName: photo.user?.name ?? '',
      creditUrl: photo.user?.links?.html ?? '',
      downloadLocation: photo.links?.download_location ?? '',
    }));
    return jsonResponse({ results });
  } catch (err) {
    return jsonResponse({ error: 'Unexpected error searching Unsplash', detail: String(err) }, 500);
  }
});

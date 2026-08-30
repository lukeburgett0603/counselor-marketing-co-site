// Secure middleman for triggering a rebuild of the static site.
//
// Why this exists at all: the site is static (built once by GitHub
// Actions, not rendered live), so "publish" from the admin dashboard has
// to mean "save to Supabase, then trigger a rebuild" — and triggering a
// GitHub Actions workflow needs a GitHub token. That token can never touch
// the browser (anyone could read it out of the page and push to the
// repo), so this function holds it server-side instead, and the browser
// calls this function rather than GitHub directly.
//
// Auth: Supabase's Functions gateway (`verify_jwt`, the project default —
// never set this to false) rejects a request with no valid, correctly
// signed JWT at all. That's necessary but NOT sufficient — the public
// anon key (shipped in the built site's own JS, so anyone can read it) is
// itself a validly signed JWT, just with role "anon" instead of
// "authenticated". Relying on verify_jwt alone would let anyone holding
// the anon key trigger a rebuild. So this handler does its own explicit
// check via supabase.auth.getUser() — that only succeeds for a real,
// currently-logged-in user's session token, not any other validly-signed
// JWT. No further role check beyond "is a real logged-in admin" on
// purpose: any authenticated admin — owner today, staff once Phase 5
// ships — can trigger a rebuild, the same way they'd trigger one by
// editing content themselves. Only actions that need to know *which*
// admin is calling (inviting/removing other admins) need a role check,
// and those aren't built here yet — see the "invite"/"resend" note in the
// project's own planning notes for why they're deferred to when the
// admin_users table exists.
//
// Config (set via `supabase secrets set`, per-client — never hardcoded,
// since each client's Supabase project points at a different repo):
//   GITHUB_TOKEN         - a fine-grained PAT scoped to ONLY this client's
//                          repo, with Actions: Read and write permission.
//                          Nothing broader — this function only ever calls
//                          one endpoint on one repo.
//   GITHUB_REPO          - "owner/repo", e.g. "lukeburgett0603/counselor-marketing-co-site"
//   GITHUB_WORKFLOW_FILE - defaults to "deploy.yml" if unset
//
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically into
// every Edge Function's environment — not something to set as a secret.

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

  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const repo = Deno.env.get('GITHUB_REPO');
  const workflowFile = Deno.env.get('GITHUB_WORKFLOW_FILE') ?? 'deploy.yml';

  if (!githubToken || !repo) {
    return jsonResponse({ error: 'Server not configured: missing GITHUB_TOKEN or GITHUB_REPO' }, 500);
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return jsonResponse({ error: 'GitHub API rejected the dispatch request', detail }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: 'Unexpected error triggering rebuild', detail: String(err) }, 500);
  }
});

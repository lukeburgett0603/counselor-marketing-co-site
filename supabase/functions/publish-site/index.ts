// Secure middleman for anything the admin dashboard needs a secret
// credential to do: triggering a rebuild, and inviting/resending an
// invite for a team member. One function, routed by an `action` field in
// the JSON body (defaults to "publish" for the original zero-body call
// site) — kept as one function rather than splitting each action into
// its own, since they share the same "verify_jwt isn't enough, check the
// caller's own session" auth preamble below.
//
// Why "publish" exists at all: the site is static (built once by GitHub
// Actions, not rendered live), so "publish" from the admin dashboard has
// to mean "save to Supabase, then trigger a rebuild" — and triggering a
// GitHub Actions workflow needs a GitHub token. That token can never touch
// the browser (anyone could read it out of the page and push to the
// repo), so this function holds it server-side instead, and the browser
// calls this function rather than GitHub directly.
//
// Why "invite"/"resend" exist here too: creating or re-inviting a Supabase
// Auth user needs the service_role key, which is just as browser-unsafe as
// the GitHub token — same shape of problem, same fix.
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
// JWT. "publish" stops there on purpose: any authenticated admin —
// owner, staff, or agency — can trigger a rebuild, the same way they'd
// trigger one by editing content themselves. "invite"/"resend" go one
// step further and also check the caller is an *active owner or agency
// admin* in admin_users (via the service_role client, bypassing RLS) —
// those actions can create or re-invite other admin logins, so "is a
// real logged-in admin" isn't a tight enough check on its own. Granting
// the 'agency' role itself is checked even more narrowly, inline below
// — only an existing agency admin can create another one.
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
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically into every Edge Function's environment — not
// something to set as a secret.

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

async function publish(): Promise<Response> {
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // The caller's own identity, established via their own JWT — not the
  // service_role key. This is the check verify_jwt alone doesn't give
  // you (see the file header comment).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await callerClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // The original "publish" call site sends no body at all — treat
    // anything unparseable as "no action specified" rather than a
    // hard error.
    body = {};
  }
  const action = typeof body.action === 'string' ? body.action : 'publish';

  if (action === 'publish') {
    return publish();
  }

  if (action !== 'invite' && action !== 'resend') {
    return jsonResponse({ error: `Unknown action "${action}"` }, 400);
  }

  // invite/resend both need to create or re-invite an Auth user, which
  // needs the service_role key — and both need to know the caller is an
  // active owner, checked here (bypassing RLS) rather than trusted from
  // the client.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerRow } = await adminClient
    .from('admin_users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();
  if (!callerRow || (callerRow.role !== 'owner' && callerRow.role !== 'agency') || callerRow.status !== 'active') {
    return jsonResponse({ error: 'Only an active owner or agency admin can manage team access' }, 403);
  }

  if (action === 'invite') {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const role = body.role === 'staff' ? 'staff' : body.role === 'agency' ? 'agency' : 'owner';
    if (!email) {
      return jsonResponse({ error: 'Email is required' }, 400);
    }
    // Agency-level access is the agency's own super-admin identity — only
    // an existing agency admin can grant more of it, so a client's owner
    // login can't invite themselves (or anyone else) into that role.
    if (role === 'agency' && callerRow.role !== 'agency') {
      return jsonResponse({ error: 'Only an existing agency admin can grant agency-level access' }, 403);
    }

    // The caller computes this via withBase() from wherever it's actually
    // running, rather than this function guessing — see the comment on
    // 'resend' below for why that matters.
    const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined;
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      redirectTo ? { redirectTo } : undefined
    );
    if (inviteError || !inviteData.user) {
      return jsonResponse({ error: inviteError?.message ?? 'Could not send invite' }, 400);
    }

    // Only meaningful for role 'staff' (see 0028_counselor_card.sql) —
    // links this login to the one Counselor Profile page it may
    // self-service its own availability_status on. Not validated against
    // role here since an unused/ignored value on a non-staff row is
    // harmless; the caller's own UI only offers this field for staff.
    const linkedCounselorPageId = typeof body.linkedCounselorPageId === 'string' ? body.linkedCounselorPageId : null;

    const { error: insertError } = await adminClient.from('admin_users').insert({
      id: inviteData.user.id,
      email,
      role,
      status: 'pending',
      linked_counselor_page_id: linkedCounselorPageId,
    });
    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({ ok: true });
  }

  // action === 'resend'
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) {
    return jsonResponse({ error: 'userId is required' }, 400);
  }

  const { data: targetRow } = await adminClient
    .from('admin_users')
    .select('email, role, status, linked_counselor_page_id')
    .eq('id', userId)
    .maybeSingle();
  if (!targetRow) {
    return jsonResponse({ error: 'No such team member' }, 404);
  }
  if (targetRow.status !== 'pending') {
    return jsonResponse({ error: 'This person has already activated their login' }, 400);
  }

  // This function has no reliable way to know the site's own public URL
  // on its own (it only has Supabase config in its environment) — the
  // caller knows it, via window.location + withBase(), so it's passed
  // through here rather than this function guessing at a fixed value or
  // depending on the Supabase dashboard's "Site URL" setting. Without
  // this, an invite/reset link silently falls back to whatever that
  // dashboard setting happens to be, which has no connection to the
  // actual app code and can go stale the moment a route changes (see
  // CLAUDE.md's real-bugs list — this is exactly what happened once).
  const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined;
  const inviteOptions = redirectTo ? { redirectTo } : undefined;

  const { error: resendError } = await adminClient.auth.admin.inviteUserByEmail(targetRow.email, inviteOptions);
  if (!resendError) {
    return jsonResponse({ ok: true });
  }

  // Some Supabase versions reject re-inviting an email that already has
  // an (unconfirmed) Auth user instead of just resending — fall back to
  // deleting the stale unconfirmed account and admin_users row, then
  // inviting fresh, so "Resend" works from the owner's point of view
  // either way.
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    return jsonResponse({ error: resendError.message }, 400);
  }
  await adminClient.from('admin_users').delete().eq('id', userId);

  const { data: reinviteData, error: reinviteError } = await adminClient.auth.admin.inviteUserByEmail(
    targetRow.email,
    inviteOptions
  );
  if (reinviteError || !reinviteData.user) {
    return jsonResponse({ error: reinviteError?.message ?? 'Could not resend invite' }, 400);
  }
  const { error: reinsertError } = await adminClient.from('admin_users').insert({
    id: reinviteData.user.id,
    email: targetRow.email,
    role: targetRow.role,
    status: 'pending',
    linked_counselor_page_id: targetRow.linked_counselor_page_id,
  });
  if (reinsertError) {
    return jsonResponse({ error: reinsertError.message }, 500);
  }

  return jsonResponse({ ok: true });
});

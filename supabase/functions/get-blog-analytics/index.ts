// Pageviews-by-path for the admin Blog analytics screen (see CLAUDE.md's
// "Blog analytics" section) — a sibling to get-traffic-stats, kept as its
// own function rather than extended onto that one: get-traffic-stats'
// own byPath query is deliberately capped at the sitewide top 10 (right
// for a general traffic snapshot), but this screen needs every real blog
// post's own number, including ones with too little traffic to ever
// place in a sitewide top 10 — a different query shape, not just a
// different limit tacked onto the same one.
//
// Auth: same verify_jwt-isn't-enough + owner/agency admin_users check as
// every other admin-only function in this project (see publish-site's
// own header comment for why verify_jwt alone isn't sufficient).
//
// Config: reuses the SAME CLOUDFLARE_ANALYTICS_API_TOKEN/
// CLOUDFLARE_ACCOUNT_ID secrets get-traffic-stats already uses — this is
// the same Cloudflare Web Analytics site, just a different query against
// it, not a new integration.
//
// The caller (admin/blog-analytics.astro) joins this response's paths
// against real Blog Post rows (fetched separately from `pages`) by
// normalizing both sides (stripping leading/trailing slashes) — this
// function only knows about paths, never about which ones are blog
// posts.

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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface GroupRow {
  count: number;
  dimensions?: { requestPath?: string };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerRow } = await adminClient
    .from('admin_users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (!callerRow || (callerRow.role !== 'owner' && callerRow.role !== 'agency') || callerRow.status !== 'active') {
    return jsonResponse({ error: 'Not authorized' }, 403);
  }

  const cfToken = Deno.env.get('CLOUDFLARE_ANALYTICS_API_TOKEN');
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  if (!cfToken || !accountId) {
    return jsonResponse({ error: 'Traffic analytics is not configured for this site' }, 500);
  }

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 30);

  const query = `
    query BlogAnalytics($accountTag: String!, $windowStart: Date!, $today: Date!) {
      viewer {
        accounts(filter: {accountTag: $accountTag}) {
          byPath: rumPageloadEventsAdaptiveGroups(
            limit: 1000
            filter: {date_geq: $windowStart, date_leq: $today}
            orderBy: [count_DESC]
          ) {
            count
            dimensions { requestPath }
          }
        }
      }
    }
  `;

  const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { accountTag: accountId, windowStart: isoDate(windowStart), today: isoDate(now) },
    }),
  });

  if (!cfRes.ok) {
    return jsonResponse({ error: 'Cloudflare API request failed', detail: await cfRes.text() }, 502);
  }

  const cfJson = await cfRes.json();
  if (cfJson.errors) {
    return jsonResponse({ error: 'Cloudflare API returned errors', detail: cfJson.errors }, 502);
  }

  const byPath: GroupRow[] = cfJson.data?.viewer?.accounts?.[0]?.byPath ?? [];

  return jsonResponse({
    windowDays: 30,
    byPath: byPath
      .filter((row) => row.dimensions?.requestPath)
      .map((row) => ({ path: row.dimensions!.requestPath!, pageviews: row.count })),
  });
});

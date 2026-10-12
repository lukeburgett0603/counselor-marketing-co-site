// Tier 2 of the admin Leads and analytics dashboard (see CLAUDE.md's
// "Client dashboard" section) — visitors/pageviews/top pages, sourced from
// Cloudflare Web Analytics. Same shape of problem as publish-site: the
// Cloudflare account-level API token is a real secret and can never reach
// the browser, so this function holds it server-side and the dashboard
// calls this instead of Cloudflare's GraphQL API directly.
//
// Auth: same "verify_jwt isn't enough" preamble as every other admin
// function in this project (see publish-site's own header comment for
// why), plus an admin_users role check — owner/agency only, matching
// admin/leads.astro's own `{ ownerOnly: true }` gate, since a staff login
// never sees this dashboard in the first place and the server-side check
// should agree with that, not just trust the UI to hide the button.
//
// Config (`supabase secrets set ... --project-ref <ref>`):
//   CLOUDFLARE_ANALYTICS_API_TOKEN - an account-scoped API token with
//                                    only Account Analytics: Read.
//                                    Nothing broader — this function only
//                                    ever queries the GraphQL Analytics
//                                    API, read-only.
//   CLOUDFLARE_ACCOUNT_ID          - the Cloudflare account ID the Web
//                                    Analytics site belongs to.
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically into every Edge Function's environment.

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

// yyyy-mm-dd, matching the GraphQL API's `date` filter format — verified
// directly against the live schema (date_geq/date_leq + a `date`
// dimension both validated with a real query) before writing this,
// rather than assumed from documentation alone.
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface GroupRow {
  count: number;
  sum: { visits: number };
  dimensions?: { requestPath?: string; date?: string };
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
  const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const query = `
    query TrafficStats($accountTag: String!, $lastMonthStart: Date!, $thisMonthStart: Date!, $today: Date!, $chartStart: Date!) {
      viewer {
        accounts(filter: {accountTag: $accountTag}) {
          lastMonth: rumPageloadEventsAdaptiveGroups(
            limit: 1
            filter: {date_geq: $lastMonthStart, date_lt: $thisMonthStart}
          ) {
            count
            sum { visits }
          }
          thisMonth: rumPageloadEventsAdaptiveGroups(
            limit: 1
            filter: {date_geq: $thisMonthStart, date_leq: $today}
          ) {
            count
            sum { visits }
          }
          byDay: rumPageloadEventsAdaptiveGroups(
            limit: 31
            filter: {date_geq: $chartStart, date_leq: $today}
            orderBy: [date_ASC]
          ) {
            count
            sum { visits }
            dimensions { date }
          }
          byPath: rumPageloadEventsAdaptiveGroups(
            limit: 10
            filter: {date_geq: $chartStart, date_leq: $today}
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
      variables: {
        accountTag: accountId,
        lastMonthStart: isoDate(startOfLastMonth),
        thisMonthStart: isoDate(startOfThisMonth),
        today: isoDate(now),
        chartStart: isoDate(thirtyDaysAgo),
      },
    }),
  });

  if (!cfRes.ok) {
    return jsonResponse({ error: 'Cloudflare API request failed', detail: await cfRes.text() }, 502);
  }

  const cfJson = await cfRes.json();
  if (cfJson.errors) {
    return jsonResponse({ error: 'Cloudflare API returned errors', detail: cfJson.errors }, 502);
  }

  const account = cfJson.data?.viewer?.accounts?.[0];
  const lastMonth: GroupRow | undefined = account?.lastMonth?.[0];
  const thisMonth: GroupRow | undefined = account?.thisMonth?.[0];
  const byDay: GroupRow[] = account?.byDay ?? [];
  const byPath: GroupRow[] = account?.byPath ?? [];

  return jsonResponse({
    thisMonth: { pageviews: thisMonth?.count ?? 0, visits: thisMonth?.sum?.visits ?? 0 },
    lastMonth: { pageviews: lastMonth?.count ?? 0, visits: lastMonth?.sum?.visits ?? 0 },
    byDay: byDay.map((row) => ({
      date: row.dimensions?.date ?? '',
      pageviews: row.count,
      visits: row.sum?.visits ?? 0,
    })),
    topPages: byPath
      .filter((row) => row.dimensions?.requestPath)
      .map((row) => ({ path: row.dimensions!.requestPath!, pageviews: row.count })),
  });
});

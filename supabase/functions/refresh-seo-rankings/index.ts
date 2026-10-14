// Weekly SEO Insights refresh: pulls this client's Mangools SerpWatcher
// tracking stats (one call covers every tracked keyword at once) plus
// one competitor keyword-gap check, and snapshots both into
// keyword_rank_snapshots/keyword_gap_snapshots. See CLAUDE.md's "SEO
// Insights dashboard" section for the full design reasoning — most
// importantly, this reads a SerpWatcher tracking that already exists
// (created once, manually, during a real curation session) rather than
// paying for a fresh point-in-time check per keyword per run, and runs
// weekly rather than daily specifically to keep this client's share of
// the shared Mangools quota pool low.
//
// Auth: same shape as send-nurture-emails — there's no browser session
// here, the caller is a Supabase Cron job, not a logged-in admin. A
// dedicated SEO_CRON_SECRET (not NURTURE_CRON_SECRET — separate
// concern, separate rotation) is checked directly rather than compared
// against SUPABASE_SERVICE_ROLE_KEY, for the same reason documented in
// send-nurture-emails/index.ts (the key injected into a function's own
// environment doesn't reliably match what an external caller would
// present).
//
// Config (`supabase secrets set ... --project-ref <ref>`):
//   SEO_CRON_SECRET  - any random value (e.g. `openssl rand -hex 32`).
//                      Configure the Supabase Cron job (Dashboard ->
//                      Integrations -> Cron, weekly schedule) to send
//                      this same value as its Authorization: Bearer
//                      header.
//   MANGOOLS_API_KEY - the x-access-token value for CMC's shared
//                       Mangools account (see CLAUDE.md's Mangools
//                       section for the MCP-vs-REST split — a deployed
//                       Edge Function can't use MCP at runtime, so this
//                       calls the REST API directly).
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Endpoint paths/request shapes below were confirmed against Mangools'
// real published API docs (apidocs.mangools.com) — an earlier version
// of this function guessed wrong paths for both calls (kwfinder/
// keyword-gap-analysis instead of the real kwfinder/gap-analysis, and a
// per-keyword tracked-keywords/{id}/stats GET that doesn't exist at
// all) and got a real, live 404 the first time it was actually run
// against Freedom Counseling Services' project — see
// 0060_seo_insights_mangools_ids.sql and CLAUDE.md for the full story.
// The gap-analysis request body shape is confirmed against the docs and
// works; the response shape is NOT what the docs describe, though — a
// real live call (2026-09-17, Freedom Counseling Services, 5 real
// competitor domains) returned `results[].keywords[]` with `kw`/`sv`
// fields, not the docs' `results[].items[]` with `keyword`/
// `search_volume`. The tracking-stats response is ALSO confirmed
// against a real live call, against a real tracking
// (6aac3413751b76cad256399e) created for this same client: the
// per-keyword array is `keywords[]`, each item's own tracked-keyword id
// is `_id`, and its current position is `rank.last` — no plain
// ranking-URL field exists at this level (see
// parseTrackingStatsItem()'s own comment). Trust the live shape over
// the docs if they ever disagree again, for either endpoint.
//
// Fixed 2026-10-14: this function had never saved a single rank
// snapshot. target_keywords.mangools_tracked_keyword_id holds Mangools'
// 32-hex keyword hash (`kwId`), but stats items are keyed by the 24-hex
// tracked-keyword `_id`, so every lookup missed and was skipped without
// an error. The tracking detail endpoint
// (GET /serpwatcher/trackings/{id}/detail) lists both ids per keyword
// plus the ranking URL, so it's fetched alongside the stats to bridge
// the two. Unmatched items are now reported in ranksErrors instead of
// vanishing.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MANGOOLS_API_BASE = 'https://api.mangools.com/v3';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

interface TargetKeywordRow {
  id: string;
  keyword: string;
  mangools_tracked_keyword_id: string | null;
}

// Confirmed against a real live response (2026-09-17, Freedom
// Counseling Services, tracking 6aac3413751b76cad256399e): the
// per-keyword object's own id is `_id` (matches the tracked-keyword id
// returned when the tracking was created), and its current position is
// `rank.last`. There's no plain ranking-URL field visible at this level
// — `map_pack.url` exists but is specifically for local-pack presence,
// not the organic ranking URL, so `url` stays null here rather than
// guessing at a field that isn't actually present.
//
// `rank.last` is 101 when the domain isn't in the top 100 (and -1 or
// null when there's no check yet); all of those are stored as a null
// position, never as a number.
function parseTrackingStatsItem(item: any): { trackedKeywordId: string | null; position: number | null } {
  const last = item?.rank?.last;
  return {
    trackedKeywordId: item?._id ?? null,
    position: typeof last === 'number' && last >= 1 && last <= 100 ? last : null,
  };
}

// One tracking-detail keyword: `_id` is the tracked-keyword id the
// stats use, `kwId` is the keyword hash stored in target_keywords, and
// `url` is the page currently ranking (null when nothing ranks).
interface TrackingDetailKeyword {
  _id: string;
  kwId?: string;
  url?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const cronSecret = Deno.env.get('SEO_CRON_SECRET');
  if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: 'Not authorized' }, 401);
  }

  const mangoolsApiKey = Deno.env.get('MANGOOLS_API_KEY');
  if (!mangoolsApiKey) {
    return jsonResponse({ error: 'Mangools is not configured for this site' }, 500);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: business } = await supabase
    .from('business')
    .select('mangools_location_id, mangools_tracking_id, website_domain, seo_competitor_domains')
    .maybeSingle();

  if (!business?.mangools_location_id) {
    // Graceful "not configured" response, same shape as get-traffic-stats
    // on a site with no Cloudflare token set — onboarding hasn't reached
    // this step yet, not an error.
    return jsonResponse({ skipped: 'mangools_location_id not set on business' });
  }

  let ranksChecked = 0;
  const ranksErrors: string[] = [];

  // One call covers every tracked keyword in this client's single
  // shared tracking — not one call per keyword. Skipped entirely (not
  // errored) if the tracking hasn't been created yet.
  if (business.mangools_tracking_id) {
    try {
      const { data: targetKeywords, error: keywordsError } = await supabase
        .from('target_keywords')
        .select('id, keyword, mangools_tracked_keyword_id')
        .in('status', ['active', 'achieved'])
        .not('mangools_tracked_keyword_id', 'is', null);

      if (keywordsError) {
        ranksErrors.push('Could not load target keywords: ' + keywordsError.message);
      } else {
        // Several target rows can point at the same Mangools keyword
        // (e.g. two spellings of one phrase), so each id maps to a list.
        const byMangoolsId = new Map<string, TargetKeywordRow[]>();
        for (const tk of (targetKeywords as TargetKeywordRow[]) ?? []) {
          const list = byMangoolsId.get(tk.mangools_tracked_keyword_id!) ?? [];
          list.push(tk);
          byMangoolsId.set(tk.mangools_tracked_keyword_id!, list);
        }

        const trackingPath = `${MANGOOLS_API_BASE}/serpwatcher/trackings/${business.mangools_tracking_id}`;
        const [detailRes, statsRes] = await Promise.all([
          fetch(`${trackingPath}/detail`, { headers: { 'x-access-token': mangoolsApiKey } }),
          fetch(`${trackingPath}/stats`, {
            method: 'POST',
            headers: { 'x-access-token': mangoolsApiKey, 'Content-Type': 'application/json' },
          }),
        ]);

        if (!detailRes.ok) {
          ranksErrors.push(`tracking detail: Mangools returned ${detailRes.status}`);
        } else if (!statsRes.ok) {
          ranksErrors.push(`tracking stats: Mangools returned ${statsRes.status}`);
        } else {
          const detail = await detailRes.json();
          const detailById = new Map<string, TrackingDetailKeyword>(
            ((detail?.keywords ?? []) as TrackingDetailKeyword[]).map((kw) => [kw._id, kw])
          );

          const stats = await statsRes.json();
          // Confirmed against a real live response — see
          // parseTrackingStatsItem()'s own comment above.
          const items: any[] = stats?.keywords ?? [];
          const rows: { target_keyword_id: string; position: number | null; ranking_url: string | null }[] = [];
          const matched = new Set<string>();

          for (const item of items) {
            const parsed = parseTrackingStatsItem(item);
            if (!parsed.trackedKeywordId) continue;
            const detailKw = detailById.get(parsed.trackedKeywordId);
            // Match on either id, so rows saved with the tracked-keyword
            // `_id` keep working too.
            const tks = byMangoolsId.get(parsed.trackedKeywordId) ?? (detailKw?.kwId ? byMangoolsId.get(detailKw.kwId) : undefined);
            if (!tks) continue;
            for (const tk of tks) {
              matched.add(tk.id);
              rows.push({
                target_keyword_id: tk.id,
                position: parsed.position,
                // A URL only means something when the page is in the top 100.
                ranking_url: parsed.position !== null ? (detailKw?.url ?? null) : null,
              });
            }
          }

          if (rows.length > 0) {
            const { error: insertError } = await supabase.from('keyword_rank_snapshots').insert(rows);
            if (insertError) ranksErrors.push(`rank snapshots: ${insertError.message}`);
            else ranksChecked = rows.length;
          }

          for (const tk of (targetKeywords as TargetKeywordRow[]) ?? []) {
            if (!matched.has(tk.id)) ranksErrors.push(`${tk.keyword}: not found in the Mangools tracking`);
          }
        }
      }
    } catch (err) {
      ranksErrors.push(`tracking stats: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Once per client — a single competitor-gap comparison against every
  // configured competitor domain. Independent of rank tracking above;
  // skipped (not errored) if this client's own domain isn't set yet.
  let gapKeywordsFound = 0;
  const competitorDomains: string[] = business.seo_competitor_domains ?? [];

  if (business.website_domain && competitorDomains.length > 0) {
    try {
      const gapRes = await fetch(`${MANGOOLS_API_BASE}/kwfinder/gap-analysis`, {
        method: 'POST',
        headers: { 'x-access-token': mangoolsApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: business.website_domain,
          competitors: competitorDomains,
          location_id: business.mangools_location_id,
        }),
      });
      if (!gapRes.ok) {
        ranksErrors.push(`gap analysis: Mangools returned ${gapRes.status}`);
      } else {
        const gapData = await gapRes.json();
        // Confirmed against a real live response (2026-09-17, Freedom
        // Counseling Services) — the published docs describe this as
        // `items` with `keyword`/`search_volume` fields, but the actual
        // API returns `keywords` with `kw`/`sv`. Trust the live shape,
        // not the docs, if the two ever disagree again.
        const results: { domain: string; keywords: { kw: string; sv?: number }[] }[] = gapData?.results ?? [];
        for (const competitorResult of results) {
          for (const gk of competitorResult.keywords ?? []) {
            const { error: gapInsertError } = await supabase.from('keyword_gap_snapshots').insert({
              keyword: gk.kw,
              search_volume: gk.sv ?? null,
              competitor_domain: competitorResult.domain,
            });
            if (!gapInsertError) gapKeywordsFound++;
          }
        }
      }
    } catch (err) {
      ranksErrors.push(`gap analysis: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return jsonResponse({ ranksChecked, ranksErrors, gapKeywordsFound });
});

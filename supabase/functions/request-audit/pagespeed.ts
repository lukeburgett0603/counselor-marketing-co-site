// Google PageSpeed Insights (mobile): load time (Largest Contentful Paint),
// the performance score, the phone screenshot, and the accessibility
// score with its failing checks. PAGESPEED_API_KEY is optional; without it
// Google allows a small number of keyless runs, which is fine for testing.
export interface SpeedResult {
  score: number | null;
  loadSeconds: number | null;
  screenshot: string | null;
  accessibility: { score: number | null; issues: string[] } | null;
}

export async function pagespeed(url: string, withAccessibility: boolean): Promise<SpeedResult | null> {
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  params.append('category', 'performance');
  if (withAccessibility) params.append('category', 'accessibility');
  const key = Deno.env.get('PAGESPEED_API_KEY');
  if (key) params.set('key', key);
  let data: Record<string, any>;
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) {
      console.error('pagespeed: non-2xx', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    data = await res.json();
  } catch (err) {
    console.error('pagespeed: failed', String(err));
    return null;
  }
  const lh = data.lighthouseResult ?? {};
  const audits = lh.audits ?? {};
  const pct = (v: unknown) => (typeof v === 'number' ? Math.round(v * 100) : null);
  const lcp = audits['largest-contentful-paint']?.numericValue;
  let accessibility: SpeedResult['accessibility'] = null;
  const a11y = lh.categories?.accessibility;
  if (withAccessibility && a11y) {
    const issues = ((a11y.auditRefs ?? []) as { id: string; weight: number }[])
      .filter((r) => r.weight > 0 && audits[r.id]?.score === 0)
      .sort((x, y) => y.weight - x.weight)
      .map((r) => r.id);
    accessibility = { score: pct(a11y.score), issues };
  }
  return {
    score: pct(lh.categories?.performance?.score),
    loadSeconds: typeof lcp === 'number' ? Math.round(lcp / 100) / 10 : null,
    screenshot: typeof audits['final-screenshot']?.details?.data === 'string' ? audits['final-screenshot'].details.data : null,
    accessibility,
  };
}

// /pricing.md: every price in plain text for AI assistants
// (rebuild/ai-seo-and-schema.md). Built from site.ts, same as /pricing.
import type { APIRoute } from 'astro';
import { SITE, TIERS, ADDONS, BUILD_FEE, BUILD_INCLUDES, TIER_MATRIX, DATA_PROMISE, HIPAA_ANSWER, money } from '../lib/site';
import { withBase } from '../lib/url';

export const GET: APIRoute = ({ site }) => {
  const root = new URL(withBase('/'), site).toString().replace(/\/$/, '');
  const tiers = TIERS.map((t) => {
    const price = t.priceNote ?? `${t.priceLabel}/mo`;
    return `### ${t.name}${t.recommended ? ' (recommended)' : ''}
- Price: ${price}, plus a ${money(BUILD_FEE)} one-time website build
- For: ${t.forWho}
${t.lead ? `- ${t.lead}\n` : ''}${t.features.map((f) => `  - ${f}`).join('\n')}`;
  }).join('\n\n');
  const matrix = TIER_MATRIX.map((r) => `| ${r.step} | ${r.cells.join(' | ')} |`).join('\n');
  const body = `# ${SITE.name} pricing

Source: ${root}/pricing. Month-to-month on every plan; no contracts. Every plan includes the whole Full Caseload System; the plans differ in who runs it.

## Plans

${tiers}

## Every plan starts with a ${money(BUILD_FEE)} website build
${BUILD_INCLUDES.map((b) => `- ${b}`).join('\n')}

## What each plan includes, by step

| Step | Self-Guided ($149) | Done for You ($800) | Group Practice ($1,200+) |
|---|---|---|---|
${matrix}

## Add-ons (any plan)
${ADDONS.map((a) => `- ${a.name}: ${a.priceLabel}. ${a.text}`).join('\n')}

## Data and privacy
- ${DATA_PROMISE}
- HIPAA: ${HIPAA_ANSWER}

## Next step
Free Caseload Audit, written plan within 48 hours: ${root}${SITE.auditPath}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};

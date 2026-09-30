// /llms.txt: a plain summary for AI assistants and buying agents
// (rebuild/ai-seo-and-schema.md). Built from site.ts so it can't go stale.
import type { APIRoute } from 'astro';
import { SITE, TIERS, BUILD_FEE, money } from '../lib/site';
import { withBase } from '../lib/url';

export const GET: APIRoute = ({ site }) => {
  const root = new URL(withBase('/'), site).toString().replace(/\/$/, '');
  const u = (p: string) => `${root}${p}`;
  const tiers = TIERS.map((t) => `${t.name} ${t.key === 'group' ? '$1,200-$1,500/mo' : `${t.priceLabel}/mo`}`).join(', ');
  const body = `# ${SITE.name}

> The Full Caseload System: a client-getting system for counseling practices (counselors, therapists, psychologists), built and run by ${SITE.founder}, ${SITE.credential} (${SITE.credentialLong}, ${SITE.licenseState}). Five steps: get found, get chosen, get referred, get booked, watch it work. Month-to-month; the practice's website and data always go with them.

## Key pages
- [How It Works](${u('/how-it-works')}): the five steps and what each includes
- [Pricing](${u('/pricing')}): ${tiers}, plus a ${money(BUILD_FEE)} build ([plain text](${u('/pricing.md')}))
- [Free Caseload Audit](${u(SITE.auditPath)}): written plan within 48 hours
- [Results](${u('/results')}): Freedom Counseling Services, 3.5 to 4.0 Google stars in three weeks
- [Compare](${u('/compare')}): honest comparisons with WebsiteTherapy, TherapySites, Psychology Today, DIY builders, agencies
- [How to Get More Therapy Clients](${u('/how-to-get-more-therapy-clients')}): the complete guide
- [Caseload Calculator](${u('/caseload-calculator')}): free tool, same math as the platform
- [Your Data Is Yours](${u('/your-data')})

## Services
- [Website Design](${u('/website-design')})
- [SEO & Google Maps](${u('/seo')})
- [Google Ads](${u('/google-ads-for-therapists')})
- [Ethical Reviews](${u('/ethical-reviews')})
- [Referral Marketing](${u('/referral-marketing')})
- [The Platform](${u('/platform')})
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

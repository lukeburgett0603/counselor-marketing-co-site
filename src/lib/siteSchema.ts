// JSON-LD for the rebuilt public site (rebuild/ai-seo-and-schema.md).
// One @graph per page. Rules carried over from schema.ts: never invent a
// value, FAQPage only from visible Q&A, no Review/AggregateRating markup
// anywhere (we have no reviews of CMC, and Freedom's rating is theirs).
import { SITE, TIERS, GROUP_PRICES, ADDONS, BUILD_FEE } from './site';

export type Node = Record<string, unknown>;

export const LOGO_URL = 'https://olrcclpwvobcvczzlprk.supabase.co/storage/v1/object/public/site-images/logo-2026.png';

export function ids(siteUrl: string) {
  return {
    org: `${siteUrl}/#organization`,
    site: `${siteUrl}/#website`,
    person: `${siteUrl}/about#luke-burgett`,
  };
}

export function organization(siteUrl: string): Node {
  const id = ids(siteUrl);
  return {
    '@type': 'Organization',
    '@id': id.org,
    name: SITE.name,
    url: `${siteUrl}/`,
    logo: LOGO_URL,
    sameAs: [SITE.linkedin],
    founder: { '@id': id.person },
    areaServed: { '@type': 'Country', name: 'United States' },
    description:
      'The Full Caseload System: a client-getting system for counseling practices, built and run by a licensed counselor.',
  };
}

export function website(siteUrl: string): Node {
  const id = ids(siteUrl);
  return { '@type': 'WebSite', '@id': id.site, name: SITE.name, url: `${siteUrl}/`, publisher: { '@id': id.org } };
}

export function person(siteUrl: string, imageUrl?: string): Node {
  const id = ids(siteUrl);
  const node: Node = {
    '@type': 'Person',
    '@id': id.person,
    name: SITE.founder,
    honorificSuffix: SITE.credential,
    jobTitle: 'Founder, Counselor Marketing Co.',
    worksFor: { '@id': id.org },
    sameAs: [SITE.linkedin],
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'license',
      name: SITE.credentialLong,
      recognizedBy: { '@type': 'Organization', name: SITE.licenseBoard },
    },
  };
  if (imageUrl) node.image = imageUrl;
  return node;
}

export function breadcrumbs(siteUrl: string, crumbs: { name: string; path: string }[]): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.path === '/' ? `${siteUrl}/` : `${siteUrl}${c.path}`,
    })),
  };
}

export function faqPage(faqs: { q: string; a: string }[]): Node {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function service(siteUrl: string, opts: { name: string; description: string; path: string; serviceType?: string }): Node {
  return {
    '@type': 'Service',
    name: opts.name,
    serviceType: opts.serviceType ?? opts.name,
    description: opts.description,
    url: `${siteUrl}${opts.path}`,
    provider: { '@id': ids(siteUrl).org },
    areaServed: { '@type': 'Country', name: 'United States' },
  };
}

function monthly(price: number, name: string): Node {
  return {
    '@type': 'Offer',
    name,
    price,
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price,
      priceCurrency: 'USD',
      unitCode: 'MON',
      billingDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
    },
  };
}

// Every Offer here is a price shown on the visible Pricing page. The 11+
// clinician "custom quote" deliberately has no Offer: there's no price.
export function pricingService(siteUrl: string, description: string): Node {
  const offers: Node[] = [];
  for (const tier of TIERS) {
    if (tier.key === 'group') {
      for (const g of GROUP_PRICES) offers.push(monthly(g.price, `Group Practice (${g.label})`));
    } else {
      offers.push(monthly(tier.price, tier.name));
    }
  }
  offers.push({ '@type': 'Offer', name: 'Website build (one time, every plan)', price: BUILD_FEE, priceCurrency: 'USD' });
  for (const a of ADDONS) {
    offers.push(
      a.unit === 'month'
        ? monthly(a.price, `${a.name} (add-on)`)
        : { '@type': 'Offer', name: `${a.name} (add-on, one time)`, price: a.price, priceCurrency: 'USD' },
    );
  }
  return {
    ...service(siteUrl, { name: 'The Full Caseload System', description, path: '/pricing', serviceType: 'Marketing for counseling practices' }),
    offers,
  };
}

export function article(
  siteUrl: string,
  opts: { headline: string; description: string; path: string; datePublished: string; dateModified?: string; image?: string; type?: 'Article' | 'BlogPosting' },
): Node {
  const id = ids(siteUrl);
  const node: Node = {
    '@type': opts.type ?? 'Article',
    headline: opts.headline,
    description: opts.description,
    author: { '@id': id.person },
    publisher: { '@id': id.org },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    mainEntityOfPage: `${siteUrl}${opts.path}`,
  };
  if (opts.image) node.image = opts.image;
  return node;
}

export function webApplication(siteUrl: string, opts: { name: string; description: string; path: string }): Node {
  return {
    '@type': 'WebApplication',
    name: opts.name,
    description: opts.description,
    url: `${siteUrl}${opts.path}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (runs in the browser)',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    provider: { '@id': ids(siteUrl).org },
  };
}

export function itemList(siteUrl: string, items: { name: string; path: string }[]): Node {
  return {
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: `${siteUrl}${it.path}` })),
  };
}

export function webPage(siteUrl: string, opts: { name: string; description: string; path: string }): Node {
  return {
    '@type': 'WebPage',
    name: opts.name,
    description: opts.description,
    url: `${siteUrl}${opts.path}`,
    isPartOf: { '@id': ids(siteUrl).site },
  };
}

import { withBase } from './url';
// The site's real root including any GitHub Pages base path, no trailing slash.
export function rootUrl(site: URL | undefined, url: URL): string {
  return new URL(withBase('/'), site ?? url).toString().replace(/\/$/, '');
}

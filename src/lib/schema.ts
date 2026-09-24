// JSON-LD generation, per frontend-site-builder's references/schema-markup.md.
// Same rules as the Wix version: one canonical business entity referenced by
// @id everywhere else, never invent a property value, no self-serving
// Review/AggregateRating markup, FAQPage only on pages with real visible Q&A.
import type { Business, Page } from './pages';

function businessId(siteUrl: string): string {
  return `${siteUrl}/#business`;
}

// The one place the full business entity is declared (Homepage only).
export function buildBusinessSchema(business: Business, siteUrl: string) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': business.business_subtype,
    '@id': businessId(siteUrl),
    name: business.display_name,
    url: siteUrl,
  };

  if (business.legal_name) schema.legalName = business.legal_name;
  if (business.logo_url) schema.logo = business.logo_url;
  if (business.founding_year) schema.foundingDate = `${business.founding_year}-01-01`;
  if (business.price_range) schema.priceRange = business.price_range;
  if (business.telephone) schema.telephone = business.telephone;
  if (business.email) schema.email = business.email;

  if (
    business.street_address ||
    business.address_locality ||
    business.address_region ||
    business.postal_code
  ) {
    // schema.org's PostalAddress has no separate suite/unit property —
    // street_address_2 gets folded into streetAddress here, the same
    // way every other renderer of this address combines the two.
    const streetAddress = [business.street_address, business.street_address_2].filter(Boolean).join(', ');
    schema.address = {
      '@type': 'PostalAddress',
      ...(streetAddress && { streetAddress }),
      ...(business.address_locality && { addressLocality: business.address_locality }),
      ...(business.address_region && { addressRegion: business.address_region }),
      ...(business.postal_code && { postalCode: business.postal_code }),
    };
  }

  if (business.latitude != null && business.longitude != null) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.latitude,
      longitude: business.longitude,
    };
  }

  if (business.opening_hours) schema.openingHoursSpecification = business.opening_hours;
  if (business.same_as?.length) schema.sameAs = business.same_as;
  if (business.photos?.length) schema.image = business.photos;
  if (business.google_maps_url) schema.hasMap = business.google_maps_url;

  return schema;
}

export function buildWebsiteSchema(business: Business, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: business.display_name,
    url: siteUrl,
  };
}

export function buildServiceSchema(page: Page, siteUrl: string) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.title,
    provider: { '@id': businessId(siteUrl) },
  };
  // `purpose` is internal planning metadata (has held things like pricing
  // tiers) — never surface it in public output. `meta_description` is the
  // field written for public consumption, same as it is in <head>.
  if (page.meta_description) schema.description = page.meta_description;
  if (page.area_served_name) schema.areaServed = page.area_served_name;
  schema.url = `${siteUrl}/${page.slug}`;
  return schema;
}

export function buildArticleSchema(page: Page, siteUrl: string, hasBlog: boolean) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': hasBlog ? 'BlogPosting' : 'Article',
    headline: page.h1 ?? page.title,
    publisher: { '@id': businessId(siteUrl) },
  };
  if (page.author_name) schema.author = { '@type': 'Person', name: page.author_name };
  if (page.date_published) schema.datePublished = page.date_published;
  if (page.date_modified) schema.dateModified = page.date_modified;
  if (page.images.hero) schema.image = page.images.hero.url;
  if (page.meta_description) schema.description = page.meta_description;
  // Google's own Article structured-data example includes this — an
  // explicit self-reference declaring this URL as the article's one
  // canonical location, not left implicit via the <link rel="canonical">
  // tag alone.
  if (page.slug) {
    schema.mainEntityOfPage = { '@type': 'WebPage', '@id': `${siteUrl}/${page.slug}` };
  }
  // Real, computed from the actual body — never a hand-typed estimate that
  // can drift out of sync with the content.
  if (page.copy) schema.wordCount = page.copy.trim().split(/\s+/).length;
  // The KeyTakeaways card (see ContentPillar.astro) is genuinely a summary
  // of the piece — `abstract` is the schema.org property for exactly that,
  // and only ever reflects what's actually rendered on the page.
  if (page.key_takeaways.length > 0) schema.abstract = page.key_takeaways.join(' ');
  if (page.category) schema.about = page.category;
  return schema;
}

// The single source of truth for which real, already-declared facts
// describe a Counselor Profile page's Person entity. Two very different
// readers need this same list: buildPersonSchema() below (feeds Google's
// invisible JSON-LD) and the counselor-facing writing guidance shown in
// admin/content/page-copy.astro (feeds a human writing their own bio,
// reminding them these are real facts worth naturally mentioning). Add a
// fact here once and both pick it up automatically — the alternative
// (each reader independently listing the fields it cares about) is
// exactly the "two lists that happen to agree today, with nothing
// stopping them from silently drifting apart tomorrow" shape this
// project has hit before elsewhere. Each entry names the real
// schema.org `Person` property it maps to, alongside a short label
// meant for display to a non-technical reader — never invented, only
// fields the page actually has set.
//
// Deliberately typed on a minimal structural shape rather than the full
// `Page` type — the admin UI reader only ever has its own narrower local
// row type in scope (it fetches a subset of columns, not every `Page`
// field), and this function only ever touches these specific fields
// anyway. Requiring the full `Page` type would force that caller to
// either over-fetch columns it doesn't use or fight a type mismatch for
// no real benefit.
//
// Returns one entry per atomic real fact — including one per specialty
// and one per modality, not a single joined string — because two
// different things need two different shapes from the same data:
// buildPersonSchema() needs a real string[] for `knowsAbout` (schema.org
// expects an array, not one comma-joined value), while the admin
// guidance panel wants to group and display them together. Keeping this
// function's output atomic and letting each reader shape it how it
// needs is simpler than baking one reader's formatting into the shared
// source of truth.
export function getPersonEntityTerms(
  page: {
    credentials: string | null;
    professional_title?: string | null;
    specialties?: { label: string; page_slug: string | null }[] | null;
    modalities?: string[] | null;
  }
): { label: string; value: string; schemaProperty: string }[] {
  const terms: { label: string; value: string; schemaProperty: string }[] = [];
  if (page.credentials) {
    terms.push({ label: 'Credentials', value: page.credentials, schemaProperty: 'honorificSuffix' });
  }
  if (page.professional_title) {
    terms.push({ label: 'Professional title', value: page.professional_title, schemaProperty: 'jobTitle' });
  }
  for (const specialty of page.specialties ?? []) {
    terms.push({ label: 'Specialty', value: specialty.label, schemaProperty: 'knowsAbout' });
  }
  for (const modality of page.modalities ?? []) {
    terms.push({ label: 'Modality', value: modality, schemaProperty: 'knowsAbout' });
  }
  return terms;
}

export function buildPersonSchema(page: Page, siteUrl: string) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: page.title,
    worksFor: { '@id': businessId(siteUrl) },
  };
  // Multiple terms can map to the same schema property (every specialty
  // and modality maps to `knowsAbout`) — the first one sets it, a second
  // promotes it to an array, a third+ just appends. Generic on purpose:
  // this coalescing works for any future property that gains more than
  // one contributing term, without needing to special-case a property
  // name here.
  for (const term of getPersonEntityTerms(page)) {
    const existing = schema[term.schemaProperty];
    if (existing === undefined) {
      schema[term.schemaProperty] = term.value;
    } else if (Array.isArray(existing)) {
      existing.push(term.value);
    } else {
      schema[term.schemaProperty] = [existing, term.value];
    }
  }
  // See buildServiceSchema above — purpose is internal-only, never public.
  if (page.meta_description) schema.description = page.meta_description;
  if (page.images.headshot) schema.image = page.images.headshot.url;
  schema.url = `${siteUrl}/${page.slug}`;
  return schema;
}

export function buildServiceAreaSchema(business: Business, page: Page, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': business.business_subtype,
    '@id': businessId(siteUrl),
    areaServed: page.area_served_name ?? page.title,
  };
}

export function buildContactPageSchema(business: Business, siteUrl: string, page: Page) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    about: { '@id': businessId(siteUrl) },
    url: `${siteUrl}/${page.slug}`,
  };
  if (business.telephone) schema.telephone = business.telephone;
  return schema;
}

export function buildWebPageSchema(page: Page, siteUrl: string) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    url: `${siteUrl}/${page.slug}`,
  };
  // Every page that reaches this generic fallback (About, Services
  // Overview, Blog Index, Other) still has a real meta_description written
  // for its <head> tag — no reason WebPage schema shouldn't carry the same
  // description Google already reads from the page.
  if (page.meta_description) schema.description = page.meta_description;
  return schema;
}

// Informational only, not a ranking lever (Google retired FAQ rich results
// in May 2026) — only call this for a page whose `faqs` are actually
// rendered visibly (see FAQ.astro), never to disguise marketing copy as
// questions just to get the schema type on the page.
export function buildFAQSchema(page: Page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Generated from the page's real parent_page_id chain — never hand-write
// breadcrumb text that doesn't match the actual nav hierarchy.
export function buildBreadcrumbSchema(chain: Page[], siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: chain.map((page, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: page.title,
      item: page.page_type === 'Homepage' ? siteUrl : `${siteUrl}/${page.slug}`,
    })),
  };
}

// Dispatches a page to its schema type(s) per the mapping table in
// schema-markup.md. Returns an array since Homepage needs two nodes.
export function buildPageSchemas(
  page: Page,
  business: Business,
  siteUrl: string,
  options: { hasBlog?: boolean } = {}
): Record<string, unknown>[] {
  const schemas = ((): Record<string, unknown>[] => {
    switch (page.page_type) {
      case 'Homepage':
        return [buildBusinessSchema(business, siteUrl), buildWebsiteSchema(business, siteUrl)];
      case 'Service Page':
        return [buildServiceSchema(page, siteUrl)];
      case 'Content Pillar':
      case 'Service Hub':
      case 'Blog Post':
        return [buildArticleSchema(page, siteUrl, options.hasBlog ?? false)];
      case 'Counselor Profile':
        return [buildPersonSchema(page, siteUrl)];
      case 'Service Area':
        return [buildServiceAreaSchema(business, page, siteUrl)];
      case 'Contact':
        return [buildContactPageSchema(business, siteUrl, page)];
      case 'About':
      case 'Services Overview':
      case 'Blog Index':
      case 'Other':
      default:
        return [buildWebPageSchema(page, siteUrl)];
    }
  })();

  // Independent of page_type: any page with real, visibly-rendered Q&A
  // (see FAQ.astro) gets an additional FAQPage node alongside its primary
  // schema, not instead of it.
  if (page.faqs.length > 0) schemas.push(buildFAQSchema(page));

  return schemas;
}

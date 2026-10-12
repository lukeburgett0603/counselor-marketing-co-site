// The data an instant Caseload Audit is built from. Everything here comes
// from a real check (the practice's own website, Google PageSpeed, or
// Mangools); nothing is estimated. `null` means "couldn't check", never
// "zero" or "no".

export interface AuditRanking {
  keyword: string; // e.g. "anxiety counseling springfield"
  volume: number | null; // monthly searches (Mangools)
  position: number | null; // their site's Google position, null = not on page one (Mangools sees page one only)
  leaders: { name: string; domain: string; position: number }[]; // top practices, directories skipped
  directories?: string[]; // directory sites in the top 5, e.g. ["Psychology Today"]
}

export interface AuditSpecialty {
  label: string; // as listed on their site, e.g. "Couples counseling"
  hasPage: boolean; // a page dedicated to it
  keyword: string | null; // the local search we checked for it
  volume: number | null;
}

// What we check on a practice's website. Used for the prospect and for
// the practice they're compared with.
export interface SiteChecks {
  reachable: boolean;
  title: string | null;
  description: string | null;
  hasBusinessSchema: boolean | null; // LocalBusiness / MedicalBusiness / ProfessionalService JSON-LD
  weCount: number | null; // "we/our/I/my/me" on the homepage
  youCount: number | null; // "you/your" on the homepage
  phoneLink: boolean | null; // a tap-to-call tel: link
  contactForm: boolean | null; // a form on the site itself
  emailLink: boolean | null;
  bookingPlatform: string | null; // e.g. "SimplePractice", when booking leaves the site
  // Homepage plus the pages it links to directly (up to 10):
  mentionsFees: boolean | null; // fees, rates, insurance, sliding scale
  mentionsNewClients: boolean | null; // "accepting new clients" and similar
  mentionsTelehealth: boolean | null; // online / virtual / telehealth sessions
  crisisLine: string | null; // e.g. "988"; null = none found
  credentials: string[] | null; // on the homepage, e.g. ["LPC", "LCSW"]
  newestContent: { date: string | null; hasArticles: boolean } | null; // null = couldn't tell
  platform?: string | null; // website builder, e.g. "Squarespace"
  counselorCount?: number | null; // people with a credential on the team page
  directoryProfiles?: string[]; // directory profiles their own site links to
}

export interface AuditData {
  id: string;
  createdAt: string; // ISO
  contactName: string | null; // the person who asked, e.g. "Maya Patel"
  practice: {
    name: string;
    url: string | null; // null when they had no website
    city: string | null;
    state: string | null;
  };
  rankings: AuditRanking[]; // first one is their main search
  authority: { yours: number | null; leaders: { domain: string; value: number }[] } | null;
  specialties: AuditSpecialty[];
  site: SiteChecks | null;
  speed: {
    score: number | null; // Google's mobile performance score, 0-100
    loadSeconds: number | null; // Largest Contentful Paint on a phone
    screenshot: string | null; // URL or data URI of the phone screenshot
  } | null;
  accessibility: { score: number | null; issues: string[] } | null; // Lighthouse audit ids, worst first
  // Trusted sites linking to them, and to the top 2 practices but not to
  // them (junk filtered out; see request-audit/links.ts). null = not checked.
  backlinks?: {
    yours: { name: string; domain: string; url: string; category: string }[];
    gaps: { name: string; domain: string; url: string; category: string; leader: string }[];
    press: { name: string; leader: string }[];
  } | null;
  // The top practice for their main search (or the next one down, when
  // they're the top practice), run through the same site checks.
  compare: {
    name: string;
    domain: string;
    position: number;
    theyLead: boolean; // true = the prospect is the top practice
    site: SiteChecks | null;
    loadSeconds: number | null;
  } | null;
}

// Single source of truth for the public site's facts: navigation, the five
// steps, and every price. Pages, schema, /pricing.md and /llms.txt all read
// from here, so a price can never disagree with itself across the site.
// Copy source: rebuild/copy/*.md; pricing decisions: rebuild/pricing-structure.md.

export const SITE = {
  name: 'Counselor Marketing Co.',
  founder: 'Luke Burgett',
  credential: 'LPCA',
  credentialLong: 'Licensed Professional Counselor Associate',
  licenseState: 'Kentucky',
  licenseBoard: 'Kentucky Board of Licensed Professional Counselors',
  linkedin: 'https://www.linkedin.com/in/luke-burgett-54b8b218b/',
  auditPath: '/free-caseload-audit',
  auditCta: 'Get My Free Caseload Audit',
  auditTurnaround: 'a written plan within 48 hours',
};

export interface NavLink {
  label: string;
  href: string;
  note?: string;
}
export interface NavGroup {
  label: string;
  links: NavLink[];
}
export interface NavItem {
  label: string;
  href: string;
  groups?: NavGroup[];
}

export const STEPS = [
  {
    key: 'found',
    name: 'Get Found',
    icon: 'magnifying-glass',
    short: 'Google, Maps, and AI search, for the clients you most want to see.',
    links: [
      { label: 'Website Design', href: '/website-design' },
      { label: 'SEO & Google Maps', href: '/seo' },
      { label: 'Google Ads', href: '/google-ads-for-therapists' },
    ],
  },
  {
    key: 'chosen',
    name: 'Get Chosen',
    icon: 'star',
    short: 'A site that answers a nervous first-time client, and reviews grown ethically.',
    links: [{ label: 'Ethical Reviews', href: '/ethical-reviews' }],
  },
  {
    key: 'referred',
    name: 'Get Referred',
    icon: 'handshake',
    short: 'The local doctors, attorneys, and pastors who send people to counselors.',
    links: [{ label: 'Referral Marketing', href: '/referral-marketing' }],
  },
  {
    key: 'booked',
    name: 'Get Booked',
    icon: 'lightning',
    short: 'Instant replies, instant alerts, and reminders until every lead hears back.',
    links: [{ label: 'The Platform', href: '/platform' }],
  },
  {
    key: 'watch',
    name: 'Watch It Work',
    icon: 'chart-line-up',
    short: 'New clients, where they came from, and how full your caseload is.',
    links: [{ label: 'The Platform', href: '/platform' }],
  },
] as const;

export const NAV: NavItem[] = [
  { label: 'How It Works', href: '/how-it-works' },
  {
    label: 'Services',
    href: '/services',
    groups: [
      {
        label: 'Get Found',
        links: [
          { label: 'Website Design', href: '/website-design' },
          { label: 'SEO & Google Maps', href: '/seo' },
          { label: 'Google Ads', href: '/google-ads-for-therapists' },
        ],
      },
      { label: 'Get Chosen', links: [{ label: 'Ethical Reviews', href: '/ethical-reviews' }] },
      { label: 'Get Referred', links: [{ label: 'Referral Marketing', href: '/referral-marketing' }] },
      { label: 'Get Booked · Watch It Work', links: [{ label: 'The Platform', href: '/platform' }] },
    ],
  },
  {
    label: 'Who We Serve',
    href: '/who-we-serve',
    groups: [
      {
        label: 'Practices',
        links: [
          { label: 'Solo Practices', href: '/solo-practice-marketing' },
          { label: 'Group Practices', href: '/group-practice-marketing' },
          { label: 'Psychologists', href: '/psychologist-marketing' },
          { label: 'Christian Counselors', href: '/christian-counseling-marketing' },
        ],
      },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Results', href: '/results' },
  {
    label: 'Resources',
    href: '/blog',
    groups: [
      {
        label: 'Guides and tools',
        links: [
          { label: 'How to Fill Your Caseload', href: '/how-to-get-more-therapy-clients' },
          { label: 'Caseload Calculator', href: '/caseload-calculator' },
          { label: 'Compare Your Options', href: '/compare' },
        ],
      },
      {
        label: 'Topics',
        links: [
          { label: 'Therapist Marketing', href: '/therapist-marketing' },
          { label: 'Therapist Websites', href: '/therapist-websites' },
          { label: 'Practice Growth', href: '/private-practice-growth' },
          { label: 'Therapist Branding', href: '/therapist-branding' },
        ],
      },
    ],
  },
];

export const FOOTER: NavGroup[] = [
  {
    label: 'The System',
    links: [
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Website Design', href: '/website-design' },
      { label: 'SEO & Google Maps', href: '/seo' },
      { label: 'Google Ads', href: '/google-ads-for-therapists' },
      { label: 'Ethical Reviews', href: '/ethical-reviews' },
      { label: 'Referral Marketing', href: '/referral-marketing' },
      { label: 'The Platform', href: '/platform' },
    ],
  },
  {
    label: 'Who We Serve',
    links: [
      { label: 'Solo Practices', href: '/solo-practice-marketing' },
      { label: 'Group Practices', href: '/group-practice-marketing' },
      { label: 'Psychologists', href: '/psychologist-marketing' },
      { label: 'Christian Counselors', href: '/christian-counseling-marketing' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'How to Fill Your Caseload', href: '/how-to-get-more-therapy-clients' },
      { label: 'Caseload Calculator', href: '/caseload-calculator' },
      { label: 'Compare', href: '/compare' },
      { label: 'Results', href: '/results' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Your Data Is Yours', href: '/your-data' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
    ],
  },
];

// ---------------------------------------------------------------- pricing

export const BUILD_FEE = 1500;

export interface Tier {
  key: 'self-guided' | 'done-for-you' | 'group';
  name: string;
  price: number;
  priceLabel: string;
  priceNote?: string;
  forWho: string;
  promise: string;
  lead?: string;
  features: string[];
  cta: string;
  recommended?: boolean;
}

export const TIERS: Tier[] = [
  {
    key: 'self-guided',
    name: 'Self-Guided',
    price: 149,
    priceLabel: '$149',
    forWho: "Solo counselors and group practices who'd rather run their own marketing.",
    promise: 'The whole system, and you run it.',
    features: [
      'Your new website, hosted and maintained.',
      'The full platform: CRM, instant alerts, automatic replies, caseload meter.',
      'A content plan telling you what to publish next.',
      'Review program tools.',
      'A referral outreach kit.',
      'Ranking tracking for 10 searches.',
    ],
    cta: 'Start with Self-Guided',
  },
  {
    key: 'done-for-you',
    name: 'Done for You',
    price: 800,
    priceLabel: '$800',
    forWho: 'Solo counselors with open spots who want it handled.',
    promise: 'We run the system. You see the clients.',
    lead: 'Everything in Self-Guided, plus:',
    features: [
      '2 articles a month written for you.',
      'Google Business Profile managed.',
      'Local SEO upkeep.',
      'Ranking tracking for 30 searches.',
      'We run your review program.',
      'Referral coaching.',
      'A monthly strategy call with Luke.',
    ],
    cta: 'Start Done for You',
    recommended: true,
  },
  {
    key: 'group',
    name: 'Group Practice',
    price: 1200,
    priceLabel: '$1,200',
    priceNote: '$1,200/mo for 3 to 5 clinicians · $1,500/mo for 6 to 10 · custom quote for 11 or more',
    forWho: "Practices that need every clinician's caseload full.",
    promise: "Every clinician's caseload, filled and tracked.",
    lead: 'Everything in Done for You, plus:',
    features: [
      '4 articles a month.',
      'A page for each clinician and specialty.',
      'A caseload meter for each clinician.',
      'Lead routing.',
      'Intake-team training.',
      'Ranking tracking for 60 searches.',
    ],
    cta: 'Start Group Practice',
  },
];

// Group Practice has two real price points; both become Offers in schema.
export const GROUP_PRICES = [
  { label: '3 to 5 clinicians', price: 1200 },
  { label: '6 to 10 clinicians', price: 1500 },
];

export const ADDONS = [
  {
    name: 'Google Ads Management',
    price: 300,
    priceLabel: '$300/mo',
    unit: 'month',
    text: 'Plus your ad budget, paid directly to Google from your own account. We set up and manage your campaigns and track ad clicks through to booked clients. Cancel anytime.',
  },
  {
    name: 'Referral Network Launch',
    price: 750,
    priceLabel: '$750 one time',
    unit: 'once',
    text: 'We research and verify 20 to 30 local referral partners, personalize your outreach kit, print your practice handouts, send the first wave in your name, and coach you for the in-person conversations.',
  },
  {
    name: 'Referral Follow-Up',
    price: 250,
    priceLabel: '$250/mo',
    unit: 'month',
    text: 'Optional after a Launch. We keep the relationships warm: follow-ups, thank-you notes, and your tracker kept current. You still show up for the coffee.',
  },
] as const;

export const BUILD_INCLUDES = [
  'A custom website built for your specialties and location, fast and mobile-first, with a profile page for each clinician. The build covers up to 10 clinicians; practices with 11 or more get a custom quote.',
  'Full SEO foundation: structured data, sitemap, a page for each specialty, descriptive image text.',
  'A native appointment request form, with no hand-off to a third-party tool.',
  'Your Google Business Profile claimed, fixed, and optimized.',
  'Your domain registered in your name, plus migration from your old site with redirects.',
  'Your platform set up for your practice: dashboard, CRM, caseload meter, automatic reply, review program, referral outreach kit and practice handout, and Google Ads tracking.',
];

export const TIER_MATRIX: { step: string; cells: [string, string, string] }[] = [
  {
    step: 'Get Found',
    cells: [
      'Hosting, security, updates. Search ranking tracking for 10 target searches. A content roadmap telling you what to publish next.',
      'Everything in Self-Guided, plus 2 new articles a month written for you, Google Business Profile managed (posts, photos, Q&A), local SEO and citation upkeep, rank tracking for up to 30 searches.',
      'Everything in Done for You, plus 4 articles a month, a page for each clinician and specialty, rank tracking for up to 60 searches.',
    ],
  },
  {
    step: 'Get Chosen',
    cells: [
      'Ethical review program tools (waiting-room sign, templates, review log).',
      'We run the review program and log your reviews monthly.',
      'Same, practice-wide.',
    ],
  },
  {
    step: 'Get Referred',
    cells: [
      'Referral partner tracker plus outreach kit (personalized emails, notes, printable handout).',
      'Everything in Self-Guided, plus referral outreach coaching in your monthly call.',
      'Coaching for you and your team.',
    ],
  },
  {
    step: 'Get Booked',
    cells: [
      'Instant lead alerts, CRM with follow-up reminders, automatic reply, speed-to-lead tracking.',
      'Same, plus we review your response times monthly.',
      'Same, plus lead routing to the right clinician and intake-team training.',
    ],
  },
  {
    step: 'Watch It Work',
    cells: [
      'Overview dashboard: clients, caseload meter, sources.',
      'Plus a monthly strategy call with Luke, a licensed counselor, walking through your Overview report.',
      'Plus a caseload meter for each clinician.',
    ],
  },
  { step: 'Support', cells: ['Email.', 'Email and a monthly call.', 'Email, a monthly call, and team onboarding.'] },
];

export const DATA_PROMISE =
  'Your data is yours: download it anytime, and it always goes with you. If you leave, you keep your website and domain; the CMC platform (dashboard, CRM, automations) stays with us.';

export const HIPAA_ANSWER =
  "Your clinical records stay in your practice's EHR (SimplePractice, TherapyNotes, and so on). The platform handles inquiries only: the contact details and short note someone sends when they reach out.";

export function money(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

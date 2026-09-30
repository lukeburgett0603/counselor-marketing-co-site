// Compare pages (rebuild/copy/19-compare.md). Every competitor number here
// comes from rebuild/competitors/competitor-data.yaml, with the date it
// was checked. Re-verify on the competitor's own site before changing one.
// Tone rule: name their real strengths, say who they fit, never disparage.

export interface Comparison {
  slug: string;
  name: string;
  title: string;
  metaTitle: string;
  description: string;
  checked: string;
  source: string;
  tldr: string;
  table?: { head: [string, string, string]; rows: [string, string, string][] };
  sections: { h: string; p: string }[];
  theirFit: string;
  ourFit: string;
  extra?: { h: string; p: string };
  // Replaces the standard "prices checked on their site" note when the
  // figure is a market range rather than one company's price list.
  note?: string;
}

export const COMPARISONS: Comparison[] = [
  {
    slug: 'websitetherapy',
    name: 'WebsiteTherapy',
    title: 'Counselor Marketing Co. vs WebsiteTherapy',
    metaTitle: 'Counselor Marketing Co. vs WebsiteTherapy | Honest Comparison',
    description:
      'WebsiteTherapy is an affordable, AI-managed website for therapists. Counselor Marketing Co. is a client-getting system with a CRM, caseload tracking, and referrals. Who each is best for.',
    checked: 'September 28, 2026',
    source: 'websitetherapy.com (pricing, About page, homepage)',
    tldr:
      "WebsiteTherapy gives you an affordable, AI-maintained website that's built to be read by AI search, from $99/mo with no setup fee. Counselor Marketing Co. builds your website and runs the rest of the path to a new client (referrals, fast follow-up, reviews) and shows new clients and caseload in one dashboard. If your caseload is full and you want a better site cheaply, WebsiteTherapy is a good fit. If you have open spots, you likely need more than a website.",
    table: {
      head: ['', 'WebsiteTherapy', 'Counselor Marketing Co.'],
      rows: [
        ['Price', '$99/mo (Growth), $199/mo (Concierge), no setup fee', '$149/mo (Self-Guided), $800/mo (Done for You), from $1,200/mo (Group), plus a $1,500 build'],
        ['Website', 'AI-managed, strong structured data', 'Custom-built, strong structured data'],
        ['AI features', 'AI assistant, 24/7 visitor chat agent, autonomous blogging', 'Content written for AI search; no chatbot'],
        ['Google Business Profile', 'Listings synced', 'Managed (Done for You and Group)'],
        ['Lead CRM and follow-up reminders', 'Not listed', 'Included'],
        ['Rank tracking and reporting', 'Not listed', 'Included'],
        ['New clients and caseload tracking', 'Not listed', 'Included, per counselor'],
        ['Referral partner program', 'Not listed', 'Tracker, outreach kit, coaching'],
        ['Built by', 'A developer (per their About page)', 'A licensed counselor (LPCA, Kentucky)'],
        ['If you leave', 'Data export; site read-only for 90 days', 'Your website files, domain, and all data'],
      ],
    },
    sections: [
      { h: 'Where WebsiteTherapy is strong', p: 'The price, no setup fee, AI features like a 24/7 chat agent, and easy migration. For many practices, that is real value.' },
      {
        h: 'Where the Full Caseload System goes further',
        p: "It's built around filling open spots, not only around the website: referral relationships, fast follow-up, an ethical review program, and a dashboard that shows which clients came from where.",
      },
    ],
    theirFit: 'Practices that are mostly full and want an affordable, well-structured site maintained for them.',
    ourFit: "Practices with open spots, or group practices that need every clinician's caseload full and want to see it happening.",
    extra: { h: 'Switching', p: 'We migrate your content, keep your domain, and set up redirects.' },
  },
  {
    slug: 'therapysites',
    name: 'TherapySites',
    title: 'Counselor Marketing Co. vs TherapySites',
    metaTitle: 'Counselor Marketing Co. vs TherapySites | Honest Comparison',
    description:
      "TherapySites offers therapist websites from $69/mo with add-ons for SEO, reviews, and ads. Here's how that compares with the Full Caseload System, and who each fits.",
    checked: 'September 30, 2026',
    source: 'therapysites.com/pricing',
    tldr:
      'TherapySites is a long-established therapist website platform with live support and online scheduling, starting at $69/mo, with marketing added through higher tiers and add-ons. Counselor Marketing Co. includes the whole client-getting system on every plan and measures it in new clients. TherapySites fits practices that want a supported site and prefer to add marketing piece by piece.',
    table: {
      head: ['', 'TherapySites', 'Counselor Marketing Co.'],
      rows: [
        ['Setup', '$199 one-time design', '$1,500 one-time build (custom site, Google profile, platform setup)'],
        ['Entry plan', 'Core $69/mo', 'Self-Guided $149/mo (full platform included)'],
        ['SEO', 'Advantage $99/mo (SEO 1.0), Premium $158/mo (SEO 2.0)', 'Included on every plan; done for you from $800/mo'],
        ['AI search', 'Premium Plus $207/mo', 'Content written for AI search on every plan'],
        ['Reviews', 'Reputation management from $40/mo', 'Ethical review program included'],
        ['Google Ads', 'From $600/mo', '$300/mo management plus your budget paid directly to Google'],
        ['Scheduling', 'Online appointment scheduling', 'Native appointment request form plus CRM follow-up'],
        ['Lead CRM, caseload tracking, referrals', 'Not listed on their pricing page', 'Included'],
        ['Support', 'Unlimited live support', 'Email, plus a monthly call on Done for You and Group'],
      ],
    },
    sections: [
      { h: 'Where TherapySites is strong', p: 'Longevity, unlimited live support, online scheduling, HIPAA-compliant forms and email (their claim), and a low entry price.' },
      {
        h: 'How the costs compare as you add marketing',
        p: 'A TherapySites practice that adds SEO 2.0, reviews, and Google Ads is at roughly $158 + $40 + $600 = about $800/mo before ad spend, using their listed starting prices. That is in the same range as Done for You, so the real question is what is included, and whether you can see new clients from it.',
      },
    ],
    theirFit: 'Practices that want a supported, affordable site with scheduling, and plan to add marketing gradually.',
    ourFit: "Practices that want the whole system from day one, measured in clients, built around a counselor's ethics code.",
  },
  {
    slug: 'psychology-today',
    name: 'Psychology Today',
    title: 'Before you cancel Psychology Today, read this.',
    metaTitle: 'Is Psychology Today Worth It? Psychology Today vs Your Own Website',
    description:
      "Psychology Today costs $29.95/mo and puts you in a huge directory, next to every other counselor. Here's when it's worth keeping, and what your own website does that it can't.",
    checked: 'September 30, 2026',
    source: 'join.psychologytoday.com/us/signup',
    tldr:
      "For $29.95 a month, Psychology Today is still worth it for many practices, as one channel. What it can't do is make you the only choice: your profile sits beside dozens of others, and you don't own the page. Your own website, Google profile, and referral partners are the channels you own. Keep Psychology Today if it brings clients, and measure it to find out.",
    sections: [
      { h: 'What Psychology Today does well', p: 'A huge audience, strong search presence, easy setup, and no contract.' },
      { h: "What it can't do", p: "Set you apart from the counselors listed next to you, give you a page you own, or show you which listings become clients." },
      {
        h: 'How to decide',
        p: 'Add "How did you hear about us?" to your intake (it\'s built into every CMC site). If Psychology Today brings clients, keep it. If it hasn\'t in months, the $359 a year may do more elsewhere.',
      },
      { h: 'How CMC fits with it', p: "We don't replace your listing. We build the channels you own around it, and track which ones bring clients." },
    ],
    theirFit: 'Nearly every practice, as one channel. It is a complement, not a replacement.',
    ourFit: 'Practices that want channels they own (a website, a Google profile, referral partners) working alongside their listing.',
  },
  {
    slug: 'diy-website-builders',
    name: 'DIY website builders',
    title: 'Counselor Marketing Co. vs DIY website builders',
    metaTitle: 'Squarespace or Wix for Therapists vs a Done-for-You System',
    description: "DIY builders like Squarespace start around $19/mo. Here's what they give a counseling practice, what they leave to you, and when that's the right call.",
    checked: 'September 30, 2026',
    source: 'squarespace.com/pricing',
    tldr:
      "Squarespace (from $19/mo on annual billing) and similar builders give you full control and a good-looking site for very little money. Everything else (writing, search, Google profile, reviews, referrals, follow-up) is yours to do. That's a great fit if you enjoy it and have the time. If you'd rather spend those hours with clients, that's what we do.",
    sections: [],
    theirFit: 'Practices with the time and interest to learn and run their own marketing.',
    ourFit: 'Practices that want the system run for them (Done for You), or want the tools and roadmap without building them (Self-Guided, $149/mo).',
  },
  {
    slug: 'marketing-agencies',
    name: 'General marketing agencies',
    title: 'Counselor Marketing Co. vs general marketing agencies',
    metaTitle: "Therapist Marketing Agency vs a General Agency | What's Different",
    description:
      "General agencies can run good campaigns, but rarely know counseling ethics or measure new clients. Here's how a counselor-built system compares, and when a big agency fits.",
    checked: 'September 30, 2026',
    source: "CMC's market research on agency retainers",
    note: 'Agency prices vary widely. The range here is typical retainer pricing for this niche, not any one agency\'s price list.',
    tldr:
      'A general digital agency (typically about $500 to $5,000+ a month) brings broad skills and a team. What they often lack for a counseling practice is knowledge of your ethics code (testimonials, outcome claims, gifts for referrals, ad tracking) and reporting in clients rather than clicks. Large, multi-location organizations may need a big agency. Most private practices need a system built for them.',
    sections: [],
    theirFit: 'Large organizations with many locations and a big marketing budget.',
    ourFit: 'Private practices, solo or group, that want marketing built around counseling, measured in new clients, month-to-month.',
  },
];

// The "starter plan" half of the audit (v2): for each finding, a one-line
// "What to do" and step-by-step "Show me how"; the links worth getting;
// one "How Counselor Marketing Co. helps" block per step; Watch It Work;
// ready-to-use templates; and the options section. Wording approved by
// Luke on 2026-10-12 (audit-automation/audit-v2-wording.md). Same rules as
// findings.ts: no promised results, no invented statistics, no em-dashes.
import type { AuditData } from './types.ts';
import { specialtyText, type Finding, type StepKey } from './findings.ts';

export interface HowTo {
  todo: string;
  steps: string[];
}

type Platform = 'Squarespace' | 'Wix' | 'WordPress';
const isKnown = (p: string | null | undefined): p is Platform => p === 'Squarespace' || p === 'Wix' || p === 'WordPress';

// Section 9: where to change things, only for builders whose menus are
// stable. Everyone else gets the "ask whoever manages your site" version.
const WHERE: Record<'meta' | 'schema' | 'phone', Record<Platform, string>> = {
  meta: {
    Squarespace: 'In Squarespace: your homepage\u2019s title and description are in the SEO settings panel, under Search appearance, on the Home tab. For other pages, open the Pages panel, click the gear icon next to the page, then the SEO tab.',
    Wix: 'In Wix: open Pages & Menu, click More Actions ("...") next to the page, then SEO basics.',
    WordPress: 'In WordPress: open the page in the editor and use your SEO plugin’s box (Yoast or Rank Math).',
  },
  schema: {
    Squarespace: 'In Squarespace: Squarespace adds some structured data on its own. Fill in your address, phone, and hours under Settings, then Selling, then Business Information, then check the result with the test below. If your business details are still missing, a developer can add a LocalBusiness block.',
    Wix: 'In Wix: open Pages & Menu, click More Actions ("...") next to your homepage, then SEO basics. On the Advanced SEO tab, choose Structured Data Markup, then Add New Markup.',
    WordPress: 'In WordPress: use Rank Math or Yoast Local SEO settings, or ask your developer.',
  },
  phone: {
    Squarespace: 'In Squarespace: highlight the number, add a link, choose the Phone option, and enter your number with its area code.',
    Wix: 'In Wix: add a link to the text and choose "Phone number".',
    WordPress: 'In WordPress: add a link to the number, using tel: and the number.',
  },
};

const A11Y_FIX: Record<string, string> = {
  'color-contrast': 'Hard-to-read text: darken light gray text, or lighten the background, until it’s easy to read in sunlight.',
  'image-alt': 'Images without descriptions: add a short description (alt text) to each image, such as "Counselor’s office with two chairs and a window."',
  label: 'Form fields without labels: give each field a visible label, not just placeholder text inside the box.',
  'target-size': 'Small tap targets: make buttons and links at least the size of a fingertip, with space between them.',
};

export function howTo(f: Finding, d: AuditData): HowTo | null {
  const city = d.practice.city ?? 'your city';
  const main = d.rankings[0];
  const platform = d.site?.platform;
  const where = (k: keyof typeof WHERE) => (isKnown(platform) ? WHERE[k][platform] : null);
  const name = d.practice.name;

  switch (f.id) {
    case 'rank-main':
      if (f.status === 'good') {
        return {
          todo: 'Protect your spot by keeping your Google Business Profile active and adding helpful articles.',
          steps: [
            'Post an update or photo to your Google profile once a month.',
            'Reply to every review with a short, private-information-free thank you.',
            'Add one helpful article every month or two.',
          ],
        };
      }
      return {
        todo: `Make one page on your site clearly about counseling in ${city}, and complete your Google Business Profile.`,
        steps: [
          `Pick the page that should rank for “${main?.keyword ?? `counseling ${city}`}”. Usually that’s your homepage.`,
          `Put the city and what you do in three places: the page title (what shows in Google’s results), the main heading, and the first sentence. For example: "Counseling in ${city} for anxiety, relationships, and life transitions."`,
          'Claim your Google Business Profile at business.google.com if you haven’t. Choose the most specific category that fits (such as Counselor, Psychotherapist, or Mental Health Service). Fill in your hours, services, and a description, and add a few real photos of your office.',
          'Make sure your practice name, address, and phone number are written exactly the same way on your site, your Google profile, and every directory listing.',
          'Earn a few links from local, trusted sites. The "Links that count" section below lists the ones worth getting first.',
        ],
      };
    case 'specialty-pages': {
      if (f.status === 'good') return null;
      const best = [...d.specialties.filter((s) => !s.hasPage)].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
      const label = best?.label ?? 'Your specialty';
      return {
        todo: f.action ?? `Give ${specialtyText(label)} its own page.`,
        steps: [
          `Create a new page named for the specialty and city, for example "${label} Therapy in ${city}".`,
          'Write it for the person reading: what they’re going through, how you help, what the first session is like, and a few common questions. Somewhere between 600 and 1,000 words is plenty.',
          'Give it its own title and description in Google (see the homepage title pattern below).',
          'Link to it from your homepage or your services menu, so Google and visitors can find it.',
          'End it with one clear next step: a button to request an appointment.',
        ],
      };
    }
    case 'schema':
      if (f.status === 'good') return null;
      return {
        todo: 'Add local business structured data to your site.',
        steps: [
          'What it is: a small block of code that tells Google your practice name, address, phone, hours, and website in Google’s own format. Visitors never see it.',
          where('schema') ??
            'Ask whoever manages your site to add "LocalBusiness" structured data (the MedicalBusiness or ProfessionalService type also works) with your name, address, phone, hours, and website.',
          'Then paste your homepage address into Google’s Rich Results Test (search.google.com/test/rich-results) to confirm it reads correctly.',
        ],
      };
    case 'meta':
      return {
        todo: 'Write a homepage title and description that say what you do and where.',
        steps: [
          `Title (about 60 characters): "[What you do] in ${city} | ${name}". For example: "Counseling in ${city} | ${name}".`,
          `Description (about 150 characters): who you help, where, and the next step. For example: "Counseling for anxiety, couples, and families in ${city}. Now accepting new clients. Request an appointment today."`,
          where('meta') ?? 'Where to change it: ask whoever manages your site; it’s usually in each page’s SEO settings.',
        ],
      };
    case 'content':
      if (f.status === 'good') return null;
      return {
        todo: 'Publish one helpful article every month or two.',
        steps: [
          'Write down the questions new clients ask you in the first session, such as "How do I know if I need couples counseling?" Each question is an article.',
          'Answer it plainly, as you would in person, in 800 words or more.',
          'Link the article to the specialty page it relates to, and end it with a gentle invitation to reach out.',
          'Never write about a real client, even with details changed.',
        ],
      };
    case 'directories': {
      const dir = main?.directories?.[0] ?? 'Psychology Today';
      return {
        todo: `Keep your ${dir} profile complete and current.`,
        steps: [
          'Use the same practice name, address, and phone number as your website, add your specialties and a recent photo, and link to your website from the profile.',
        ],
      };
    }
    case 'speed':
      if (f.status === 'good') return null;
      return {
        todo: 'Get your phone load time under 2.5 seconds.',
        steps: [
          'Shrink your images. Most photos can be under 300 KB without looking different. Free tools like squoosh.app do this in seconds.',
          'Remove anything you don’t need: extra apps, plugins, chat widgets, and background videos.',
          'Use one or two fonts, not five.',
          'Test again at pagespeed.web.dev, and aim for under 2.5 seconds on the mobile tab.',
        ],
      };
    case 'voice': {
      if (f.status === 'good') return null;
      const spec = d.specialties[0] ? specialtyText(d.specialties[0].label) : 'anxiety';
      const specs = d.specialties.slice(0, 3).map((s) => specialtyText(s.label));
      return {
        todo: 'Rewrite your homepage’s opening around what your clients are going through.',
        steps: [
          `Make your first headline about them, not you. Instead of "Welcome to ${name}," try something like "You don’t have to carry ${spec} alone."`,
          `In the next sentence, say who you help and where: "Counseling in ${city} for ${specs.length ? specs.join(', ') : 'the people you serve'}."`,
          'Put one clear button right under it: "Request an appointment."',
          'Save your credentials and story for a little further down the page. They matter, but they work best after the reader feels understood.',
        ],
      };
    }
    case 'client-first': {
      if (f.status === 'good' || !d.site) return null;
      const s = d.site;
      const state = d.practice.state ?? 'your state';
      const lines = [
        s.mentionsFees === false && 'Cost: Add a short "Fees and insurance" section: your session fee, the insurance you take (or that you provide superbills), and any sliding scale.',
        s.mentionsNewClients === false && 'New clients: Add one line near the top of your homepage: "Now accepting new clients." Update it when that changes.',
        s.mentionsTelehealth === false && `Online sessions: If you offer them, say so on your homepage and your contact page: "In person in ${city}, or online anywhere in ${state}."`,
        s.credentials && s.credentials.length === 0 && 'Credentials: Add your license after your name on the homepage, such as "[Name], LPC".',
        s.reachable && !s.crisisLine && 'Crisis line: Add this to your footer or contact page: "If you’re in crisis, call or text 988 (Suicide & Crisis Lifeline), or call 911."',
      ].filter(Boolean) as string[];
      return { todo: f.action ?? 'Answer the questions new clients ask first.', steps: lines };
    }
    case 'a11y': {
      if (f.status === 'good') return null;
      const fixes = (d.accessibility?.issues ?? []).map((id) => A11Y_FIX[id]).filter(Boolean).slice(0, 4);
      return {
        todo: 'Fix the accessibility issues Google’s test found.',
        steps: [...fixes, 'Then run Google’s test again at pagespeed.web.dev.'],
      };
    }
    case 'booking': {
      const p = d.site?.bookingPlatform ?? 'your booking system';
      return {
        todo: 'Add a short inquiry form on your own site.',
        steps: [
          `Keep ${p} for scheduling if you like it, but put a short form on your own site first: name, email or phone, and "What would you like help with?" (optional).`,
          `Answer within a business day, then send your ${p} link.`,
        ],
      };
    }
    case 'form':
      return {
        todo: 'Add a short inquiry form on your own site.',
        steps: [
          'Put a short form on your own site: name, email or phone, and "What would you like help with?" (optional).',
          'Answer within a business day.',
        ],
      };
    case 'phone':
      return {
        todo: 'Make your phone number tap-to-call.',
        steps: [where('phone') ?? 'Make the phone number a link using "tel:" and your number, for example tel:5025551234. Most website builders have a "phone" link option.'],
      };
    case 'reply':
      return {
        todo: 'Reply to every inquiry within one business day, ideally within a few hours.',
        steps: [
          'Turn on notifications for new messages on your phone.',
          'Set a time each day to check them.',
          'Use the first-reply template below in "Ready to use", so answering takes two minutes.',
        ],
      };
  }
  return null;
}

// Get Referred's steps (after the partner list).
export const REFERRED_HOWTO: HowTo = {
  todo: 'Choose 10 partners from this list and introduce yourself this month.',
  steps: [
    'Pick 10 local names from the list above: specific people, not organizations.',
    'Send each one a short letter or email (a template is below in "Ready to use").',
    'Follow up two weeks later with a call or a short visit, and bring a one-page handout about your practice.',
    'Keep a simple list of who you contacted, when, and what’s next.',
    'Thank anyone who sends someone your way. Never share anything about the client.',
  ],
};

// ------------------------------------------------------------ links that count

export interface LinkCard {
  name: string;
  why: string | null;
  cost: string;
  steps: string[];
  have: boolean;
}

interface Source {
  key: string;
  name: string;
  domains: RegExp; // how we spot it among their existing links
  category: string;
  cost: string;
  steps: string[];
}

// The reviewed counselor list (same list as the platform's link tracker).
const SOURCES: Source[] = [
  { key: 'chamber', name: '{city} Chamber of Commerce member directory', domains: /chamber|commerce/, category: 'chamber', cost: 'Annual dues (amount varies); about 30 minutes to apply', steps: ['Join, then ask for your listing in the member directory to link to your website.'] },
  { key: 'psychology-today', name: 'Psychology Today', domains: /psychologytoday\.com/, category: 'directory', cost: 'About $30 a month', steps: ['Create or update your profile and add your website link.'] },
  { key: 'state-association', name: 'Your state counseling or psychology association directory', domains: /^$/, category: 'association', cost: 'Usually part of membership', steps: ['Log in to your member profile and add your practice website.'] },
  { key: 'goodtherapy', name: 'GoodTherapy', domains: /goodtherapy\.org/, category: 'directory', cost: 'Monthly fee', steps: ['Create a profile with your website link.'] },
  { key: 'therapyden', name: 'TherapyDen', domains: /therapyden\.com/, category: 'directory', cost: 'Free', steps: ['Create a profile with your website link.'] },
  { key: 'open-path', name: 'Open Path Collective', domains: /openpathcollective\.org/, category: 'directory', cost: 'One-time membership fee', steps: ['Join as a clinician if you offer reduced-fee sessions, and add your website.'] },
  { key: 'nami', name: 'Your local NAMI chapter’s resource list', domains: /nami/, category: 'community', cost: 'Free', steps: ['Email the chapter and ask to be added to their local provider or resource list.'] },
  { key: 'alumni', name: 'Your graduate program’s alumni directory', domains: /^$/, category: 'education', cost: 'Free', steps: ['Update your alumni profile with your practice website.'] },
  { key: 'local-news', name: 'Local news "ask an expert"', domains: /^$/, category: 'media', cost: 'Free', steps: ['Offer to answer a reporter’s question on stress, grief, or relationships. Local outlets often link to the expert’s practice.'] },
  { key: 'talks', name: 'Workshops or talks you give', domains: /^$/, category: 'event', cost: 'Free', steps: ['When a church, school, or library hosts you, ask them to link to your site on the event page.'] },
];

const GAP_COST: Record<string, string> = {
  chamber: 'Annual dues (amount varies); about 30 minutes to apply',
  directory: 'Varies; check the listing options',
  association: 'Usually part of membership',
  community: 'Usually free',
  education: 'Usually free',
};
const GAP_STEPS: Record<string, string[]> = {
  chamber: ['Join, then ask for your listing in the member directory to link to your website.'],
  directory: ['Create or update your profile there and add your website link.'],
  association: ['Join or log in, and add your practice website to your member listing.'],
  community: ['Contact them and ask whether they list local counselors or resources, and whether your practice could be included with a link.'],
  education: ['Contact the department or alumni office and ask about listing your practice, with a link.'],
};

// 5 to 10 cards: what the top practices have that they don't, then the
// reviewed list, with the ones they already have checked off.
export function linkCards(d: AuditData): LinkCard[] {
  const b = d.backlinks;
  const city = d.practice.city ?? 'your city';
  const yours = b?.yours ?? [];
  const has = (re: RegExp) => yours.some((l) => re.test(l.domain));
  const cards: LinkCard[] = [];
  for (const g of (b?.gaps ?? []).slice(0, 5)) {
    cards.push({ name: g.name, why: `${g.leader} is listed here.`, cost: GAP_COST[g.category] ?? 'Varies', steps: GAP_STEPS[g.category] ?? GAP_STEPS.community, have: false });
  }
  const gapChamber = (b?.gaps ?? []).some((g) => g.category === 'chamber');
  for (const s of SOURCES) {
    if (cards.length >= 10) break;
    if (s.key === 'chamber' && gapChamber) continue;
    const have = s.key === 'chamber' ? yours.some((l) => l.category === 'chamber') : has(s.domains) || (d.site?.directoryProfiles ?? []).includes(s.key);
    let why = 'Most counseling practices can get listed here.';
    if (s.key === 'local-news' && b?.press.length) why = `${b.press[0].leader} has been featured in local news.`;
    cards.push({ name: s.name.replace('{city}', city), why, cost: s.cost, steps: s.steps, have });
  }
  // Ones still to get first, then the ones they already have.
  return [...cards.filter((c) => !c.have), ...cards.filter((c) => c.have)].slice(0, 10);
}

// ---------------------------------------------------------------- how CMC helps

export interface Help {
  self: string;
  dfy: string;
  group: string | null;
}

export const HELP: Record<StepKey | 'watch', Help> = {
  found: {
    self: 'Your new site is built for search from day one: a page for each specialty, business information for Google already in place, and fast on phones. Your dashboard tracks your position for 10 searches, a content plan tells you what to write next, a Google Business Profile checklist walks you through your profile, and a link-building tracker turns the list above into a to-do list with steps.',
    dfy: 'Everything in Self-Guided, plus we write 2 articles a month, manage your Google Business Profile, keep your listings consistent, and work through your link list every month for you. We track up to 30 searches and go over your results with you each month.',
    group: '4 articles a month and a page for each clinician.',
  },
  chosen: {
    self: 'We write your new site’s copy for the clients you most want to see, with a clear path to reaching out on every page and a way to contact you always in view. Your dashboard shows which pages bring inquiries.',
    dfy: 'The same, plus we refine your pages each month based on which ones bring inquiries.',
    group: null,
  },
  referred: {
    self: 'A referral partner tracker and an outreach kit: personalized letters, follow-up notes, and a printable handout for your practice.',
    dfy: 'Everything in Self-Guided, plus referral coaching in your monthly call. Want it fully handled? Our Referral Network Launch ($750 one time) researches 20 to 30 local partners and sends the first wave in your name.',
    group: null,
  },
  booked: {
    self: 'An instant alert when someone reaches out, an automatic confirmation to them, a CRM that reminds you who needs a follow-up, and your response time measured.',
    dfy: 'The same, plus we review your response times with you every month.',
    group: 'Inquiries routed to the right clinician, and intake-team training.',
  },
  watch: {
    self: 'One screen that shows new clients this month and where they came from, your caseload meter, anything that needs attention, and a printable monthly report.',
    dfy: 'The same, plus a monthly strategy call with Luke, a licensed counselor, walking through your report.',
    group: 'A caseload meter for each clinician.',
  },
};

// ---------------------------------------------------------------- watch it work

export const WATCH = {
  intro: 'How you’ll know any of this is working.',
  body: 'Most practices can’t say where their last five clients came from. Without that, it’s hard to know what to keep doing and what to stop. You don’t need fancy tools to start.',
  todo: 'Track three numbers every week: new inquiries, how many became first appointments, and where each one heard about you.',
  steps: [
    'Add "How did you hear about us?" to your intake form.',
    'Keep a simple spreadsheet with one row per inquiry: date, where they heard about you, how long it took you to reply, and whether they booked.',
    'Once a month, look at which source brought the most clients and put more time there.',
    'Never record clinical details in this list. It’s for marketing, not treatment.',
  ],
};

// ---------------------------------------------------------------- templates

export function templates(d: AuditData) {
  const name = d.practice.name;
  const city = d.practice.city ?? '[City]';
  const cred = d.site?.credentials?.[0] ?? '[credential]';
  // "an LCSW", "a PhD": by how the first letter is said.
  const aCred = `${/^[AEFHILMNORSX]/.test(cred) ? 'an' : 'a'} ${cred}`;
  return [
    {
      key: 'reply',
      title: 'A first reply to someone who reaches out',
      text: `Hi [their first name],

Thank you for reaching out. I'd be glad to talk with you. I have openings on [day] and [day] for a free 15-minute phone call, where you can ask me anything and we can see if we're a good fit.

Would one of those work for you? If you'd rather, you can also reply with a time that's better.

Warmly,
[Your name], ${cred}
${name} · [phone]

If you're in crisis, please call or text 988, or call 911.`,
      note: 'Never repeat what they told you about why they’re reaching out. Email isn’t private, and they may share an inbox.',
    },
    {
      key: 'voicemail',
      title: 'Your voicemail greeting',
      text: `You've reached [your name] at ${name}. I'm with clients right now, but I return every call within one business day. Please leave your name, your number, and a good time to reach you. If this is an emergency, please hang up and call 911, or call or text 988 for the Suicide & Crisis Lifeline.`,
      note: null,
    },
    {
      key: 'referral',
      title: 'A letter to a referral partner',
      text: `Dear [name],

I'm [your name], ${aCred} at ${name} in ${city}. I work with [who you help, for example adults with anxiety and couples], and I'm currently accepting new clients.

Many of the people you see may benefit from counseling, and I'd like to be someone you can refer to with confidence. I'd welcome the chance to introduce myself over coffee, or to drop off a one-page summary of my practice for your office.

I'll follow up by phone next week. Thank you for the work you do for our community.

[Your name], ${cred}
${name} · [phone] · ${d.practice.url ? d.practice.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '[website]'}`,
      note: null,
    },
  ];
}

// ---------------------------------------------------------------- your options

export function dfyPrice(count: number | null): { price: string; label: string } {
  if (count == null) return { price: '$800 a month for solo practices, or from $1,200 a month for group practices', label: 'Done for You' };
  if (count <= 2) return { price: '$800 a month (solo practices)', label: 'Done for You' };
  if (count <= 5) return { price: '$1,200 a month for 3 to 5 clinicians', label: 'Group Practice' };
  if (count <= 10) return { price: '$1,500 a month for 6 to 10 clinicians', label: 'Group Practice' };
  return { price: 'Custom quote for 11 or more clinicians', label: 'Group Practice' };
}

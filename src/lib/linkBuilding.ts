// Shared vocabulary for the link building tracker (admin/links.astro).
// See 0077_link_building.sql: these lists must match its CHECK
// constraints.
//
// LINK_SUGGESTIONS is the reviewed starting list every counseling
// practice can work through (the same list the instant audit shows).
// Rules for adding to it: a real, legitimate source a counselor can get
// listed on; never a paid link scheme or link network; say plainly what
// it costs.

export const LINK_CATEGORIES = [
  { value: 'chamber', label: 'Chamber / business group' },
  { value: 'directory', label: 'Therapist directory' },
  { value: 'association', label: 'Professional association' },
  { value: 'community', label: 'Community organization' },
  { value: 'media', label: 'Local news / media' },
  { value: 'education', label: 'School / alumni' },
  { value: 'event', label: 'Talk or workshop' },
  { value: 'other', label: 'Other' },
] as const;

export const LINK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'Working on it' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'live', label: 'Live' },
  { value: 'skipped', label: 'Skipped' },
] as const;

export const OWNER_PARTIES = [
  { value: 'practice', label: 'You' },
  { value: 'agency', label: 'Your marketing team' },
] as const;

export interface LinkSuggestion {
  key: string;
  name: string; // may contain {city} / {state}
  category: (typeof LINK_CATEGORIES)[number]['value'];
  cost: string;
  steps: string[];
}

export const LINK_SUGGESTIONS: LinkSuggestion[] = [
  {
    key: 'chamber',
    name: '{city} Chamber of Commerce member directory',
    category: 'chamber',
    cost: 'Annual dues (amount varies); about 30 minutes to apply',
    steps: [
      'Find your local chamber (search "{city} chamber of commerce").',
      'Join as a member.',
      'Ask for your listing in the member directory to include a link to your website.',
    ],
  },
  {
    key: 'psychology-today',
    name: 'Psychology Today profile',
    category: 'directory',
    cost: 'About $30 a month',
    steps: [
      'Create or update your profile at psychologytoday.com.',
      'Use the same practice name, address, and phone number as your website.',
      'Add your website link, your specialties, and a recent photo.',
    ],
  },
  {
    key: 'state-association',
    name: '{state} counseling or psychology association directory',
    category: 'association',
    cost: 'Usually part of membership',
    steps: [
      'Log in to your member profile with your state association.',
      'Add your practice website and keep your details current.',
    ],
  },
  {
    key: 'goodtherapy',
    name: 'GoodTherapy profile',
    category: 'directory',
    cost: 'Monthly fee',
    steps: ['Create a profile at goodtherapy.org.', 'Add your website link and specialties.'],
  },
  {
    key: 'therapyden',
    name: 'TherapyDen profile',
    category: 'directory',
    cost: 'Free',
    steps: ['Create a profile at therapyden.com.', 'Add your website link.'],
  },
  {
    key: 'open-path',
    name: 'Open Path Collective',
    category: 'directory',
    cost: 'One-time membership fee',
    steps: [
      'Only if you offer reduced-fee sessions: join as a clinician at openpathcollective.org.',
      'Add your website to your clinician profile.',
    ],
  },
  {
    key: 'nami',
    name: 'NAMI {city} resource list',
    category: 'community',
    cost: 'Free',
    steps: [
      'Find your local NAMI affiliate at nami.org.',
      'Email them and ask to be added to their local provider or resource list, with a link to your site.',
    ],
  },
  {
    key: 'alumni',
    name: 'Graduate program alumni directory',
    category: 'education',
    cost: 'Free',
    steps: ['Update your alumni profile with your practice and website.'],
  },
  {
    key: 'local-news',
    name: 'Local news "ask an expert"',
    category: 'media',
    cost: 'Free',
    steps: [
      'Email a local reporter or station offering to answer questions on stress, grief, or relationships.',
      'When they quote you, ask them to link to your practice.',
    ],
  },
  {
    key: 'talks',
    name: 'Workshops and talks you give',
    category: 'event',
    cost: 'Free',
    steps: [
      'When a church, school, library, or employer hosts you, ask them to link to your site on the event page.',
    ],
  },
];

export const LINK_RULES = [
  'Never pay for links or join "link networks." Google\'s spam policies forbid them, and they can hurt your rankings.',
  'Use the exact same practice name, address, and phone number everywhere you\'re listed.',
  'A few links from real, local, trusted sites beat dozens from anywhere else.',
  'Links from automated "SEO" sites show up on almost every website. Google ignores them, and so can you.',
];

export function fillPlace(text: string, city: string | null, state: string | null): string {
  return text.replace(/\{city\}/g, city || 'your city').replace(/\{state\}/g, state || 'your state');
}

const CATEGORY_LABELS = new Map<string, string>(LINK_CATEGORIES.map((c) => [c.value, c.label]));
const STATUS_LABELS = new Map<string, string>(LINK_STATUSES.map((s) => [s.value, s.label]));
const OWNER_LABELS = new Map<string, string>(OWNER_PARTIES.map((o) => [o.value, o.label]));
export const linkCategoryLabel = (v: string) => CATEGORY_LABELS.get(v) ?? v;
export const linkStatusLabel = (v: string) => STATUS_LABELS.get(v) ?? v;
export const ownerLabel = (v: string) => OWNER_LABELS.get(v) ?? v;

export type LinkOpportunity = {
  id: string;
  created_at: string;
  name: string;
  category: string;
  website: string | null;
  suggestion_key: string | null;
  status: string;
  owner_party: string;
  next_step_date: string | null;
  cost_note: string | null;
  live_url: string | null;
  live_on: string | null;
  notes: string | null;
};

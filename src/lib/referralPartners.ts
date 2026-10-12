// Shared vocabulary for the referral partner tracker
// (admin/referral-partners.astro) and the Lead CRM's partner link. See
// 0068_referral_partners.sql — these lists must match its CHECK constraints.

export const PARTNER_CATEGORIES = [
  { value: 'physician', label: 'Doctor / primary care' },
  { value: 'pediatrician', label: 'Pediatrician' },
  { value: 'mental_health', label: 'Psychiatrist / other therapist' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'church', label: 'Church / pastor' },
  { value: 'school', label: 'School' },
  { value: 'employer', label: 'Employer / EAP' },
  { value: 'other_professional', label: 'Other professional' },
  { value: 'other', label: 'Other' },
] as const;

export const PARTNER_STATUSES = [
  { value: 'prospect', label: 'Prospect', classes: 'border-slate-300 bg-white text-slate-700' },
  { value: 'contacted', label: 'Contacted', classes: 'border-amber-300 bg-amber-50 text-amber-800' },
  { value: 'meeting', label: 'Meeting set', classes: 'border-sky-300 bg-sky-50 text-sky-800' },
  { value: 'active', label: 'Active partner', classes: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  { value: 'inactive', label: 'Inactive', classes: 'border-slate-200 bg-slate-50 text-slate-500' },
] as const;

export const ACTIVITY_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'visit', label: 'Dropped by' },
  { value: 'meeting', label: 'Meeting / lunch' },
  { value: 'materials', label: 'Sent materials' },
  { value: 'thank_you', label: 'Thank-you note' },
  { value: 'note', label: 'Note' },
] as const;

const CATEGORY_LABELS = new Map<string, string>(PARTNER_CATEGORIES.map((c) => [c.value, c.label]));
const STATUS_LABELS = new Map<string, string>(PARTNER_STATUSES.map((s) => [s.value, s.label]));
const STATUS_CLASSES = new Map<string, string>(PARTNER_STATUSES.map((s) => [s.value, s.classes]));
const ACTIVITY_LABELS = new Map<string, string>(ACTIVITY_TYPES.map((a) => [a.value, a.label]));

export const categoryLabel = (v: string) => CATEGORY_LABELS.get(v) ?? v;
export const partnerStatusLabel = (v: string) => STATUS_LABELS.get(v) ?? v;
export const partnerStatusClasses = (v: string) => STATUS_CLASSES.get(v) ?? STATUS_CLASSES.get('prospect')!;
export const activityLabel = (v: string) => ACTIVITY_LABELS.get(v) ?? v;

export type ReferralPartner = {
  id: string;
  created_at: string;
  name: string;
  category: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: string;
  next_follow_up: string | null;
  notes: string | null;
  archived_at: string | null;
};

export type PartnerActivity = {
  id: string;
  partner_id: string;
  activity_type: string;
  occurred_on: string;
  note: string | null;
  created_at: string;
};

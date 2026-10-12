// CMC-only: CMC's plans and monthly add-ons, for the sales pipeline
// (Inquiries) and the client list (Client directory). Prices match the
// public pricing page (src/lib/site.ts TIERS and ADDONS); keep them in step.
export const PLANS = [
  { value: 'self-guided', label: 'Self-Guided', price: 149 },
  { value: 'done-for-you', label: 'Done for You', price: 800 },
  { value: 'group', label: 'Group Practice', price: 1200 },
  { value: 'other', label: 'Other / custom', price: null },
] as const;

// Recurring add-ons only (the $750 Referral Network Launch is one-time).
export const MONTHLY_ADDONS = [
  { value: 'google-ads', label: 'Google Ads management', price: 300 },
  { value: 'referral-followup', label: 'Referral Follow-Up', price: 250 },
] as const;

export const planLabel = (v: string | null) => PLANS.find((p) => p.value === v)?.label ?? '';
export const money = (n: number) => `$${n.toLocaleString('en-US')}`;
export const addonsTotal = (addons: string[]) =>
  addons.reduce((sum, a) => sum + (MONTHLY_ADDONS.find((x) => x.value === a)?.price ?? 0), 0);

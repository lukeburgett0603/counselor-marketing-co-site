// Shared caseload math for Counselor settings and the Caseload dashboard.
// See 0066_caseload_tracking.sql for why the target caseload is derived
// here rather than stored.

// Caseload is bigger than weekly sessions because some clients come
// biweekly or monthly. A deliberate rule of thumb (client decision,
// 2026-09-28): close enough to be useful, without asking counselors to
// describe their visit-frequency mix.
export const CASELOAD_MULTIPLIER = 1.5;

export const WEEKLY_TARGET_GUIDANCE =
  'Most full-time counselors see 16 to 30 clients a week, and 20 is typical.';

// At or above this share of a full caseload, nudge "Accepting New
// Clients" toward "Almost Full" on Counselor settings.
export const ALMOST_FULL_THRESHOLD = 0.9;

export type CounselorCaseload = {
  counselor_page_id: string;
  weekly_client_target: number | null;
  current_active_clients: number | null;
  updated_at: string;
};

export function targetCaseload(weeklyClientTarget: number | null | undefined): number | null {
  if (!weeklyClientTarget || weeklyClientTarget <= 0) return null;
  return Math.round(weeklyClientTarget * CASELOAD_MULTIPLIER);
}

// Percent full, capped at 100 for bar widths. Over-capacity is still
// reported honestly by callers via openSpots going negative.
export function percentFull(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

// Color bands for a caseload bar: plenty of room / getting close / full.
export function caseloadBarClass(current: number, target: number): string {
  const ratio = target > 0 ? current / target : 0;
  if (ratio >= 1) return 'bg-emerald-600';
  if (ratio >= ALMOST_FULL_THRESHOLD) return 'bg-emerald-500';
  if (ratio >= 0.6) return 'bg-amber-500';
  return 'bg-brand-accent';
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

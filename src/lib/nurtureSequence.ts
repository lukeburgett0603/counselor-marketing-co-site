// The fixed lead-magnet nurture cadence — Day 0 / 3 / 7 / 14 after
// signup, not admin-editable (only each step's subject/body is). Index
// in this array corresponds to `lead_magnet_sequence_steps.step_order`
// (1-based: step_order 1 → SEQUENCE_SCHEDULE_DAYS[0]).
//
// Duplicated (not imported) in supabase/functions/send-nurture-emails —
// Edge Functions are separate Deno deployables that don't share this
// site's build, so that copy has to be kept in sync with this one by
// hand if the cadence ever changes.
export const SEQUENCE_SCHEDULE_DAYS = [0, 3, 7, 14] as const;

-- Instant audit follow-up emails (CMC only): one step of the Full Caseload
-- System per email on days 1, 4, 7, 10 and 14 after the audit was emailed.
-- send-audit-followups sends whatever is due each hour; it stops for an
-- audit when the prospect unsubscribes or their lead reaches a closed
-- status (scheduled, referred, withdrawn).
alter table public.audits
  add column followup_step integer not null default 0,
  add column followup_last_sent_at timestamptz,
  add column unsubscribed_at timestamptz;

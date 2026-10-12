-- Automatic reply to new leads: the "Get Booked" step of the Full
-- Caseload System. The moment someone submits the contact form, they get a
-- short confirmation email with what happens next (reusing
-- business.lead_response_time_note) and, for counseling practices, crisis
-- resources. Built by supabase/functions/_shared/leadAutoReply.ts, sent by
-- submit-lead, previewed/tested from Website content -> Business info.
--
-- Off by default: a practice turns it on deliberately after previewing it.
-- Deliberately NOT counted as first contact (leads.first_contacted_at):
-- speed to lead measures a real person following up, not an automated
-- email.

alter table business add column lead_auto_reply_enabled boolean not null default false;
-- Optional practice-written paragraph(s) placed after the opening line.
alter table business add column lead_auto_reply_message text
  check (lead_auto_reply_message is null or char_length(lead_auto_reply_message) <= 800);

-- When the reply was actually accepted by the email provider. Null means
-- not sent (feature off, no email address, or the send failed), shown in
-- the Lead CRM so the practice knows what the lead already received.
alter table leads add column auto_reply_sent_at timestamptz;

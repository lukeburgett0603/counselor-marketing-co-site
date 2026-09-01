-- Lead CRM: archive and delete, both CRM-only actions (Leads and
-- analytics has no delete/archive UI and never will — see CLAUDE.md).
--
-- Archive is a soft-hide: an archived lead disappears from the CRM's
-- default working list (there's a "Show archived" filter to bring it
-- back, and to unarchive) but keeps counting toward every stat on Leads
-- and analytics — that page has no archived-awareness at all, by design,
-- so an archived lead's row simply stays exactly as it was.
--
-- Delete is a real, hard delete — this is what actually reduces the
-- Leads and analytics numbers, since that page just counts whatever
-- rows exist in `leads`. `lead_notes.lead_id` already cascades (see
-- 0017_lead_crm.sql), so a lead's notes are removed with it.
alter table leads add column archived_at timestamptz;

-- No delete policy existed on `leads` before now — nothing needed one.
create policy "admin can delete leads" on leads
  for delete using (is_owner() or is_agency());

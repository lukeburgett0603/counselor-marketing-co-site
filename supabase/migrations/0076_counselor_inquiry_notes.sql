-- Phase 3 "My inquiries" (2026-10-06): a linked counselor works their own
-- inquiries in the CRM, which includes the notes on them ("left a
-- voicemail", what the front desk learned at intake). Read and add only,
-- and only on leads assigned to their counselor page (same scope as 0073).
-- Notes stay append-only for everyone, as in 0017.

create policy "linked counselor can read notes on assigned leads" on lead_notes
  for select using (
    exists (
      select 1 from leads
      where leads.id = lead_notes.lead_id
        and leads.assigned_counselor_page_id is not null
        and leads.assigned_counselor_page_id = linked_counselor_page_id()
    )
  );

create policy "linked counselor can add notes to assigned leads" on lead_notes
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from leads
      where leads.id = lead_notes.lead_id
        and leads.assigned_counselor_page_id is not null
        and leads.assigned_counselor_page_id = linked_counselor_page_id()
    )
  );

-- `leads.status` used to be a generic 'new'/'contacted'/'closed' — every
-- real client this template has served so far is a counseling/mental-
-- health practice (see CLAUDE.md's `show_crisis_resources` reasoning for
-- the same observation), and "closed" was too vague to be useful in
-- practice: it collapsed "got scheduled" (a win), "referred out" (not a
-- fit here, but not a loss), and "decided against counseling" (a real,
-- distinct outcome worth tracking on its own) into one bucket. Splits
-- 'closed' into three specific outcomes instead:
--   - scheduled: the lead booked an appointment — the funnel's real "won"
--     state.
--   - referred: not a fit for this practice, sent elsewhere — neither a
--     win nor a loss, worth tracking separately from both.
--   - withdrawn: the lead decided they no longer want counseling
--     services — their own decision, not the practice declining them
--     (hence "withdrawn," not "declined," which reads ambiguously about
--     whose decision it was).
-- No existing lead ever had status = 'closed' on this client's project
-- at the time this was written (confirmed via a live query before
-- writing this migration) — if a future client's project does, remap
-- those rows to whichever of the three new values is accurate for each
-- one BEFORE running this, since the new constraint would otherwise
-- reject them outright.
alter table leads drop constraint leads_status_check;
alter table leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'scheduled', 'referred', 'withdrawn'));

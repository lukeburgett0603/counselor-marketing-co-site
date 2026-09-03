-- Multi-provider lead routing — "Select a Counselor" + "Help me choose" on
-- the lead form. Opt-in per business (matches collect_website_in_leads'
-- pattern exactly), since a solo-practice or non-counseling client has no
-- one to select. The counselor list itself is never hand-curated anywhere
-- — LeadGenerator derives it live from whichever pages currently have
-- page_type = 'Counselor Profile', the same self-maintaining-list
-- discipline already applied to Services Overview/Who We Serve/Service
-- Areas Overview: add a new counselor's profile page and they show up in
-- the dropdown automatically, remove one and they disappear, nothing else
-- to update. First requested for Freedom Counseling Services (5 counselors,
-- a real "Select a Counselor" / "Help me choose" pattern already live on
-- their previous Wix site) — made a standard template feature for every
-- future group-practice client, not a one-off.
alter table business add column collect_counselor_preference boolean not null default false;

-- References a Counselor Profile page row, not a free-text name, so a
-- counselor rename/removal is reflected automatically instead of leaving
-- stale text on old leads. Nullable — "Help me choose" (no preference) is
-- a normal, expected answer, not a missing one.
alter table leads add column preferred_counselor_page_id uuid references pages(id) on delete set null;

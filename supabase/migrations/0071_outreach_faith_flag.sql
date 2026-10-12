-- Referral partner outreach kit (admin/referral-partners.astro,
-- src/lib/outreachKit.ts). One practice-level fact the kit needs: whether
-- the practice offers faith-integrated counseling, which adds a line to
-- church outreach and the printable practice handout. A real business fact
-- rather than a per-message toggle, so it's set once and every template
-- stays consistent. Default false: never claim faith integration for a
-- practice that hasn't said so.

alter table business add column offers_faith_integration boolean not null default false;

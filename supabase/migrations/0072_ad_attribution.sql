-- Google Ads conversion tracking (the paid half of "Get Found"). See
-- src/lib/adAttribution.ts for the full privacy design.
--
-- 1. Attribution on leads: the Google click ID (gclid, or gbraid/wbraid on
--    iOS) and UTM tags from the visitor's landing URL, plus the page they
--    landed on. Captured first-party in the visitor's browser and attached
--    at form submit; the site sends nothing to Google. Shows the practice
--    which campaigns and keywords produce leads and clients.
-- 2. Conversion action names for the manual Google Ads CSV upload (Lead
--    CRM). They must match the practice's Google Ads conversion actions
--    exactly, so they're stored rather than retyped. Two separate events:
--      - appointment requests: website activity (a form submission), the
--        default and lower-sensitivity export;
--      - booked appointments: derived from the practice's own client
--        records (status = scheduled). Many practices treat that as
--        protected health information, and Google doesn't sign BAAs, so
--        the admin UI warns before this export.
--    Neutral defaults that don't describe any health condition.

alter table leads add column gclid text;
alter table leads add column gbraid text;
alter table leads add column wbraid text;
alter table leads add column utm_source text;
alter table leads add column utm_medium text;
alter table leads add column utm_campaign text;
alter table leads add column utm_term text;
alter table leads add column utm_content text;
alter table leads add column landing_page text;

alter table business add column ads_request_conversion_name text not null default 'Appointment request';
alter table business add column ads_booked_conversion_name text not null default 'Booked appointment';

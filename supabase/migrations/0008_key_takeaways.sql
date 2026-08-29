-- A short "key takeaways" summary card, rendered before a hub page's main
-- content (ContentPillar.astro) — same rationale as plan_steps/faqs: real,
-- genuine takeaways the article actually covers, pulled into structured
-- data instead of the reader having to infer them from the full article.
-- Array of short strings, not objects — simpler than plan_steps/faqs since
-- there's no secondary field per item. Never invent takeaways the article
-- doesn't actually support.
alter table pages add column key_takeaways jsonb not null default '[]';

-- Structured FAQ content (`[{question, answer}]`), same rationale as
-- 0004_plan_steps.sql: pulled out of flowing `copy` markdown into real data
-- so the frontend can render it as a distinct, semantic Q&A block instead of
-- bolded-question paragraphs buried in prose, and so the same data can drive
-- FAQPage JSON-LD without re-parsing markdown. Per
-- frontend-site-builder-supabase's schema-markup.md rule 6: only ever
-- populate this with genuine, visible Q&A content already on the page —
-- never invented questions used purely to trigger the schema.
alter table pages add column faqs jsonb not null default '[]';

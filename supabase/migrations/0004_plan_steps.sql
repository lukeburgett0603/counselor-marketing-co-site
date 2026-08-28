-- Structured Plan steps (the StoryBrand "3-4 simple steps" part), pulled out
-- of the flowing `copy` markdown into real data so the frontend can render
-- them as a distinct card grid instead of a plain numbered list buried in
-- prose. webpage-copywriter's brandscript already has this as its own
-- structured "Plan" part — this column just gives Content Sync somewhere
-- real to put it instead of only ever writing it into copy as text.
alter table pages add column plan_steps jsonb not null default '[]';

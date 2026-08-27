-- Added after the first real content pass revealed that `purpose` (an
-- internal planning note) was being incorrectly reused as the visitor-facing
-- Hero sub-headline. See pages.purpose's comment in 0001_init.sql.
alter table pages add column hero_subhead text;

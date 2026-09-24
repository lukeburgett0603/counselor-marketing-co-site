-- Real bug found while verifying the new "Suggest an edit" block on
-- Counselor Profile's CTA subheading (0055): the content_suggestions
-- INSERT/SELECT policies (0012_multi_user_roles.sql) were narrowed to
-- `is_owner()` when multi-user roles landed, months before the
-- linked-counselor feature existed — nobody ever came back to extend
-- them once a `staff` login could reach a locked field. A linked
-- counselor clicking "Suggest an edit" and submitting has silently
-- failed with an RLS error this entire time; this was never caught
-- because no prior verification pass actually clicked "Submit
-- suggestion" as a linked-counselor session, only confirmed the field
-- itself was locked.
--
-- Extends both policies with a page-scoped linked-counselor branch,
-- mirroring the exact same "role = 'staff' and status = 'active' and
-- linked_counselor_page_id = <this row's page>" check used everywhere
-- else this feature enforces the boundary (enforce_content_permission,
-- the "linked counselor can update own page" pages policy) — a linked
-- counselor may only ever submit or read a suggestion for their own
-- page, never an arbitrary one.
drop policy "owner can submit content suggestions" on content_suggestions;
create policy "owner or linked counselor can submit content suggestions" on content_suggestions
  for insert
  with check (
    is_owner()
    or exists (
      select 1 from admin_users
      where id = auth.uid() and role = 'staff' and status = 'active' and linked_counselor_page_id = page_id
    )
  );

drop policy "owner can read own content suggestions" on content_suggestions;
create policy "owner or linked counselor can read own content suggestions" on content_suggestions
  for select
  using (
    auth.uid() = submitted_by
    and (
      is_owner()
      or exists (
        select 1 from admin_users
        where id = auth.uid() and role = 'staff' and status = 'active' and linked_counselor_page_id = page_id
      )
    )
  );

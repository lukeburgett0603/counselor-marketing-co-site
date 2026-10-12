-- Supabase grants EXECUTE on new functions to `anon` by default, so
-- "revoke ... from public" in 0074 didn't stop signed-out callers from
-- reaching set_admin_user_name (it refused them, but its error revealed
-- whether a team member id exists). The helpers from 0073/0074 have no
-- use outside a signed-in session either.
revoke execute on function set_admin_user_name(uuid, text) from anon;
revoke execute on function linked_counselor_page_id() from anon;
revoke execute on function caseload_page_for(uuid) from anon;

// Shared login/session wiring for every /admin/* page — extracted so
// leads.astro's original auth flow (login, invited-user password setup,
// logout) doesn't get duplicated across leads, blog, content, and (Phase
// 5) team. Each admin page still checks its own session independently on
// load (no client-side router to share state through), but Supabase
// persists the session in localStorage, so logging in once on any
// /admin/* page keeps you logged in when navigating to another.
import { supabase } from './supabase';
import { withBase } from './url';

export { supabase };

export interface AdminUser {
  id: string;
  email: string;
  // 'owner' is the client's own business owner. 'staff' is scoped to
  // blog posts only. 'agency' is the agency's own super-admin access to
  // this site — a distinct identity from 'owner', not just another
  // instance of it, seeded directly (not through the normal invite flow
  // a client would use) and exempt from the content-permission lock
  // (see the enforce_content_permission trigger).
  role: 'owner' | 'staff' | 'agency';
  status: 'pending' | 'active';
}

const ROLE_NAV_ACCESS: Record<AdminUser['role'], string[]> = {
  owner: ['leads', 'crm', 'blog', 'content', 'lead-magnets', 'team'],
  staff: ['blog'],
  agency: ['leads', 'crm', 'blog', 'content', 'lead-magnets', 'suggestions', 'team'],
};

interface InitAdminAuthOptions {
  // Set on any page that only some roles should ever see (leads, content,
  // team are owner+agency; suggestions is agency-only) — a login whose
  // role isn't listed gets redirected to /admin/blog rather than shown a
  // page whose data RLS would mostly hide from them anyway. Blog, being
  // usable by every role, omits this.
  allowedRoles?: AdminUser['role'][];
}

// Standard element ids every admin page's markup provides (see
// AdminLayout.astro) — kept as plain getElementById lookups, not a
// component prop, since this runs in a page's own <script> after
// AdminLayout has already rendered the DOM.
export function initAdminAuth(
  onAuthed: (adminUser: AdminUser) => void | Promise<void>,
  options: InitAdminAuthOptions = {}
) {
  const loginView = document.getElementById('login-view')!;
  const setPasswordView = document.getElementById('set-password-view')!;
  const noAccessView = document.getElementById('no-access-view')!;
  const adminContent = document.getElementById('admin-content')!;
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const setPasswordForm = document.getElementById('set-password-form') as HTMLFormElement;
  const loginStatus = document.getElementById('login-status')!;
  const setPasswordStatus = document.getElementById('set-password-status')!;
  const logoutButton = document.getElementById('logout-button');
  const noAccessLogoutButton = document.getElementById('no-access-logout-button');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordForm = document.getElementById('forgot-password-form') as HTMLFormElement | null;
  const forgotPasswordStatus = document.getElementById('forgot-password-status');

  // Inline style, not classList — see the comment on #admin-content in
  // AdminLayout.astro for why toggling Tailwind's `hidden` class doesn't
  // reliably work here (a responsive display utility like `md:flex` can
  // silently override it). Setting `display = ''` removes the inline
  // override entirely, letting each element's own CSS-class-defined
  // display (block, or `md:flex` at desktop) apply normally.
  function hideAllViews() {
    loginView.style.display = 'none';
    setPasswordView.style.display = 'none';
    noAccessView.style.display = 'none';
    adminContent.style.display = 'none';
  }

  async function resolveAdminUser(): Promise<AdminUser | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const { data } = await supabase.from('admin_users').select('*').eq('id', userData.user.id).maybeSingle();
    return (data as AdminUser | null) ?? null;
  }

  // Every /admin/* page's sidebar nav item carries data-nav-key (see
  // AdminLayout.astro) — hide the ones this role can't use rather than
  // relying on the RLS-rejected-write UX alone for "you can't do this."
  function applyNavAccess(role: AdminUser['role']) {
    const allowed = ROLE_NAV_ACCESS[role];
    document.querySelectorAll<HTMLElement>('[data-nav-key]').forEach((el) => {
      el.classList.toggle('hidden', !allowed.includes(el.dataset.navKey!));
    });
  }

  // "Check when you log in" is the whole notification strategy for
  // Phase 6 (no email/Slack alert, deliberately deferred) — a pending
  // count badge on the Suggestions nav item is what makes that work
  // instead of the agency having to remember to click in and check.
  async function updateSuggestionsBadge() {
    const badge = document.querySelector<HTMLElement>('[data-suggestions-badge]');
    if (!badge) return;
    const { count } = await supabase
      .from('content_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (count && count > 0) {
      badge.textContent = String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function showLoginState() {
    hideAllViews();
    loginView.style.display = '';
  }

  function showSetPasswordState() {
    hideAllViews();
    setPasswordView.style.display = '';
  }

  function showNoAccessState() {
    hideAllViews();
    noAccessView.style.display = '';
  }

  async function tryShowAuthed() {
    const adminUser = await resolveAdminUser();
    if (!adminUser || adminUser.status !== 'active') {
      showNoAccessState();
      return;
    }
    if (options.allowedRoles && !options.allowedRoles.includes(adminUser.role)) {
      window.location.href = withBase('/admin/blog');
      return;
    }
    hideAllViews();
    adminContent.style.display = '';
    applyNavAccess(adminUser.role);
    if (adminUser.role === 'agency') {
      updateSuggestionsBadge();
    }
    await onAuthed(adminUser);
  }

  // An invite/recovery email link lands here with `type=invite` or
  // `type=recovery` in the URL hash. supabase-js (detectSessionInUrl, on
  // by default) parses that automatically and establishes a session — but
  // the person still needs to actually set a password, since an invited
  // user doesn't have one yet.
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const isPasswordSetupLink = ['invite', 'recovery'].includes(hashParams.get('type') ?? '');

  supabase.auth.getSession().then(({ data }) => {
    if (isPasswordSetupLink && data.session) {
      showSetPasswordState();
    } else if (data.session) {
      tryShowAuthed();
    } else {
      showLoginState();
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginStatus.textContent = '';
    const formData = new FormData(loginForm);
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });
    if (error) {
      loginStatus.textContent = error.message;
      return;
    }
    await tryShowAuthed();
  });

  setPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setPasswordStatus.textContent = '';
    const formData = new FormData(setPasswordForm);
    const { error } = await supabase.auth.updateUser({
      password: formData.get('password') as string,
    });
    if (error) {
      setPasswordStatus.textContent = error.message;
      return;
    }
    // Flip this invited user's own admin_users row from pending to
    // active — the only client-reachable UPDATE path onto admin_users
    // (see 0012_multi_user_roles.sql's "user can activate own admin_users
    // row" policy + the trigger that restricts it to exactly this
    // transition). A brand-new user's row already exists at this point —
    // the invite Edge Function inserted it (status 'pending') at invite
    // time, using the same auth user id this session now belongs to.
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from('admin_users').update({ status: 'active' }).eq('id', userData.user.id);
    }
    history.replaceState(null, '', window.location.pathname);
    await tryShowAuthed();
  });

  // A real self-service "Forgot password?" flow — this is also the fix
  // for the recovery-link-lands-on-a-404 class of bug: rather than
  // depending on the Supabase dashboard's "Site URL" setting (which has
  // no connection to the actual code and silently goes stale whenever a
  // route changes — see CLAUDE.md), this tells Supabase explicitly where
  // to send the link, computed via withBase() the same way every other
  // link in the app is, so it's always correct.
  forgotPasswordLink?.addEventListener('click', () => {
    forgotPasswordForm?.classList.toggle('hidden');
  });

  forgotPasswordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (forgotPasswordStatus) forgotPasswordStatus.textContent = '';
    const formData = new FormData(forgotPasswordForm);
    const { error } = await supabase.auth.resetPasswordForEmail(formData.get('email') as string, {
      redirectTo: window.location.origin + withBase('/admin/leads'),
    });
    if (!forgotPasswordStatus) return;
    forgotPasswordStatus.textContent = error
      ? error.message
      : 'If an account exists for that email, a reset link is on its way.';
    forgotPasswordStatus.className = 'text-center text-sm ' + (error ? 'text-red-600' : 'text-emerald-700');
  });

  logoutButton?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showLoginState();
  });

  noAccessLogoutButton?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showLoginState();
  });
}

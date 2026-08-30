// Shared login/session wiring for every /admin/* page — extracted so
// leads.astro's original auth flow (login, invited-user password setup,
// logout) doesn't get duplicated across leads, blog, and (Phase 4)
// website content. Each admin page still checks its own session
// independently on load (no client-side router to share state through),
// but Supabase persists the session in localStorage, so logging in once
// on any /admin/* page keeps you logged in when navigating to another.
import { supabase } from './supabase';

export { supabase };

// Standard element ids every admin page's markup provides (see
// AdminLayout.astro) — kept as plain getElementById lookups, not a
// component prop, since this runs in a page's own <script> after
// AdminLayout has already rendered the DOM.
export function initAdminAuth(onAuthed: () => void | Promise<void>) {
  const loginView = document.getElementById('login-view')!;
  const setPasswordView = document.getElementById('set-password-view')!;
  const adminContent = document.getElementById('admin-content')!;
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const setPasswordForm = document.getElementById('set-password-form') as HTMLFormElement;
  const loginStatus = document.getElementById('login-status')!;
  const setPasswordStatus = document.getElementById('set-password-status')!;
  const logoutButton = document.getElementById('logout-button');

  // Inline style, not classList — see the comment on #admin-content in
  // AdminLayout.astro for why toggling Tailwind's `hidden` class doesn't
  // reliably work here (a responsive display utility like `md:flex` can
  // silently override it). Setting `display = ''` removes the inline
  // override entirely, letting each element's own CSS-class-defined
  // display (block, or `md:flex` at desktop) apply normally.
  function hideAllViews() {
    loginView.style.display = 'none';
    setPasswordView.style.display = 'none';
    adminContent.style.display = 'none';
  }

  async function showAuthedState() {
    hideAllViews();
    adminContent.style.display = '';
    await onAuthed();
  }

  function showLoginState() {
    hideAllViews();
    loginView.style.display = '';
  }

  function showSetPasswordState() {
    hideAllViews();
    setPasswordView.style.display = '';
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
      showAuthedState();
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
    await showAuthedState();
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
    history.replaceState(null, '', window.location.pathname);
    await showAuthedState();
  });

  logoutButton?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showLoginState();
  });
}

// Cloudflare Turnstile, loaded only when a visitor is about to need it.
//
// Loading api.js on page load used to render every .cf-turnstile widget
// immediately, and each widget pulls ~700 KB of challenge files. A homepage
// with three lead forms downloaded ~2.2 MB of them during first paint, which
// on a throttled phone pushed the hero image's Largest Contentful Paint from
// ~2s to 15s+ (PageSpeed mobile, 2026-10-12). Now the script loads on the
// first interaction with any form that has a widget, or a few seconds after
// the page has finished loading, whichever comes first. The script still
// auto-renders every .cf-turnstile element once it arrives, so it only
// needs loading once per page; shared by LeadGenerator and LeadMagnet.

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const IDLE_DELAY_MS = 4000;

let requested = false;

function loadScript() {
  if (requested || document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
  requested = true;
  const script = document.createElement('script');
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export function loadTurnstileWhenNeeded() {
  const widgets = document.querySelectorAll('.cf-turnstile');
  if (widgets.length === 0) return;

  widgets.forEach((widget) => {
    const form = widget.closest('form');
    if (!form) return;
    for (const type of ['focusin', 'pointerdown']) {
      form.addEventListener(type, loadScript, { once: true, passive: true });
    }
  });

  const startIdleTimer = () => setTimeout(loadScript, IDLE_DELAY_MS);
  if (document.readyState === 'complete') startIdleTimer();
  else window.addEventListener('load', startIdleTimer, { once: true });
}

const RESET_AFTER_MS = 6000;

// A fast visitor can submit before the widget has produced its token.
// Wait for Cloudflare's hidden input to fill (up to timeoutMs) instead of
// sending an empty token that submit-lead would reject. With several
// widgets on one page, one occasionally stalls without ever issuing a
// token (seen live on Freedom's homepage, 2026-10-12); resetting it once
// fixes that, so do it automatically if nothing has arrived after 6s.
export async function waitForTurnstileToken(form: HTMLFormElement, timeoutMs = 20000): Promise<string | null> {
  if (!form.querySelector('.cf-turnstile')) return null;
  loadScript();
  const started = Date.now();
  let didReset = false;
  while (Date.now() - started < timeoutMs) {
    const input = form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
    if (input?.value) return input.value;
    const turnstile = (window as unknown as { turnstile?: { reset: (id: string) => void } }).turnstile;
    if (!didReset && input?.id && turnstile && Date.now() - started > RESET_AFTER_MS) {
      didReset = true;
      try {
        turnstile.reset(input.id.replace(/_response$/, ''));
      } catch {
        // Widget not resettable; keep waiting for the timeout.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

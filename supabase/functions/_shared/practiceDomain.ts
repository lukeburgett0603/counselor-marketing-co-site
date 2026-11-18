// CMC-ONLY (keep when syncing): the key that groups people from the same
// practice (CRM phase 4, migration 0106). A practice's website wins; else
// the domain of a work email. Personal mail (Gmail, Yahoo...) never
// groups anyone, since thousands of unrelated people share it.

const PERSONAL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'comcast.net', 'att.net',
  'sbcglobal.net', 'verizon.net', 'bellsouth.net', 'cox.net', 'charter.net', 'earthlink.net', 'gmx.com', 'mail.com',
  // Throwaway inboxes.
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'sharklasers.com', 'temp-mail.org', '10minutemail.com',
]);

export function domainFromUrl(input: string | null | undefined): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') ? host : null;
  } catch {
    return null;
  }
}

export function domainFromEmail(email: string | null | undefined): string | null {
  const d = String(email ?? '').trim().toLowerCase().split('@')[1];
  return d && d.includes('.') && !PERSONAL.has(d) ? d : null;
}

export const practiceDomain = (website: string | null | undefined, email: string | null | undefined) =>
  domainFromUrl(website) ?? domainFromEmail(email);

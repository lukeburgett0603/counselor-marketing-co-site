// One look for every email this site sends through Resend (Luke,
// 2026-11-08): the site's own colors and wordmark, a white card on the
// page gray, one accent button, a signature, and a quiet footer. Two
// kinds share it:
//   - letters (to prospects and clients): wordmark, body, optional
//     button, signature, footer with why they got it.
//   - notices (to Luke or the team): the same frame plus a small label
//     and a facts table.
// Email clients only honor inline styles and tables, so everything here
// is inline; the <style> block only adds phone sizing and dark mode for
// the clients that support it (Apple Mail, iOS, some Outlook). Colors
// match src/styles/site.css.
//
// Generic on purpose: the brand comes in as a parameter (`brand.ts` holds
// CMC's), so the template can reuse this file with each practice's own.

export type Brand = {
  name: string; // "Therapy Marketing Co."; the last word gets the accent
  siteUrl: string; // https://www.therapymarketingco.com/
  accent: string; // button and wordmark accent
};

export type EmailParts = {
  brand: Brand;
  preheader?: string; // inbox preview text
  label?: string; // notices only: "New inquiry", "Audit opened"
  paragraphs?: string[]; // HTML, already escaped
  bodyHtml?: string; // ready-made HTML blocks (e.g. admin-written <p>s), placed after paragraphs
  facts?: [string, string | null | undefined][]; // notices: label, value (escaped here)
  button?: { text: string; url: string };
  after?: string[]; // HTML paragraphs below the button
  signature?: { name: string; title?: string } | null;
  footer?: string[]; // HTML lines: why they got it, unsubscribe, address
};

const INK = '#18181b';
const MUTED = '#52525b';
const FAINT = '#71717a';
const LINE = '#e4e4e7';
const PAGE = '#fafafa';
const FONT = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function wordmark(brand: Brand): string {
  const words = brand.name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop()! : '';
  return `<a href="${brand.siteUrl}" style="color:${INK};text-decoration:none;font-weight:700;font-size:18px;letter-spacing:-0.02em;" class="em-ink">${escapeHtml(words.join(' '))}${last ? ` <span style="color:${brand.accent};" class="em-accent">${escapeHtml(last)}</span>` : ''}</a>`;
}

function button(b: { text: string; url: string }, accent: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;">
<tr><td style="border-radius:8px;background:${accent};" class="em-btn">
<a href="${b.url}" style="display:inline-block;padding:13px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(b.text)}</a>
</td></tr></table>`;
}

function factsTable(rows: [string, string | null | undefined][]): string {
  const shown = rows.filter(([, v]) => v != null && String(v).trim() !== '');
  if (!shown.length) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px;border-top:1px solid ${LINE};" class="em-line">
${shown
  .map(
    ([k, v]) => `<tr>
<td valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid ${LINE};font-size:13px;color:${FAINT};width:34%;" class="em-line em-muted">${escapeHtml(k)}</td>
<td valign="top" style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:15px;color:${INK};white-space:pre-wrap;word-break:break-word;" class="em-line em-ink">${escapeHtml(String(v))}</td>
</tr>`
  )
  .join('\n')}
</table>`;
}

const para = (html: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK};" class="em-ink">${html}</p>`;

export function renderEmail(e: EmailParts): string {
  const { brand } = e;
  const body = [
    e.label
      ? `<p style="margin:0 0 14px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#e9eefc;color:#1c39b0;font-size:12px;font-weight:600;letter-spacing:0.02em;" class="em-label">${escapeHtml(e.label)}</span></p>`
      : '',
    ...(e.paragraphs ?? []).map(para),
    e.bodyHtml ? `<div style="font-size:16px;line-height:1.6;color:${INK};" class="em-ink em-body">${e.bodyHtml}</div>` : '',
    e.facts ? factsTable(e.facts) : '',
    e.button ? button(e.button, brand.accent) : '',
    ...(e.after ?? []).map(para),
    e.signature
      ? `<p style="margin:22px 0 0;font-size:16px;line-height:1.5;color:${INK};" class="em-ink">${escapeHtml(e.signature.name)}${
          e.signature.title ? `<br><span style="font-size:14px;color:${MUTED};" class="em-muted">${escapeHtml(e.signature.title)}</span>` : ''
        }</p>`
      : '',
  ].join('\n');

  const footer = (e.footer ?? [])
    .map((l) => `<p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${FAINT};" class="em-muted">${l}</p>`)
    .join('\n');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  a { color: ${brand.accent}; }
  .em-body p { margin: 0 0 16px; }
  @media (max-width: 620px) { .em-card { padding: 28px 22px !important; } }
  @media (prefers-color-scheme: dark) {
    .em-page { background: #0c0c0e !important; }
    .em-card { background: #151518 !important; border-color: #27272a !important; }
    .em-ink { color: #f4f4f5 !important; }
    .em-muted { color: #a1a1aa !important; }
    .em-line { border-color: #27272a !important; }
    .em-accent { color: #7390ff !important; }
    .em-label { background: #172150 !important; color: #b9c6ff !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE};" class="em-page">
${e.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(e.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE};" class="em-page">
<tr><td align="center" style="padding:32px 16px;font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 4px 18px;font-family:${FONT};">${wordmark(brand)}</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:12px;padding:36px 36px 30px;font-family:${FONT};" class="em-card">
${body}
</td></tr>
${footer ? `<tr><td style="padding:18px 4px 0;font-family:${FONT};">${footer}</td></tr>` : ''}
</table>
</td></tr></table>
</body></html>`;
}

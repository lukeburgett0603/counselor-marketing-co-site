// Renders an audit report to HTML in the browser (the page is static; the
// data arrives at view time). Everything that came from the prospect or
// their website is escaped. Icons are Phosphor SVGs the page pre-renders
// at build time and hands in by name.
import type { AuditData } from './types';
import { buildReport, type Comparison, type CheckValue, type Finding, type StepKey } from './findings';

export type Icons = Record<string, string>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STEP_META: Record<StepKey, { name: string; icon: string; intro: (name: string) => string }> = {
  found: { name: 'Get Found', icon: 'magnifying-glass', intro: (n) => `Whether people looking for help nearby come across ${n}.` },
  chosen: { name: 'Get Chosen', icon: 'star', intro: () => 'What happens in the first few seconds after someone lands on your site.' },
  referred: { name: 'Get Referred', icon: 'handshake', intro: () => 'The local professionals most likely to send clients your way.' },
  booked: { name: 'Get Booked', icon: 'lightning', intro: () => 'How easy it is to reach you, and what happens after someone does.' },
};

const STATUS: Record<Finding['status'], { icon: string; cls: string; label: string }> = {
  good: { icon: 'check-circle', cls: 'text-[var(--good)]', label: 'Working' },
  fix: { icon: 'warning-circle', cls: 'text-[var(--warn)]', label: 'Worth fixing' },
  note: { icon: 'info', cls: 'text-muted', label: 'Good to know' },
};

function finding(f: Finding, icons: Icons): string {
  const s = STATUS[f.status];
  return `<li class="grid grid-cols-[24px_1fr] gap-4 py-6">
    <span class="${s.cls} mt-0.5" title="${s.label}">${icons[s.icon] ?? ''}<span class="sr-only">${s.label}: </span></span>
    <div>
      <h4 class="h3">${esc(f.title)}</h4>
      <p class="mt-2 max-w-[64ch] text-muted">${esc(f.body)}</p>${
        f.checklist
          ? `<ul class="mt-4 max-w-[64ch] space-y-3">${f.checklist
              .map(
                (c) => `<li class="grid grid-cols-[20px_1fr] gap-3 text-[15px] ${c.ok ? 'text-ink' : 'text-muted'}"><span class="${c.ok ? 'text-[var(--good)]' : 'text-[var(--warn)]'} mt-0.5 [&>svg]:size-5">${icons[c.ok ? 'check-circle' : 'x-circle'] ?? ''}<span class="sr-only">${c.ok ? 'Found' : 'Missing'}: </span></span><span>${esc(c.text)}</span></li>`
              )
              .join('')}</ul>`
          : ''
      }
    </div>
  </li>`;
}

function rankingsTable(d: AuditData): string {
  if (!d.rankings.length) return '';
  const rows = d.rankings
    .map((r) => {
      const pos = r.position == null ? '<span class="whitespace-nowrap text-muted">Not on page 1</span>' : `<span class="font-mono">#${r.position}</span>`;
      return `<tr><td>${esc(r.keyword)}</td><td class="font-mono">${r.volume != null ? r.volume.toLocaleString('en-US') : '<span class="text-muted">n/a</span>'}</td><td>${pos}</td></tr>`;
    })
    .join('');
  return `<div class="table-wrap mt-2"><table>
    <thead><tr><th>Search</th><th>Per month</th><th>You're at</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <p class="mt-3 text-sm text-muted">Per month: how often each search happens (Mangools). You're at: your Google position from a live check today.</p>`;
}

function phoneShot(d: AuditData): string {
  if (!d.speed?.screenshot) return '';
  return `<figure class="mx-auto mt-2 w-[220px] shrink-0 lg:mx-0">
    <div class="overflow-hidden rounded-[28px] border-[6px] border-[var(--ink)] bg-surface shadow-card">
      <img src="${esc(d.speed.screenshot)}" alt="Your homepage as it first appears on a phone" class="block w-full" />
    </div>
    <figcaption class="mt-3 text-center text-sm text-muted">What a phone shows first, from Google's test.</figcaption>
  </figure>`;
}

function mark(v: CheckValue, icons: Icons): string {
  const icon = `<span class="${v.ok ? 'text-[var(--good)]' : 'text-[var(--warn)]'} [&>svg]:size-5">${icons[v.ok ? 'check-circle' : 'x-circle'] ?? ''}</span>`;
  const label = `<span class="sr-only">${v.ok ? 'Yes' : 'No'}</span>`;
  return `<span class="inline-flex items-center gap-2">${icon}${v.text ? `<span class="font-mono">${esc(v.text)}</span>` : ''}${label}</span>`;
}

function comparison(c: Comparison, icons: Icons): string {
  const rows = c.rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${mark(r.you, icons)}</td><td>${mark(r.them, icons)}</td></tr>`).join('');
  return `<section id="compare" class="scroll-mt-24 border-t border-line py-12 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
    <div class="mb-6 lg:mb-0">
      <div class="flex items-center gap-3">
        <span class="grid size-9 place-items-center rounded-control bg-accent-soft text-accent">${icons['trophy'] ?? ''}</span>
        <h3 class="h3">You and the practice at the top</h3>
      </div>
    </div>
    <div class="min-w-0">
      <p class="max-w-[64ch] text-muted">${esc(c.intro)}</p>
      <div class="table-wrap mt-6"><table>
        <thead><tr><th>Check</th><th>You</th><th style="white-space:normal">${esc(c.name)}</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <p class="mt-4 max-w-[64ch] text-ink">${esc(c.summary)}</p>
    </div>
  </section>`;
}

function partners(list: string[], icons: Icons): string {
  return `<div class="py-6">
    <p class="max-w-[64ch] text-muted">Many people find a counselor through someone they already trust. Based on what you offer, these are the local professionals worth getting to know first. We can't see who already sends you clients, so skip anyone you're already connected with.</p>
    <ul class="mt-5 grid gap-2 sm:grid-cols-2">${list
      .map((p) => `<li class="flex items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 text-[15px] text-ink"><span class="text-accent">${icons['user-circle'] ?? ''}</span>${esc(p)}</li>`)
      .join('')}</ul>
  </div>`;
}

export function renderAudit(d: AuditData, icons: Icons, opts: { contactHref: string; pricingHref: string; phone: string }): string {
  const r = buildReport(d);
  const date = new Date(d.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const hello = r.greetingName ? `${esc(r.greetingName)}, here's what we found.` : "Here's what we found.";

  const glance = r.glance
    .map(
      (g) => `<div class="card p-5">
        <p class="text-sm text-muted">${esc(g.label)}</p>
        <p class="mt-2 font-mono text-[32px] font-medium leading-none tracking-tight ${g.tone === 'fix' ? 'text-[var(--warn)]' : g.tone === 'good' ? 'text-[var(--good)]' : 'text-ink'}">${esc(g.value)}</p>
        <p class="mt-2 text-sm text-muted">${esc(g.note)}</p>
      </div>`
    )
    .join('');

  const top = r.top
    .map(
      (f, i) => `<li class="card flex gap-4 p-5 sm:p-6">
        <span class="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-mono text-[15px] font-medium text-accent-ink">${i + 1}</span>
        <div>
          <p class="text-[17px] font-semibold leading-snug text-ink">${esc(f.action ?? f.title)}</p>
          <p class="mt-1.5 text-[15px] text-muted">${esc(f.title)} <a href="#${f.step}" class="link-arrow">Details</a></p>
        </div>
      </li>`
    )
    .join('');

  const steps = r.steps
    .map(({ key, findings }) => {
      const m = STEP_META[key];
      let extra = '';
      if (key === 'found') extra = rankingsTable(d);
      if (key === 'referred') extra = partners(r.partners, icons);
      const list = findings.length ? `<ul class="divide-y divide-line">${findings.map((f) => finding(f, icons)).join('')}</ul>` : '';
      const body =
        key === 'chosen' && d.speed?.screenshot
          ? `<div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12"><div class="min-w-0 flex-1">${list}</div>${phoneShot(d)}</div>`
          : `${list}${extra}`;
      return `<section id="${key}" class="scroll-mt-24 border-t border-line py-12 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        <div class="mb-6 lg:mb-0">
          <div class="flex items-center gap-3">
            <span class="grid size-9 place-items-center rounded-control bg-accent-soft text-accent">${icons[m.icon] ?? ''}</span>
            <h3 class="h3">${m.name}</h3>
          </div>
          <p class="mt-3 text-[15px] text-muted">${esc(m.intro(d.practice.name))}</p>
        </div>
        <div class="min-w-0">${body}</div>
      </section>${key === 'found' && r.compare ? comparison(r.compare, icons) : ''}`;
    })
    .join('');

  return `
  <section class="wrap pb-12 pt-10 sm:pt-14">
    <p class="text-sm font-medium text-muted">Caseload Audit for ${esc(d.practice.name)} · ${date}</p>
    <h1 class="mt-4 max-w-[22ch] text-[clamp(34px,4.4vw,52px)] font-semibold leading-[1.06] tracking-[-0.035em] text-ink">${hello}</h1>
    <p class="lede mt-5 max-w-[58ch]">${esc(r.intro)}</p>
    ${glance ? `<div class="mt-10 grid gap-4 sm:grid-cols-3">${glance}</div>` : ''}
  </section>

  ${
    top
      ? `<section class="wrap py-12">
    <h2 class="h2">Start here</h2>
    <p class="lede mt-3 max-w-[58ch]">If you only do three things, do these. They're ordered by how much each is likely to matter for ${esc(d.practice.name)}.</p>
    <ol class="mt-8 grid gap-4 lg:grid-cols-3">${top}</ol>
  </section>`
      : ''
  }

  <section class="wrap py-12">
    <h2 class="h2">The full picture</h2>
    <p class="lede mt-3 max-w-[58ch]">Each part of how a new client finds you, chooses you, and reaches out.</p>
    <div class="mt-8 border-b border-line">${steps}</div>
  </section>

  <section class="wrap py-12">
    <div class="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
      <h2 class="h3">How this audit was made</h2>
      <div class="max-w-[64ch] space-y-3 text-[15px] text-muted">
        <p>This audit was put together the moment you asked for it, from public information only: your website's own code, the site of the practice at the top of your main search, Google's PageSpeed and accessibility tests, and search data from Mangools. Nothing in it is estimated. If we couldn't check something, we left it out rather than guess.</p>
        <p>Luke Burgett, a licensed counselor and the founder of Counselor Marketing Co., gets a copy too. If you'd like to talk it through, he'll already know your practice.</p>
      </div>
    </div>
  </section>

  <section class="wrap py-10">
    <div class="rounded-card band px-6 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
      <div class="max-w-2xl">
        <h2 class="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.15] tracking-[-0.03em]">Want a hand with any of this?</h2>
        <p class="mt-3 opacity-80">Luke will walk through your audit with you and answer questions. No pressure, and the plan is yours to use either way.</p>
      </div>
      <div class="mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
        <a href="${esc(opts.contactHref)}" class="btn-primary">Talk it through with Luke</a>
        <a href="tel:${esc(opts.phone.replace(/[^0-9+]/g, ''))}" class="btn-secondary">Call ${esc(opts.phone)}</a>
      </div>
    </div>
    <p class="mt-6 text-sm text-muted">Curious what working together would cost? <a href="${esc(opts.pricingHref)}" class="link-arrow">See plans and pricing</a></p>
  </section>`;
}

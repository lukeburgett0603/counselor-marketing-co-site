// Renders an audit report to HTML in the browser (the page is static; the
// data arrives at view time). Everything that came from the prospect or
// their website is escaped. Icons are Phosphor SVGs the page pre-renders
// at build time and hands in by name.
import type { AuditData } from './types.ts';
import { buildReport, type Comparison, type CheckValue, type Finding, type StepKey } from './findings.ts';
import { HELP, REFERRED_HOWTO, WATCH, dfyPrice, howTo, linkCards, templates, type Help, type HowTo } from './guide.ts';

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

function finding(f: Finding, icons: Icons, d: AuditData): string {
  const s = STATUS[f.status];
  const how = howTo(f, d);
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
      }${how ? howBlock(how) : ''}
    </div>
  </li>`;
}

// "What to do" (always visible) and "Show me how" (opens the steps).
function howBlock(h: HowTo): string {
  return `<p class="mt-4 max-w-[64ch] text-[15px] text-ink"><span class="font-semibold">What to do:</span> ${esc(h.todo)}</p>${
    h.steps.length
      ? `<details class="audit-how mt-3 max-w-[64ch]"><summary class="link-arrow cursor-pointer text-[15px]">Show me how</summary>
      <ol class="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-muted marker:text-accent">${h.steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ol></details>`
      : ''
  }`;
}

function helpBlock(h: Help, group: boolean, pricingHref: string): string {
  return `<div class="mt-8 rounded-card border border-line bg-surface p-5 sm:p-6">
    <p class="text-sm font-semibold text-ink">How Counselor Marketing Co. helps</p>
    <div class="mt-4 grid gap-5 md:grid-cols-2">
      <div><p class="text-sm font-medium text-accent">With the platform (Self-Guided)</p><p class="mt-1.5 text-[15px] text-muted">${esc(h.self)}</p></div>
      <div><p class="text-sm font-medium text-accent">We do it for you (Done for You)</p><p class="mt-1.5 text-[15px] text-muted">${esc(h.dfy)}${group && h.group ? ` <span class="text-ink">Group Practice adds:</span> ${esc(h.group)}` : ''}</p></div>
    </div>
    <a href="${esc(pricingHref)}" class="link-arrow mt-4 text-sm">See plans and pricing</a>
  </div>`;
}

function linksSection(d: AuditData, icons: Icons): string {
  const b = d.backlinks;
  const cards = linkCards(d);
  let found = '';
  if (b) {
    const names = b.yours.slice(0, 3).map((l) => l.name);
    const list = names.length <= 1 ? names.join('') : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
    found = `<p class="mt-4 max-w-[64ch] text-muted">${
      b.yours.length
        ? b.yours.length === 1
          ? `We found 1 trusted site that links to you: ${esc(list)}. That's a good start.`
          : `We found ${b.yours.length} trusted sites that link to you, including ${esc(list)}. That's a good start.`
        : `We didn't find any trusted local sites linking to ${esc(d.practice.name)} yet. That's normal for a small practice, and it's one of the easiest gaps to close.`
    } Most links pointing to any small website come from automated "SEO" sites that Google ignores, so we left those out. You don't need to do anything about them.</p>`;
  }
  const card = (c: ReturnType<typeof linkCards>[number]) => `<li class="rounded-card border border-line bg-surface p-5">
      <div class="flex items-start justify-between gap-3">
        <p class="font-semibold text-ink">${esc(c.name)}</p>
        ${c.have ? `<span class="inline-flex shrink-0 items-center gap-1.5 text-sm text-[var(--good)] [&>svg]:size-4">${icons['check-circle'] ?? ''}You already have this one</span>` : ''}
      </div>
      ${c.why && !c.have ? `<p class="mt-1 text-sm text-muted">${esc(c.why)}</p>` : ''}
      ${c.have ? '' : `<p class="mt-3 text-sm text-ink"><span class="font-medium">What it takes:</span> ${esc(c.cost)}</p>
      <details class="audit-how mt-2"><summary class="link-arrow cursor-pointer text-sm">How to get it</summary>
        <ol class="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted marker:text-accent">${c.steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ol></details>`}
    </li>`;
  return `<div class="border-t border-line py-8">
    <h4 class="h3">Links that count</h4>
    <p class="mt-2 max-w-[64ch] text-muted">When trusted local websites link to yours, Google takes it as a sign your practice is real and respected. It's one of the things that separates the practices at the top from everyone else.</p>
    ${found}
    <p class="mt-6 text-sm font-semibold text-ink">Links worth getting next</p>
    <ul class="mt-3 grid gap-3 md:grid-cols-2">${cards.map(card).join('')}</ul>
    <p class="mt-4 max-w-[64ch] text-sm text-muted"><span class="font-medium text-ink">One rule:</span> Never pay for links or join "link networks." Google's spam policies forbid them, and they can hurt your rankings.</p>
  </div>`;
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
  return `<div class="border-t border-line py-6">
    <p class="max-w-[64ch] text-muted">Many people find a counselor through someone they already trust. Based on what you offer, these are the local professionals worth getting to know first. We can't see who already sends you clients, so skip anyone you're already connected with.</p>
    <ul class="mt-5 grid gap-2 sm:grid-cols-2">${list
      .map((p) => `<li class="flex items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 text-[15px] text-ink"><span class="text-accent">${icons['user-circle'] ?? ''}</span>${esc(p)}</li>`)
      .join('')}</ul>
    ${howBlock(REFERRED_HOWTO)}
  </div>`;
}

export function renderAudit(d: AuditData, icons: Icons, opts: { contactHref: string; pricingHref: string; phone: string }): string {
  const r = buildReport(d);
  const date = new Date(d.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const hello = r.greetingName ? `${esc(r.greetingName)}, here's what we found.` : "Here's what we found.";
  const count = d.site?.counselorCount ?? null;
  const group = count != null && count >= 3;

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

  const stepSection = (id: string, name: string, icon: string, intro: string, inner: string) => `<section id="${id}" class="scroll-mt-28 border-t border-line py-12 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        <div class="mb-6 lg:mb-0">
          <div class="flex items-center gap-3">
            <span class="grid size-9 place-items-center rounded-control bg-accent-soft text-accent">${icons[icon] ?? ''}</span>
            <h3 class="h3">${name}</h3>
          </div>
          <p class="mt-3 text-[15px] text-muted">${esc(intro)}</p>
        </div>
        <div class="min-w-0">${inner}</div>
      </section>`;

  const steps = r.steps
    .map(({ key, findings }) => {
      const m = STEP_META[key];
      const list = findings.length ? `<ul class="divide-y divide-line">${findings.map((f) => finding(f, icons, d)).join('')}</ul>` : '';
      let inner: string;
      if (key === 'chosen' && d.speed?.screenshot) {
        inner = `<div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12"><div class="min-w-0 flex-1">${list}</div>${phoneShot(d)}</div>`;
      } else if (key === 'found') {
        inner = `${list}${rankingsTable(d)}${linksSection(d, icons)}`;
      } else if (key === 'referred') {
        inner = `${partners(r.partners, icons)}${list}`;
      } else {
        inner = list;
      }
      inner += helpBlock(HELP[key], group, opts.pricingHref);
      return `${stepSection(key, m.name, m.icon, m.intro(d.practice.name), inner)}${key === 'found' && r.compare ? comparison(r.compare, icons) : ''}`;
    })
    .join('');

  const watch = stepSection(
    'watch',
    'Watch It Work',
    'chart-line-up',
    WATCH.intro,
    `<p class="max-w-[64ch] text-muted">${esc(WATCH.body)}</p>${howBlock({ todo: WATCH.todo, steps: WATCH.steps })}${helpBlock(HELP.watch, group, opts.pricingHref)}`,
  );

  const tpls = templates(d)
    .map(
      (t) => `<div class="rounded-card border border-line bg-surface p-5 sm:p-6">
        <div class="flex items-center justify-between gap-3">
          <p class="font-semibold text-ink">${esc(t.title)}</p>
          <button type="button" class="audit-copy btn-secondary !px-3 !py-1.5 text-sm" data-copy="tpl-${t.key}">Copy</button>
        </div>
        <pre id="tpl-${t.key}" class="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-muted">${esc(t.text)}</pre>
        ${t.note ? `<p class="mt-3 text-sm text-ink">${esc(t.note)}</p>` : ''}
      </div>`,
    )
    .join('');

  const price = dfyPrice(count);
  const options = `<section id="options" class="wrap scroll-mt-28 py-12">
    <h2 class="h2">Your options</h2>
    <p class="lede mt-3 max-w-[58ch]">Everything in this audit is yours to use, however you choose to do it.</p>
    <div class="mt-8 grid gap-4 lg:grid-cols-3">
      <div class="card p-6"><p class="font-semibold text-ink">Do it yourself</p><p class="mt-1 text-sm font-medium text-accent">Free</p><p class="mt-3 text-[15px] text-muted">Start with the three changes at the top of this page, and work through each section's steps. Come back to this page anytime.</p></div>
      <div class="card p-6"><p class="font-semibold text-ink">Self-Guided</p><p class="mt-1 text-sm font-medium text-accent">$149 a month, plus a one-time $1,500 website build</p><p class="mt-3 text-[15px] text-muted">We build your new site and give you the platform; you run the marketing with a plan, tools, and tracking. Any practice size.</p></div>
      <div class="card border-accent p-6"><p class="font-semibold text-ink">${esc(price.label)}</p><p class="mt-1 text-sm font-medium text-accent">${esc(price.price)}</p><p class="mt-3 text-[15px] text-muted">We run the system; you see the clients. Everything in Self-Guided, plus we do the work in every step above.</p></div>
    </div>
    ${count != null ? `<p class="mt-4 text-sm text-muted">We counted about ${count} counselor${count === 1 ? '' : 's'} on your site, so we showed ${esc(price.label)} pricing. If that's off, <a href="${esc(opts.pricingHref)}" class="link-arrow">see all plans and pricing</a></p>` : ''}
    <ul class="mt-6 max-w-[70ch] space-y-2 text-[15px] text-muted">
      <li>Month-to-month. No contract.</li>
      <li>Your data is yours: download it anytime, and it always goes with you. If you leave, you keep your website and domain; the CMC platform (dashboard, CRM, automations) stays with us.</li>
      <li>Keeping your domain: your new site uses the domain you already have, registered in your name, and we set up redirects from your old pages so you keep what you've built in Google.</li>
    </ul>
    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <a href="${esc(opts.contactHref)}" class="btn-primary">Talk it through with Luke</a>
      <a href="${esc(opts.pricingHref)}" class="btn-secondary">See plans and pricing</a>
    </div>
  </section>`;

  const nav = [
    ['start', 'Start here'],
    ['found', 'Get Found'],
    ['chosen', 'Get Chosen'],
    ['referred', 'Get Referred'],
    ['booked', 'Get Booked'],
    ['watch', 'Watch It Work'],
    ['options', 'Your options'],
  ]
    .filter(([id]) => id !== 'start' || top)
    .map(([id, label]) => `<a href="#${id}" class="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-ink">${label}</a>`)
    .join('');

  return `
  <section class="wrap pb-10 pt-10 sm:pt-14">
    <p class="text-sm font-medium text-muted">Caseload Audit for ${esc(d.practice.name)} · ${date}</p>
    <h1 class="mt-4 max-w-[22ch] text-[clamp(34px,4.4vw,52px)] font-semibold leading-[1.06] tracking-[-0.035em] text-ink">${hello}</h1>
    <p class="lede mt-5 max-w-[60ch]">Most counselors were never trained in marketing. You were trained to help people, and that's what you should get to spend your time on. So this audit doesn't just tell you how ${esc(d.practice.name)} is doing. It walks you through exactly what to do next, step by step, in the order most likely to bring you new clients.</p>
    <p class="lede mt-4 max-w-[60ch]">You can do every bit of it yourself, and we'll show you how. If you'd rather have help, each section ends with how we can do it with you or for you.</p>
    ${glance ? `<div class="mt-10 grid gap-4 sm:grid-cols-3">${glance}</div>` : ''}
  </section>

  <nav aria-label="Audit sections" class="sticky top-0 z-30 border-y border-line bg-page/90 backdrop-blur">
    <div class="wrap flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">${nav}</div>
  </nav>

  ${
    top
      ? `<section id="start" class="wrap scroll-mt-28 py-12">
    <h2 class="h2">Start here</h2>
    <p class="lede mt-3 max-w-[58ch]">If you only do three things, do these. They're ordered by how much each is likely to matter for ${esc(d.practice.name)}.</p>
    <ol class="mt-8 grid gap-4 lg:grid-cols-3">${top}</ol>
  </section>`
      : ''
  }

  <section class="wrap py-12">
    <h2 class="h2">The full picture</h2>
    <p class="lede mt-3 max-w-[58ch]">Each part of how a new client finds you, chooses you, and reaches out.</p>
    <div class="mt-8 border-b border-line">${steps}${watch}</div>
  </section>

  <section id="templates" class="wrap scroll-mt-28 py-12">
    <h2 class="h2">Ready to use</h2>
    <p class="lede mt-3 max-w-[58ch]">Copy these, make them yours, and use them today.</p>
    <div class="mt-8 grid gap-4 lg:grid-cols-3">${tpls}</div>
  </section>

  ${options}

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
  </section>`;
}

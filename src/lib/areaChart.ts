// Daily area chart for the admin redesign (Website traffic, Google
// profile): a smoothed line that draws itself in, weekends shaded,
// dashed gridlines, and a hover/touch readout of the nearest day.
// Styles are the w-* rules in admin.css. The container needs a child
// tooltip element and a sibling axis element (see traffic.astro).

export type ChartDay = { date: string; value: number };

// Plain YYYY-MM-DD dates: parse as local days, never UTC.
export const localDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const shortDay = (ymd: string) => localDay(ymd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function renderAreaChart(
  el: HTMLElement,
  tip: HTMLElement,
  axis: HTMLElement,
  days: ChartDay[],
  tipHtml: (index: number) => string,
  lastLabel?: string
) {
  if (days.length < 2) {
    el.insertAdjacentHTML('afterbegin', '<p class="i-hint">Not enough days yet to draw a chart.</p>');
    return;
  }
  const W = 800, H = 220, P = 6;
  const max = Math.max(1, ...days.map((d) => d.value));
  const x = (i: number) => P + (i / (days.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P - 10);
  const pts = days.map((d, i) => [x(i), y(d.value)] as const);
  // Gentle smoothing so the line reads as a trend.
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    line += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  const area = `${line} L${pts.at(-1)![0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const band = (W - 2 * P) / (days.length - 1);
  const weekends = days
    .map((d, i) => ([0, 6].includes(localDay(d.date).getDay()) ? `<rect x="${(x(i) - band / 2).toFixed(1)}" y="0" width="${band.toFixed(1)}" height="${H}" class="w-wkd"/>` : ''))
    .join('');
  const grid = [0.25, 0.5, 0.75]
    .map((f) => `<line x1="0" x2="${W}" y1="${(P + f * (H - 2 * P)).toFixed(1)}" y2="${(P + f * (H - 2 * P)).toFixed(1)}" class="w-grid"/>`)
    .join('');
  const gid = `w-area-${el.id || 'chart'}`;
  el.insertAdjacentHTML(
    'afterbegin',
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a-accent)" stop-opacity="0.32"/><stop offset="1" stop-color="var(--a-accent)" stop-opacity="0"/></linearGradient></defs>
      ${weekends}${grid}
      <path d="${area}" fill="url(#${gid})" class="w-area"/>
      <path d="${line}" class="w-line" pathLength="1"/>
      <line class="w-cross" x1="0" x2="0" y1="0" y2="${H}" visibility="hidden"/>
    </svg><span class="w-dot" hidden></span>`
  );
  const mid = Math.floor((days.length - 1) / 2);
  axis.innerHTML = [0, mid, days.length - 1].map((i) => `<span>${i === days.length - 1 && lastLabel ? lastLabel : shortDay(days[i].date)}</span>`).join('');

  const cross = el.querySelector<SVGLineElement>('.w-cross')!;
  const dot = el.querySelector<HTMLElement>('.w-dot')!;
  const show = (clientX: number) => {
    const r = el.getBoundingClientRect();
    const rel = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    const i = Math.round(rel * (days.length - 1));
    const px = (x(i) / W) * r.width;
    const py = (y(days[i].value) / H) * r.height;
    cross.setAttribute('x1', String(x(i)));
    cross.setAttribute('x2', String(x(i)));
    cross.setAttribute('visibility', 'visible');
    dot.hidden = false;
    dot.style.transform = `translate(${px}px, ${py}px)`;
    tip.hidden = false;
    tip.innerHTML = tipHtml(i);
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    tip.style.left = `${Math.min(Math.max(px - tw / 2, 0), r.width - tw)}px`;
    // Above the dot, or below it when there isn't room, never covering it.
    tip.style.top = `${py - th - 14 >= -8 ? py - th - 14 : py + 14}px`;
  };
  const hide = () => {
    cross.setAttribute('visibility', 'hidden');
    dot.hidden = true;
    tip.hidden = true;
  };
  el.addEventListener('pointermove', (e) => show(e.clientX));
  el.addEventListener('pointerdown', (e) => show(e.clientX));
  el.addEventListener('pointerleave', hide);
}

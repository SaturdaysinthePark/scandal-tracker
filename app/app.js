// Scandal Tracker — reads data/*.json and docs/METHODOLOGY.md; no records are hard-coded.
(() => {
  const STEP = 5, MIN_YEAR = 1990, TOP_N = 25;
  // Fewer year columns on narrow screens so dots stay tappable.
  const winYears = () => (window.innerWidth < 640 ? 8 : window.innerWidth < 1000 ? 12 : 20);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const VIEWS = ['home', 'records', 'timeline', 'calendar', 'about'];
  const SCOPES = ['All', 'Fortune 500', 'Global 500', 'Other notable'];
  const TYPES = ['all', 'relationship', 'misconduct'];
  // Strongest first, matching the methodology.
  const TIER_ORDER = ['confirmed', 'adjudicated', 'acknowledged', 'settled', 'reported', 'unconfirmed'];
  const SORTS = ['date', 'company', 'person', 'evidence'];

  // Everything a visitor can change lives in the URL (see urlFor / parseUrl), so views can be shared and survive a reload.
  const DEF = { type: 'all', scope: 'All', ev: 'all', lost: 'all', p: true, co: '', yr: '', q: '', sort: 'date-desc', end: null, zero: false, all: false, m: '', find: '' };
  const st = { ...DEF, view: 'home', sel: null };
  let companies = [], byCo = {}, records = [], tiers = {}, tierDef = {}, maxYear = new Date().getFullYear();
  let lastFocus = null, justPickedMonth = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yearOf = (r) => +r.disclosed.slice(0, 4);
  const dateLabel = (r) => `${MONTHS[+r.disclosed.slice(5, 7) - 1]} ${r.disclosed.slice(0, 4)}`;
  const dayLabel = (d) => { const [y, m, dd] = String(d).split('-'); return dd ? `${+dd} ${MONTHS[+m - 1]} ${y}` : d; };
  const plural = (n, w) => `${n} ${n === 1 ? w : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : /(s|x|ch|sh)$/.test(w) ? `${w}es` : `${w}s`}`;
  const isU = (r) => r.evidence === 'unconfirmed';
  const isM = (r) => r.type === 'misconduct';
  const isP = (r) => r.role_level === 'prominent';
  const coName = (id) => byCo[id]?.name || '';
  const tierLabel = (r) => tiers[r.evidence] || r.evidence;
  const roleLine = (r) => `${esc(r.role)}${isP(r) ? ' <span class="ptag">Prominent employee</span>' : ''}`;
  const markCls = (r) => `${isU(r) ? 'ring' : ''} ${isM(r) ? 'sq' : ''}`;
  const dotHtml = (r, cls = '') => `<i class="dot ${cls} ${markCls(r)}" aria-hidden="true"></i>`;
  const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);
  const byDateDesc = (a, b) => b.disclosed.localeCompare(a.disclosed) || b.id - a.id;
  const clampEnd = (e) => Math.min(maxYear, Math.max(MIN_YEAR + winYears() - 1, e));

  // ---------- URL state ----------
  function urlFor(view, id, s = st) {
    const p = new URLSearchParams();
    if (s.type !== DEF.type) p.set('type', s.type);
    if (s.scope !== DEF.scope) p.set('scope', s.scope);
    if (s.ev !== DEF.ev) p.set('ev', s.ev);
    if (s.lost !== DEF.lost) p.set('lost', s.lost);
    if (!s.p) p.set('p', '0');
    if (s.co) p.set('co', s.co);
    if (s.yr) p.set('yr', s.yr);
    if (s.q) p.set('q', s.q);
    // View-specific settings only appear in their own view's URL.
    if (view === 'records' && s.sort !== DEF.sort) p.set('sort', s.sort);
    if (view === 'timeline') {
      if (s.end && s.end !== maxYear) p.set('end', s.end);
      if (s.zero) p.set('zero', '1');
      if (s.all) p.set('all', '1');
      if (s.find) p.set('find', s.find);
    }
    if (view === 'calendar' && s.m) p.set('m', s.m);
    const qs = p.toString();
    return `#${view}${id ? `/${id}` : ''}${qs ? `?${qs}` : ''}`;
  }
  function parseUrl() {
    const [path, qs] = location.hash.slice(1).split('?');
    const [v, id] = path.split('/');
    const p = new URLSearchParams(qs || '');
    const pick = (k, ok) => { const x = p.get(k); return x !== null && ok(x) ? x : DEF[k]; };
    st.view = VIEWS.includes(v) ? v : 'home';
    st.type = pick('type', (x) => TYPES.includes(x));
    st.scope = pick('scope', (x) => SCOPES.includes(x));
    st.ev = pick('ev', (x) => x === 'nou' || TIER_ORDER.includes(x));
    st.lost = pick('lost', (x) => x === 'yes' || x === 'no');
    st.p = p.get('p') !== '0';
    st.co = pick('co', (x) => !!byCo[x]);
    st.yr = pick('yr', (x) => /^\d{4}$/.test(x));
    st.q = p.get('q') || '';
    // Keep the other views' settings when they are not in this URL.
    if (st.view === 'records') st.sort = pick('sort', (x) => SORTS.includes(x.split('-')[0]) && /-(asc|desc)$/.test(x));
    if (st.view === 'timeline') {
      st.end = clampEnd(+p.get('end') || maxYear);
      st.zero = p.get('zero') === '1';
      st.all = p.get('all') === '1';
      st.find = p.get('find') || '';
    }
    if (st.view === 'calendar') st.m = pick('m', (x) => /^\d{4}-\d{2}$/.test(x));
    return id || '';
  }
  // Filter or sort change: same history entry, new URL.
  function commit() {
    history.replaceState(history.state, '', urlFor(st.view, st.sel?.id));
    if (st.view === 'timeline' && introDone && motionOK()) flipTimeline(render); else render();
  }

  // ---------- Motion ----------
  // All motion is skipped for people who ask for reduced motion.
  const motionOK = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const EASE = 'cubic-bezier(.2,.7,.2,1)';
  let introDone = false;
  // First load: stats count up from zero (the bars rise via the .tl-reveal class in CSS).
  function countUp(root) {
    root.querySelectorAll('.stat-v[data-v]').forEach((el) => {
      const to = +el.dataset.v, t0 = performance.now(), d = 700;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / d);
        el.textContent = Math.round(to * (1 - (1 - p) ** 3));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }
  // Filter changes on the timeline: rows slide to their new places, dots travel with them,
  // new dots grow in, and the per-year bars resize instead of snapping (FLIP).
  function flipTimeline(update) {
    const tl = $('timeline');
    const rowsBefore = new Map([...tl.querySelectorAll('.tl-row.co')].map((el) => [el.dataset.k, rect(el).top]));
    const dotsBefore = new Map([...tl.querySelectorAll('button.dot')].map((el) => [el.dataset.id, rect(el)]));
    const barsBefore = [...tl.querySelectorAll('.bar')].map((el) => el.offsetHeight);
    update();
    const opts = { duration: 260, easing: EASE };
    const rowDy = new Map();
    tl.querySelectorAll('.tl-row.co').forEach((el) => {
      const old = rowsBefore.get(el.dataset.k);
      if (old === undefined) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }); return; }
      const dy = old - rect(el).top;
      rowDy.set(el.dataset.k, dy);
      if (Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], opts);
    });
    tl.querySelectorAll('button.dot').forEach((el) => {
      const old = dotsBefore.get(el.dataset.id);
      if (!old) { el.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE }); return; }
      const now = rect(el);
      const dx = old.left - now.left, dy = old.top - now.top - (rowDy.get(el.closest('.tl-row')?.dataset.k) || 0);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], opts);
    });
    tl.querySelectorAll('.bar').forEach((el, i) => {
      const h = el.offsetHeight, was = barsBefore[i];
      if (h && was !== undefined && was !== h) el.animate([{ transform: `scaleY(${was / h})` }, { transform: 'none' }], opts);
    });
  }

  // ---------- Hover card on timeline dots (mouse and keyboard focus) ----------
  const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  function showHover(el) {
    const r = records.find((x) => x.id === +el.dataset.id);
    const hc = $('hovercard');
    if (!r) return;
    const first = (r.summary || '').split(/(?<=[.!?])\s+/)[0];
    hc.innerHTML = `<div class="hc-meta">${esc(coName(r.company_id))} · ${esc(dateLabel(r))}</div>
      <div class="hc-name">${esc(r.executive)}</div><div class="hc-role">${roleLine(r)}</div>
      <p class="hc-sum">${esc(first.length > 170 ? `${first.slice(0, 167)}…` : first)}</p>
      <div class="hc-foot"><span class="ev">${dotHtml(r, 'sm')}${esc(tierLabel(r))}</span><span class="hc-cta">Select for sources</span></div>`;
    hc.classList.remove('show', 'below');
    hc.hidden = false;
    const b = rect(el), w = hc.offsetWidth, h = hc.offsetHeight;
    const top = $('hdr').offsetHeight + 8;
    let x = Math.max(8, Math.min(window.innerWidth - w - 8, b.left + b.width / 2 - w / 2));
    let y = b.top - h - 10;
    if (y < top) { y = b.bottom + 10; hc.classList.add('below'); }
    hc.style.left = `${x}px`; hc.style.top = `${y}px`;
    void hc.offsetWidth;
    hc.classList.add('show');
  }
  function hideHover() { const hc = $('hovercard'); hc.classList.remove('show'); hc.hidden = true; }
  const rect = (el) => el.getBoundingClientRect();
  // Move to another view (new history entry), keeping filters.
  function navTo(view, sec = '') {
    history.pushState(null, '', urlFor(view, sec));
    route();
  }

  // ---------- Filtering ----------
  const evOk = (r) => st.ev === 'all' || (st.ev === 'nou' ? !isU(r) : r.evidence === st.ev);
  const passes = (r) =>
    (st.type === 'all' || r.type === st.type) && (st.p || !isP(r)) &&
    (st.scope === 'All' || byCo[r.company_id]?.scope === st.scope) && evOk(r) &&
    (st.lost === 'all' || (st.lost === 'yes') === !!r.lost_role) && (!st.co || r.company_id === st.co) && (!st.yr || yearOf(r) === +st.yr);
  const filtered = () => records.filter(passes);
  const qMatch = (r, q) => [coName(r.company_id), r.executive, r.role, r.category, r.summary, r.outcome].join(' ').toLowerCase().includes(q);

  function sorter() {
    const [k, dir] = st.sort.split('-');
    const f = dir === 'asc' ? 1 : -1;
    const cmp = {
      date: (a, b) => a.disclosed.localeCompare(b.disclosed) || a.id - b.id,
      company: (a, b) => coName(a.company_id).localeCompare(coName(b.company_id)) || byDateDesc(a, b) * -f,
      person: (a, b) => a.executive.localeCompare(b.executive) || byDateDesc(a, b) * -f,
      evidence: (a, b) => TIER_ORDER.indexOf(a.evidence) - TIER_ORDER.indexOf(b.evidence) || byDateDesc(a, b) * -f,
    }[k];
    return (a, b) => f * cmp(a, b);
  }
  function recList() {
    const q = st.q.trim().toLowerCase();
    return filtered().filter((r) => !q || qMatch(r, q)).sort(sorter());
  }
  // The list the drawer's Prev / Next walks through: whatever the current view shows.
  function currentList() {
    if (st.view === 'records') return recList();
    const list = filtered().sort(byDateDesc);
    return st.view === 'calendar' && st.m ? list.filter((r) => r.disclosed === st.m) : list;
  }
  function activeFilters() {
    const out = [];
    if (st.type !== 'all') out.push(['type', st.type === 'misconduct' ? 'Misconduct' : 'Relationships']);
    if (st.scope !== 'All') out.push(['scope', st.scope]);
    if (st.ev !== 'all') out.push(['ev', st.ev === 'nou' ? 'Unconfirmed hidden' : tiers[st.ev]]);
    if (st.lost !== 'all') out.push(['lost', st.lost === 'yes' ? 'Lost their role' : 'Kept their role']);
    if (!st.p) out.push(['p', 'Prominent employees hidden']);
    if (st.co) out.push(['co', `Company: ${coName(st.co)}`]);
    if (st.yr) out.push(['yr', `Year: ${st.yr}`]);
    if (st.q && st.view === 'records') out.push(['q', `Search: “${st.q}”`]);
    if (st.zero && st.view === 'timeline') out.push(['zero', 'Companies with no cases shown']);
    return out;
  }
  function clearFilter(k) {
    if (k === 'q') { st.q = ''; $('q').value = ''; } else st[k] = DEF[k];
  }
  function resetFilters() {
    for (const k of ['type', 'scope', 'ev', 'lost', 'p', 'co', 'yr', 'q', 'find', 'zero']) st[k] = DEF[k];
    $('q').value = '';
  }
  // "Showing 12 of 147 cases · [chips] · Reset filters"
  function renderSummary(shown) {
    const act = activeFilters();
    $('fsum').innerHTML = act.length ? `<span>Showing <b>${shown}</b> of ${records.length} cases</span>
      ${act.filter(([k]) => k !== 'type').map(([k, l]) => `<button type="button" class="chip" data-clear="${k}" aria-label="Remove filter: ${esc(l)}">${esc(l)}<span aria-hidden="true">×</span></button>`).join('')}
      <button type="button" class="linkish" data-reset>Reset filters</button>` : '';
  }
  // Companies in the list that have no published case at all (e.g. IBM, Apple).
  const zeroCos = () => {
    const ids = st.co ? [st.co] : st.q && st.view === 'records'
      ? companies.filter((c) => c.name.toLowerCase().includes(st.q.trim().toLowerCase())).map((c) => c.id) : [];
    return ids.filter((id) => !records.some((r) => r.company_id === id)).map(coName);
  };
  function emptyHtml(what) {
    const act = activeFilters();
    const zc = zeroCos();
    if (zc.length) {
      return `<div class="empty"><p><b>${esc(zc.slice(0, 3).join(', '))}</b> ${zc.length === 1 ? 'has' : 'have'} no published cases in the tracker. A case is listed only once it meets the evidence standard.</p>
        <div class="empty-act"><a class="btn" href="#about/evidence" data-nav="about" data-sec="evidence">How cases are chosen</a><button type="button" class="btn" data-reset>Show all cases</button></div></div>`;
    }
    return `<div class="empty"><p>No ${what} match${act.length ? ' the current filters' : ''}${act.length ? `: ${act.map(([, l]) => esc(l)).join(', ')}` : ''}.</p>
      ${act.length ? `<div class="empty-act">${st.q && st.view === 'records' ? '<button type="button" class="btn" data-clear="q">Clear search</button>' : ''}<button type="button" class="btn" data-reset>Reset filters</button></div>` : ''}</div>`;
  }
  const statsHtml = (recs) => [[recs.length, 'Cases'], [new Set(recs.map((r) => r.company_id)).size, 'Companies'], [recs.filter((r) => r.lost_role).length, 'Lost their role']]
    .map(([v, l]) => `<div><div class="stat-v" data-v="${v}" style="min-width:${String(v).length}ch">${v}</div><div class="stat-l">${l}</div></div>`).join('');

  // ---------- Home ----------
  // Search first, then a few cases to start from, then the count of cases by year.
  const BIG_ROLE = /\b(CEO|chief executive|chair(?:man|woman|person)?|president|founder|managing director)\b/i;
  const STRONG = ['confirmed', 'adjudicated', 'acknowledged', 'settled'];
  function onePerPerson(list) {
    const seen = new Map();
    for (const r of list) {
      const k = `${r.executive}|${r.company_id}`;
      if (seen.has(k)) seen.get(k).n++; else seen.set(k, { r, n: 1 });
    }
    return [...seen.values()];
  }
  function caseCard({ r, n }, kicker) {
    return `<button type="button" class="lt-card" data-id="${r.id}">
        ${kicker ? `<span class="lt-kick">${esc(kicker)}</span>` : ''}
        <span class="lt-meta">${esc(dateLabel(r))} · ${esc(coName(r.company_id))}</span>
        <span class="lt-name">${esc(r.executive)}</span>
        <span class="lt-cat">${esc(r.role)}</span>
        <span class="lt-foot"><span class="ev">${dotHtml(r, 'sm')}${esc(tierLabel(r))}</span>${n > 1 ? `<span class="lt-more">+${n - 1} more record${n > 2 ? 's' : ''}</span>` : ''}</span>
      </button>`;
  }
  function renderHome() {
    $('homeCount').textContent = records.length;
    $('stats').innerHTML = statsHtml(records);
    // Shortcuts: the companies with the most cases.
    const top = companies.map((c) => [c, records.filter((r) => r.company_id === c.id).length])
      .filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, 5);
    $('homeChips').innerHTML = top.length ? `<span class="hc-l">Try</span>${top.map(([c]) =>
      `<button type="button" class="chip chip-soft" data-co="${esc(c.id)}">${esc(c.name.replace(/\s*\(.*\)$/, ''))}</button>`).join('')}` : '';
    // Two latest cases, then two notable ones: a CEO, chair or founder at a Fortune 500 or Global 500
    // company, with the case confirmed, admitted, ruled on or settled.
    const byNewest = (a, b) => b.disclosed.localeCompare(a.disclosed) || TIER_ORDER.indexOf(a.evidence) - TIER_ORDER.indexOf(b.evidence) || b.id - a.id;
    const latest = onePerPerson([...records].sort(byNewest)).slice(0, 2);
    const taken = new Set(latest.map(({ r }) => `${r.executive}|${r.company_id}`));
    const notable = onePerPerson([...records].sort(byNewest).filter((r) =>
      BIG_ROLE.test(r.role) && STRONG.includes(r.evidence) && ['Fortune 500', 'Global 500'].includes(byCo[r.company_id]?.scope)))
      .filter(({ r }) => !taken.has(`${r.executive}|${r.company_id}`)).slice(0, 2);
    $('homeCards').innerHTML = `
      <div class="hc-group"><div class="latest-top"><h2 class="latest-h">Latest</h2><a class="more-link" href="#records" data-nav="records">See all →</a></div>
        <div class="hc-row">${latest.map((x) => caseCard(x, byCo[x.r.company_id].scope)).join('')}</div></div>
      ${notable.length ? `<div class="hc-group"><div class="latest-top"><h2 class="latest-h">Notable</h2></div>
        <div class="hc-row">${notable.map((x) => caseCard(x, byCo[x.r.company_id].scope)).join('')}</div></div>` : ''}`;
    renderYearChart();
  }
  function renderYearChart() {
    if (!records.length) { $('yearChart').innerHTML = ''; return; }
    const first = Math.min(...records.map(yearOf));
    const years = []; for (let y = first; y <= maxYear; y++) years.push(y);
    const per = years.map((y) => {
      const list = records.filter((r) => yearOf(r) === y);
      return { y, n: list.length, m: list.filter(isM).length };
    });
    const max = Math.max(1, ...per.map((x) => x.n));
    const peak = per.reduce((a, b) => (b.n > a.n ? b : a), per[0]);
    const label = (y, i) => i === 0 || y === maxYear || y % 5 === 0;
    $('yearChart').innerHTML = `<div class="yc" role="list">${per.map(({ y, n, m }, i) => {
      const lbl = `${y}: ${plural(n, 'case')}${n ? ` (${n - m} relationship, ${m} misconduct)` : ''}`;
      return `<button type="button" class="yc-col ${y === peak.y ? 'peak' : ''}" data-yr="${y}" role="listitem" style="--i:${i}" title="${lbl}" aria-label="${lbl}. Show these cases" ${n ? '' : 'disabled'}>
        <span class="yc-n">${n || ''}</span>
        <span class="yc-bar" style="--h:${(n / max).toFixed(3)}"><i class="yc-m" style="flex-grow:${m}"></i><i class="yc-r" style="flex-grow:${n - m}"></i></span>
      </button>`;
    }).join('')}</div>
      <div class="yc-axis" aria-hidden="true">${per.map(({ y }, i) => `<span>${label(y, i) ? `'${String(y).slice(2)}` : ''}</span>`).join('')}</div>`;
  }

  // ---------- Timeline ----------
  function renderTimeline() {
    const recs = filtered();
    const W = winYears();
    st.end = clampEnd(st.end || maxYear);
    const start = st.end - W + 1;
    const years = Array.from({ length: W }, (_, i) => start + i);
    const inWin = (r) => yearOf(r) >= start && yearOf(r) <= st.end;

    renderSummary(recs.length);

    $('rangeLabel').textContent = `${start} – ${st.end}`;
    $('back').disabled = start <= MIN_YEAR;
    $('fwd').disabled = st.end >= maxYear;

    const perYear = years.map((y) => recs.filter((r) => yearOf(r) === y).length);
    const maxN = Math.max(1, ...perYear);
    const yy = (y) => `'${String(y).slice(2)}`;
    const find = st.find.trim().toLowerCase();

    let rows = companies
      .filter((c) => (st.scope === 'All' || c.scope === st.scope) && (!st.co || c.id === st.co))
      .map((c) => {
        const mine = recs.filter((r) => r.company_id === c.id).sort((a, b) => a.disclosed.localeCompare(b.disclosed));
        return { c, mine, win: mine.filter(inWin).length, latest: mine.length ? mine[mine.length - 1].disclosed : '' };
      });
    let outside = 0;
    if (find) rows = rows.filter((x) => x.c.name.toLowerCase().includes(find) && (x.mine.length || st.zero));
    else {
      outside = rows.filter((x) => x.mine.length && !x.win).length;
      rows = rows.filter((x) => x.win || (st.zero && !x.mine.length));
    }
    rows.sort((a, b) => b.win - a.win || b.mine.length - a.mine.length || b.latest.localeCompare(a.latest) || a.c.name.localeCompare(b.c.name));
    const total = rows.length;
    const capped = !find && !st.all && total > TOP_N;
    if (capped) rows = rows.slice(0, TOP_N);

    let html = `<div class="tl-head">
      <div class="tl-row hd"><div class="tl-lab big">Per year</div>
        <div class="hist">${perYear.map((n, i) => `<div class="bar-col" title="${years[i]}: ${plural(n, 'case')}" style="--i:${i}"><div class="bar-n">${n || ''}</div><div class="bar" style="height:${Math.round((n / maxN) * 44)}px"></div></div>`).join('')}</div><div></div></div>
      <div class="tl-row hd"><div class="tl-lab">Company</div>
        <div class="years">${years.map((y) => `<div class="yr">${yy(y)}</div>`).join('')}</div><div class="tot-h">Total</div></div></div>`;
    html += rows.map(({ c, mine }) => {
      const earlier = mine.filter((r) => yearOf(r) < start), later = mine.filter((r) => yearOf(r) > st.end);
      const cells = years.map((y) => `<div class="cell">${mine.filter((r) => yearOf(r) === y).map((r) =>
        `<button type="button" class="dot ${markCls(r)}" data-id="${r.id}" aria-label="${esc(`${r.executive}, ${c.name}, ${dateLabel(r)}, ${tierLabel(r)}`)}"></button>`).join('')}</div>`).join('');
      const chip = (list, dir) => list.length ? `<button type="button" class="shift" data-shift="${yearOf(dir < 0 ? list[list.length - 1] : list[0])}" aria-label="${plural(list.length, `${dir < 0 ? 'earlier' : 'later'} case`)} at ${esc(c.name)}: show ${dir < 0 ? 'earlier' : 'later'} years">${dir < 0 ? '‹' : ''}+${list.length}${dir > 0 ? '›' : ''}</button>` : '';
      return `<div class="tl-row co" data-k="${esc(c.id)}"><button type="button" class="tl-name" data-co="${esc(c.id)}" title="All cases at ${esc(c.name)}"><span>${esc(c.name)}</span></button><div class="years">${cells}</div>
        <div class="tot">${chip(earlier, -1)}${chip(later, 1)}<span class="tot-n ${mine.length ? '' : 'zero'}">${mine.length}</span></div></div>`;
    }).join('');
    if (!total) html += emptyHtml(find ? `companies named “${esc(st.find)}”` : 'companies');
    $('timeline').innerHTML = html;

    const more = [];
    if (capped) more.push(`<button type="button" class="btn" data-all="1">Show all ${total} companies</button>`);
    else if (st.all && total > TOP_N) more.push(`<button type="button" class="btn" data-all="0">Show top ${TOP_N} only</button>`);
    if (outside) more.push(`<span>${plural(outside, 'more company')} ${outside === 1 ? 'has' : 'have'} cases only outside ${start}–${st.end}.</span>
      ${start > MIN_YEAR ? '<button type="button" class="linkish" data-earlier>Show earlier years</button>' : ''}`);
    $('tlMore').innerHTML = more.join('');
  }

  // ---------- Calendar heat map (company-agnostic) ----------
  function renderCalendar() {
    const recs = filtered();
    const counts = {};
    for (const r of recs) counts[r.disclosed] = (counts[r.disclosed] || 0) + 1;
    const ys = recs.map(yearOf);
    const first = ys.length ? Math.min(...ys) : maxYear;
    const years = []; for (let y = maxYear; y >= first; y--) years.push(y);
    const maxN = Math.max(1, ...Object.values(counts));
    const pct = (n) => Math.round(22 + 78 * (n / maxN));
    const shade = (n) => (n ? `color-mix(in srgb, var(--accent) ${pct(n)}%, transparent)` : '');

    $('calStats').innerHTML = statsHtml(recs);
    renderSummary(recs.length);

    let html = `<div></div>${MONTHS.map((m) => `<div class="hm-h">${m}</div>`).join('')}<div class="hm-h" style="text-align:right">Total</div>`;
    for (const y of years) {
      let tot = 0;
      html += `<div class="hm-y">${y}</div>`;
      for (let m = 1; m <= 12; m++) {
        const key = `${y}-${String(m).padStart(2, '0')}`, n = counts[key] || 0; tot += n;
        const lbl = `${MONTHS[m - 1]} ${y}: ${plural(n, 'case')}`;
        html += n
          ? `<button type="button" class="hm-c has ${st.m === key ? 'on' : ''}" data-m="${key}" style="background:${shade(n)};color:${n / maxN > 0.5 ? '#fff' : 'var(--ink)'}" title="${lbl}" aria-label="${lbl}" aria-pressed="${st.m === key}">${n}</button>`
          : `<div class="hm-c" title="${lbl}"></div>`;
      }
      html += `<div class="hm-t ${tot ? '' : 'zero'}">${tot}</div>`;
    }
    $('heat').innerHTML = recs.length ? html : emptyHtml('cases');
    $('heat').classList.toggle('is-empty', !recs.length);
    const steps = [1, Math.ceil(maxN / 2), maxN].filter((v, i, a) => a.indexOf(v) === i);
    $('heatLegend').innerHTML = `<span>Fewer</span>${steps.map((n) => `<span><i class="hm-sw" style="background:${shade(n)}"></i>${n}</span>`).join('')}<span>More</span><span class="legend-note">Placed by the month a case became public. Coverage is incomplete.</span>`;

    const box = $('monthList');
    const sel = st.m ? recs.filter((r) => r.disclosed === st.m).sort(byDateDesc) : [];
    box.hidden = !sel.length;
    if (sel.length) {
      box.innerHTML = `<div class="ml-top"><h2>${MONTHS[+st.m.slice(5) - 1]} ${st.m.slice(0, 4)} · ${plural(sel.length, 'case')}</h2>
        <button type="button" class="btn" data-closemonth>Close</button></div>
        <div class="card scroll-x">${tableHtml(sel, false)}</div>`;
      if (justPickedMonth) {
        box.focus({ preventScroll: true });
        requestAnimationFrame(() => box.scrollIntoView({ block: 'start' }));
      }
    }
    justPickedMonth = false;
  }

  // ---------- Records ----------
  function rowsHtml(list) {
    return list.map((r) => `
      <tr data-id="${r.id}" tabindex="0" aria-label="${esc(`${r.executive}, ${coName(r.company_id)}, ${dateLabel(r)}. Open details`)}">
        <td class="td-date">${esc(dateLabel(r))}</td>
        <td class="td-co"><button type="button" class="co-link" data-co="${esc(r.company_id)}" title="All cases at ${esc(coName(r.company_id))}">${esc(coName(r.company_id))}</button></td>
        <td class="td-ex"><div>${esc(r.executive)}</div><div class="sub">${roleLine(r)}</div></td>
        <td class="td-cat">${esc(r.category)}</td>
        <td class="td-out">${esc(r.outcome)}</td>
        <td class="td-ev"><div class="ev">${dotHtml(r, 'sm')}${esc(tierLabel(r))}</div></td>
      </tr>`).join('');
  }
  const tableHtml = (list) => `<table class="tbl"><thead><tr><th>Disclosed</th><th>Company</th><th>Person</th><th>Category</th><th>Outcome</th><th>Evidence</th></tr></thead><tbody>${rowsHtml(list)}</tbody></table>`;

  function renderRecords() {
    const list = recList();
    $('rows').innerHTML = list.length ? rowsHtml(list) : `<tr class="tr-empty"><td colspan="6">${emptyHtml('cases')}</td></tr>`;
    const lost = list.filter((r) => r.lost_role).length;
    $('recCount').textContent = `${plural(list.length, 'case')}${st.q.trim() ? ` matching “${st.q.trim()}”` : ''} · ${lost} lost their role`;
    renderSummary(list.length);
    const [k, dir] = st.sort.split('-');
    document.querySelectorAll('#recTbl th').forEach((th) => {
      const b = th.querySelector('.th-sort');
      if (!b) return;
      const on = b.dataset.sort === k;
      th.setAttribute('aria-sort', on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
      b.dataset.dir = on ? dir : '';
    });
  }

  // ---------- About (from METHODOLOGY.md) ----------
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function renderAbout(md) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
    let out = '', list = null, sec = '';
    const toc = [];
    const close = () => { if (list) { out += `</${list}>`; list = null; } };
    for (const line of md.split('\n')) {
      let m;
      if (/^# /.test(line)) continue;
      if ((m = line.match(/^## (.+)/))) {
        close(); sec = slug(m[1]); toc.push([sec, m[1]]);
        out += `${out ? '</section>' : ''}<section id="about-${sec}" tabindex="-1"><h2>${inline(m[1])}</h2>`;
      } else if ((m = line.match(/^\s*[-*] (.+)/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = line.match(/^\s*\d+\. (.+)/))) {
        if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`;
        // Evidence definitions feed the drawer's tier explainer.
        const d = sec === 'evidence' && m[1].match(/^\*\*(.+?)\*\*:\s*(.+)/);
        if (d) tierDef[d[1]] = d[2];
      } else if (line.trim()) { close(); out += `<p>${inline(line)}</p>`; }
    }
    close();
    $('aboutDoc').insertAdjacentHTML('beforeend', out + (out ? '</section>' : ''));
    $('toc').innerHTML = `<span class="toc-l">On this page</span>${toc.map(([id, t]) => `<a href="#about/${id}" data-nav="about" data-sec="${id}">${esc(t)}</a>`).join('')}`;
  }

  // ---------- Drawer ----------
  function openCase(id) {
    if (!st.sel) lastFocus = document.activeElement;
    // A real history entry, so the phone Back button closes the drawer instead of leaving the view.
    const view = st.view === 'about' ? 'records' : st.view;
    history.pushState({ d: 1 }, '', urlFor(view, id));
    route();
  }
  function closeCase() {
    if (history.state?.d) history.back();
    else { history.replaceState(null, '', urlFor(st.view, '')); route(); }
  }
  function stepCase(dir) {
    const list = currentList();
    let i = list.findIndex((r) => r.id === st.sel?.id);
    const src = i < 0 ? [...records].sort(byDateDesc) : list;
    if (i < 0) i = src.findIndex((r) => r.id === st.sel?.id);
    const next = src[i + dir];
    if (!next) return;
    history.replaceState(history.state, '', urlFor(st.view, next.id));
    route();
  }
  const setModal = (on) => {
    for (const el of [$('hdr'), $('main'), $('ftr'), $('toTop')]) el.inert = on;
    document.body.classList.toggle('locked', on);
  };

  function showDrawer(r) {
    const wasOpen = !!st.sel;
    const stepFocus = document.activeElement?.dataset?.step;
    st.sel = r;
    let list = currentList(), i = list.findIndex((x) => x.id === r.id);
    if (i < 0) { list = [...records].sort(byDateDesc); i = list.findIndex((x) => x.id === r.id); }
    const url = safeUrl(r.primary_url), arch = safeUrl(r.archive_url);
    let host = '';
    try { host = url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { /* ignore */ }
    const urlLabel = /sec\.gov$/.test(host) ? 'SEC filing' : 'Primary report';
    const srcs = (r.sources || []).map((s) => {
      const u = safeUrl(s.url);
      return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : esc(s.label)}</li>`;
    }).join('');
    const related = records.filter((x) => x.id !== r.id && x.executive === r.executive && x.company_id === r.company_id).sort(byDateDesc);
    const def = tierDef[tierLabel(r)];
    $('drawer').innerHTML = `
      <div class="dr-nav">
        <button type="button" class="btn btn-sm" data-step="-1" ${i <= 0 ? 'disabled' : ''} aria-label="Previous case">‹ Prev</button>
        <span class="mono dr-pos">${i + 1} of ${list.length}</span>
        <button type="button" class="btn btn-sm" data-step="1" ${i >= list.length - 1 ? 'disabled' : ''} aria-label="Next case">Next ›</button>
        <button type="button" class="dr-x" id="drClose" aria-label="Close">×</button>
      </div>
      <div>
        <div class="dr-meta"><button type="button" class="co-link" data-co="${esc(r.company_id)}">${esc(coName(r.company_id))}</button> · ${esc(dateLabel(r))}</div>
        <h2 class="dr-name" id="drName">${esc(r.executive)}</h2><div class="dr-role">${roleLine(r)}</div>
      </div>
      <div class="pills"><div class="pill kind">${dotHtml(r, 'sm')}${isM(r) ? 'Misconduct' : 'Relationship'}</div>
        <a class="pill tier" href="#about/evidence" data-nav="about" data-sec="evidence" title="What this evidence level means">${esc(tierLabel(r))}<span aria-hidden="true">ⓘ</span></a></div>
      ${def ? `<p class="dr-def"><strong>${esc(tierLabel(r))}:</strong> ${esc(def.replace(/\*\*/g, ''))} <a href="#about/evidence" data-nav="about" data-sec="evidence">How evidence is graded</a></p>` : ''}
      <p class="dr-sum">${esc(r.summary)}</p>
      <dl class="dr-facts"><dt>Category</dt><dd>${esc(r.category)}</dd><dt>Outcome</dt><dd>${esc(r.outcome)}</dd>
        <dt>Lost their role</dt><dd>${r.lost_role ? 'Yes' : 'No'}</dd><dt>Became public</dt><dd>${esc(dateLabel(r))}</dd>
        ${r.verified_on ? `<dt>Last verified</dt><dd>${esc(dayLabel(r.verified_on))}</dd>` : ''}</dl>
      ${related.length ? `<div class="dr-rel"><div class="src-t">Other records about this person</div><ul>${related.map((x) =>
        `<li><button type="button" class="linkish" data-id="${x.id}">${esc(dateLabel(x))} · ${esc(x.category)}</button></li>`).join('')}</ul></div>` : ''}
      <div class="dr-src">
        ${url ? `<a class="src-card" href="${esc(url)}" target="_blank" rel="noopener"><div><div class="src-l">${urlLabel}</div><div class="src-h">${esc(host)}</div></div><div class="src-arrow" aria-hidden="true">↗</div></a>` : ''}
        <div class="src-t">Sources</div><ul>${srcs}</ul>
        ${arch ? `<p class="dr-arch"><a href="${esc(arch)}" target="_blank" rel="noopener">Archived copy</a></p>` : ''}
      </div>
      <div class="dr-act"><button type="button" class="btn" id="copyLink">Copy link to this case</button></div>`;
    $('drawer').hidden = false; $('backdrop').hidden = false;
    $('drawer').scrollTop = 0;
    setModal(true);
    const keep = stepFocus && $('drawer').querySelector(`[data-step="${stepFocus}"]:not(:disabled)`);
    (keep || (!wasOpen && $('drClose')) || $('drawer').querySelector('[data-step]:not(:disabled)') || $('drClose')).focus();
  }
  function hideDrawer() {
    st.sel = null;
    $('drawer').hidden = true; $('backdrop').hidden = true;
    setModal(false);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  // ---------- Header search ----------
  let suggIdx = -1, suggItems = [];
  function suggest() {
    const q = $('q').value.trim().toLowerCase();
    if (!q) return closeSugg();
    const people = new Map();
    for (const r of [...records].sort(byDateDesc)) {
      const k = `${r.executive}|${r.company_id}`;
      if (!people.has(k) && `${r.executive} ${coName(r.company_id)}`.toLowerCase().includes(q)) people.set(k, r);
    }
    const caseCount = (id) => records.filter((r) => r.company_id === id).length;
    // Every company in the list is searchable, including ones with no published cases (e.g. IBM).
    const cos = companies.filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => [c, caseCount(c.id)])
      .sort(([a, n], [b, m]) => b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q) || (m > 0) - (n > 0) || a.name.localeCompare(b.name));
    const hits = records.filter((r) => qMatch(r, q)).length;
    const raw = $('q').value.trim();
    suggItems = [
      ...[...people.values()].slice(0, 5).map((r) => ({ kind: 'case', id: r.id, label: r.executive, sub: `${coName(r.company_id)} · ${dateLabel(r)}` })),
      ...cos.slice(0, 4).map(([c, n]) => ({ kind: n ? 'co' : 'co0', id: c.id, label: c.name, sub: n ? plural(n, 'case') : 'No published cases' })),
    ];
    if (hits) suggItems.push({ kind: 'all', label: `Search all records for “${raw}”`, sub: plural(hits, 'match') });
    if (!suggItems.length) {
      suggItems.push({ kind: 'none', label: `Nothing in the tracker matches “${raw}”`, sub: '' });
      suggItems.push({ kind: 'about', label: 'How companies and cases are chosen', sub: 'Methodology' });
    }
    suggIdx = -1;
    $('sugg').innerHTML = suggItems.map((s, i) => `<li role="option" id="sg-${i}" data-i="${i}" aria-selected="false" class="sg-${s.kind}"${s.kind === 'none' ? ' aria-disabled="true"' : ''}>
      <span class="sg-l">${esc(s.label)}</span>${s.sub ? `<span class="sg-s">${esc(s.sub)}</span>` : ''}</li>`).join('');
    $('sugg').hidden = false;
    $('q').setAttribute('aria-expanded', 'true');
  }
  function closeSugg() {
    $('sugg').hidden = true; suggIdx = -1;
    $('q').setAttribute('aria-expanded', 'false'); $('q').removeAttribute('aria-activedescendant');
  }
  function moveSugg(d) {
    if ($('sugg').hidden) return suggest();
    const ok = suggItems.map((s, i) => (s.kind === 'none' ? -1 : i)).filter((i) => i >= 0);
    if (!ok.length) return;
    const at = ok.indexOf(suggIdx);
    suggIdx = ok[at < 0 ? (d > 0 ? 0 : ok.length - 1) : (at + d + ok.length) % ok.length];
    $('sugg').querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', String(i === suggIdx)));
    $('q').setAttribute('aria-activedescendant', `sg-${suggIdx}`);
    $(`sg-${suggIdx}`)?.scrollIntoView({ block: 'nearest' });
  }
  function pickSugg(i) {
    const s = suggItems[i];
    if (!s || s.kind === 'none') return;
    closeSugg();
    if (s.kind === 'about') { closeMobileSearch(); return navTo('about', 'scope'); }
    if (s.kind === 'all') {
      st.q = $('q').value.trim();
      return navTo('records');
    }
    $('q').value = ''; st.q = '';
    if (s.kind === 'co' || s.kind === 'co0') { st.co = s.id; navTo('records'); }
    else openCase(s.id);
    closeMobileSearch();
  }
  function setPanel(open) {
    $('fPanel').hidden = !open; $('fBtn').setAttribute('aria-expanded', String(open));
    if (open) $('fPanel').querySelector('select')?.focus();
  }
  const closeMobileSearch = () => { $('hdr').classList.remove('s-open'); $('searchToggle').setAttribute('aria-expanded', 'false'); };

  // ---------- Downloads ----------
  function download(name, type, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function csv() {
    const cols = ['id', 'disclosed', 'company', 'executive', 'role', 'type', 'role_level', 'category', 'outcome', 'lost_role', 'evidence', 'summary', 'primary_url', 'verified_on'];
    const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [cols.join(',')].concat([...records].sort(byDateDesc).map((r) =>
      cols.map((c) => cell(c === 'company' ? coName(r.company_id) : c === 'evidence' ? tierLabel(r) : r[c])).join(',')));
    return lines.join('\n');
  }
  let toastT;
  function toast(msg) {
    $('toast').textContent = msg; $('toast').hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; }, 2200);
  }

  // ---------- Routing ----------
  function syncControls() {
    document.querySelectorAll('#typeSeg button').forEach((b) => { const on = b.dataset.type === st.type; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('scope').value = st.scope; $('ev').value = st.ev; $('lost').value = st.lost;
    $('showP').checked = st.p; $('showZero').checked = st.zero;
    const hiddenOn = [st.scope !== DEF.scope, st.ev !== DEF.ev, st.lost !== DEF.lost, !st.p, st.view === 'timeline' && st.zero].filter(Boolean).length;
    $('fCount').hidden = !hiddenOn; $('fCount').textContent = hiddenOn;
    $('fBtn').classList.toggle('has', !!hiddenOn);
    $('fBtn').setAttribute('aria-label', hiddenOn ? `Filters, ${hiddenOn} on` : 'Filters');
    if (document.activeElement !== $('coFind')) $('coFind').value = st.find;
    document.querySelectorAll('#tabs button').forEach((b) => {
      const on = b.dataset.view === st.view; b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  function render() {
    syncControls();
    if (st.view === 'home') renderHome();
    if (st.view === 'timeline') renderTimeline();
    if (st.view === 'calendar') renderCalendar();
    if (st.view === 'records') renderRecords();
  }
  function route() {
    const prev = st.view;
    const id = parseUrl();
    const changed = prev !== st.view;
    for (const k of VIEWS) $(`v-${k}`).hidden = k !== st.view;
    // One filter bar, shared by every data view.
    const slot = $(`v-${st.view}`).querySelector('.fslot');
    $('filters').hidden = !slot;
    $('filters').dataset.view = st.view;
    // On Home the search sits front and centre; everywhere else it lives in the header.
    const sSlot = st.view === 'home' ? $('homeSlot') : $('hdrSlot');
    if ($('search').parentElement !== sSlot) { closeSugg(); sSlot.append($('search')); }
    $('q').placeholder = st.view === 'home' ? 'Search a company or a person' : 'Search people or companies';
    $('hdr').dataset.view = st.view;
    setHdrH();
    if (changed) { setPanel(false); hideHover(); }
    if (slot && $('filters').parentElement !== slot) slot.append($('filters'));
    if (changed && document.activeElement !== $('q')) $('q').value = st.view === 'records' ? st.q : '';
    render();
    if (st.view === 'about') {
      introDone = true;
      if (st.sel) hideDrawer();
      const sec = id && $(`about-${id}`);
      if (sec) { sec.scrollIntoView(); sec.focus({ preventScroll: true }); } else if (changed) window.scrollTo(0, 0);
      return;
    }
    if (changed) window.scrollTo(0, 0);
    if (!introDone) {
      introDone = true;
      const reveal = st.view === 'home' ? $('yearChart') : st.view === 'timeline' ? $('timeline') : null;
      if (reveal && motionOK()) {
        reveal.classList.add('tl-reveal');
        if (st.view === 'home') countUp($('stats'));
        setTimeout(() => reveal.classList.remove('tl-reveal'), 1400);
      }
    }
    const r = id && records.find((x) => x.id === +id);
    if (r) { if (st.sel?.id !== r.id) showDrawer(r); }
    else if (st.sel) hideDrawer();
  }

  function setHdrH() { document.documentElement.style.setProperty('--hdr-h', `${$('hdr').offsetHeight}px`); }

  function wire() {
    // Views
    $('tabs').addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.view; if (v && v !== st.view) navTo(v); });
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('a[data-nav]');
      if (nav) { e.preventDefault(); navTo(nav.dataset.nav, nav.dataset.sec || ''); closeMobileSearch(); return; }
      const co = e.target.closest('[data-co]');
      if (co) { e.stopPropagation(); st.co = co.dataset.co; st.q = ''; st.find = ''; $('q').value = ''; navTo('records'); return; }
      const clr = e.target.closest('[data-clear]');
      if (clr) { clearFilter(clr.dataset.clear); commit(); return; }
      if (e.target.closest('[data-reset]')) { resetFilters(); commit(); return; }
      const card = e.target.closest('.lt-card, .dr-rel [data-id]');
      if (card) { if (st.sel) { history.replaceState(history.state, '', urlFor(st.view, card.dataset.id)); route(); } else openCase(card.dataset.id); }
    });
    window.addEventListener('popstate', route);

    // Shared filters
    $('typeSeg').addEventListener('click', (e) => { const t = e.target.closest('button')?.dataset.type; if (t) { st.type = t; st.m = ''; commit(); } });
    $('scope').addEventListener('change', (e) => { st.scope = e.target.value; commit(); });
    $('ev').addEventListener('change', (e) => { st.ev = e.target.value; st.m = ''; commit(); });
    $('lost').addEventListener('change', (e) => { st.lost = e.target.value; st.m = ''; commit(); });
    $('showP').addEventListener('change', (e) => { st.p = e.target.checked; st.m = ''; commit(); });

    // Home: a year bar opens that year's cases
    $('yearChart').addEventListener('click', (e) => {
      const y = e.target.closest('[data-yr]')?.dataset.yr;
      if (y) { resetFilters(); st.yr = y; navTo('records'); }
    });

    // Filters pop-over
    $('fBtn').addEventListener('click', () => setPanel($('fPanel').hidden));
    $('fDone').addEventListener('click', () => { setPanel(false); $('fBtn').focus(); });
    document.addEventListener('click', (e) => { if (!$('fPanel').hidden && !e.target.closest('.fpop')) setPanel(false); });

    // Hover card
    $('timeline').addEventListener('mouseover', (e) => { const d = e.target.closest('button.dot'); if (d && canHover()) showHover(d); });
    $('timeline').addEventListener('mouseout', (e) => { const d = e.target.closest('button.dot'); if (d && !d.contains(e.relatedTarget)) hideHover(); });
    $('timeline').addEventListener('focusin', (e) => { const d = e.target.closest('button.dot'); if (d && d.matches(':focus-visible')) showHover(d); });
    $('timeline').addEventListener('focusout', hideHover);
    $('timeline').addEventListener('click', hideHover, true);

    // Timeline
    $('showZero').addEventListener('change', (e) => { st.zero = e.target.checked; commit(); });
    $('coFind').addEventListener('input', (e) => { st.find = e.target.value; commit(); });
    $('back').addEventListener('click', () => { st.end = clampEnd(st.end - STEP); commit(); });
    $('fwd').addEventListener('click', () => { st.end = clampEnd(st.end + STEP); commit(); });
    $('timeline').addEventListener('click', (e) => {
      const id = e.target.closest('button.dot')?.dataset.id; if (id) return openCase(id);
      const y = e.target.closest('[data-shift]')?.dataset.shift;
      if (y) { st.end = clampEnd(+y + Math.floor(winYears() / 2)); commit(); }
    });
    $('tlMore').addEventListener('click', (e) => {
      const a = e.target.closest('[data-all]'); if (a) { st.all = a.dataset.all === '1'; commit(); }
      if (e.target.closest('[data-earlier]')) { st.end = clampEnd(st.end - winYears()); commit(); }
    });

    // Calendar
    $('heat').addEventListener('click', (e) => { const m = e.target.closest('button.hm-c')?.dataset.m; if (m) { st.m = st.m === m ? '' : m; justPickedMonth = !!st.m; commit(); } });
    $('monthList').addEventListener('click', (e) => {
      if (e.target.closest('[data-closemonth]')) { const k = st.m; st.m = ''; commit(); $('heat').querySelector(`[data-m="${k}"]`)?.focus(); return; }
      if (e.target.closest('[data-co]')) return;
      const id = e.target.closest('tr')?.dataset.id; if (id) openCase(id);
    });

    // Records
    $('rows').addEventListener('click', (e) => { if (e.target.closest('[data-co],[data-clear],[data-reset]')) return; const id = e.target.closest('tr')?.dataset.id; if (id) openCase(id); });
    const rowKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr')) { e.preventDefault(); openCase(e.target.dataset.id); } };
    $('rows').addEventListener('keydown', rowKey);
    $('monthList').addEventListener('keydown', rowKey);
    $('recTbl').querySelector('thead').addEventListener('click', (e) => {
      const k = e.target.closest('.th-sort')?.dataset.sort; if (!k) return;
      const [ck, cd] = st.sort.split('-');
      st.sort = ck === k ? `${k}-${cd === 'asc' ? 'desc' : 'asc'}` : `${k}-${k === 'date' ? 'desc' : 'asc'}`;
      commit();
    });

    // Header search
    $('q').addEventListener('input', () => {
      if (st.view === 'records') { st.q = $('q').value; commit(); }
      suggest();
    });
    $('q').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSugg(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSugg(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if ($('q').value.trim()) { if ($('sugg').hidden) suggest(); pickSugg(suggIdx >= 0 ? suggIdx : suggItems.findIndex((x) => x.kind === 'all') >= 0 ? suggItems.findIndex((x) => x.kind === 'all') : suggItems.findIndex((x) => x.kind !== 'none')); } }
      else if (e.key === 'Escape') { if (!$('sugg').hidden) closeSugg(); else { $('q').blur(); closeMobileSearch(); } }
    });
    $('q').addEventListener('focus', () => { if ($('q').value.trim()) suggest(); });
    $('q').addEventListener('blur', () => setTimeout(() => { closeSugg(); if (!$('q').value) closeMobileSearch(); }, 120));
    $('sugg').addEventListener('mousedown', (e) => e.preventDefault());
    $('sugg').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) pickSugg(+li.dataset.i); });
    $('searchToggle').addEventListener('click', () => {
      const open = !$('hdr').classList.contains('s-open');
      $('hdr').classList.toggle('s-open', open); $('searchToggle').setAttribute('aria-expanded', String(open));
      if (open) $('q').focus();
    });

    // Drawer
    $('backdrop').addEventListener('click', closeCase);
    $('drawer').addEventListener('click', (e) => {
      if (e.target.closest('#drClose')) return closeCase();
      const s = e.target.closest('[data-step]'); if (s) return stepCase(+s.dataset.step);
      if (e.target.closest('#copyLink')) {
        const link = `${location.origin}${location.pathname}#${st.view}/${st.sel.id}`;
        (navigator.clipboard?.writeText(link) || Promise.reject()).then(() => toast('Link copied'), () => toast(link));
      }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
      if (e.key === 'Escape' && !$('fPanel').hidden) { setPanel(false); $('fBtn').focus(); return; }
      if (st.sel) {
        if (e.key === 'Escape') { e.preventDefault(); closeCase(); }
        else if (!typing && e.key === 'ArrowLeft') stepCase(-1);
        else if (!typing && e.key === 'ArrowRight') stepCase(1);
        return;
      }
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        $('hdr').classList.add('s-open'); $('searchToggle').setAttribute('aria-expanded', 'true');
        $('q').focus();
      }
    });

    // Footer and page chrome
    $('dlCsv').addEventListener('click', () => download('scandal-tracker-records.csv', 'text/csv', csv()));
    $('dlJson').addEventListener('click', () => download('scandal-tracker-records.json', 'application/json', JSON.stringify(records, null, 2)));
    $('toTop').addEventListener('click', () => { window.scrollTo({ top: 0 }); $('main').focus({ preventScroll: true }); });
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        $('toTop').hidden = window.scrollY < window.innerHeight * 1.5;
        // Depth cues: the header, and the timeline's sticky year row once it is pinned.
        $('hdr').classList.toggle('scrolled', window.scrollY > 8);
        const th = document.querySelector('#v-timeline:not([hidden]) .tl-head');
        if (th) th.classList.toggle('stuck', th.getBoundingClientRect().top <= $('hdr').offsetHeight + 1 && window.scrollY > 8);
        hideHover();
        ticking = false;
      });
    }, { passive: true });
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { setHdrH(); if (st.view === 'timeline') renderTimeline(); }, 150); });
  }

  async function load() {
    const get = (p, t) => fetch(p, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return t ? r.text() : r.json(); });
    try {
      const [c, r, t, md] = await Promise.all([
        get('../data/companies.json'), get('../data/records.json'), get('../data/evidence_tiers.json'), get('../docs/METHODOLOGY.md', true),
      ]);
      companies = c; tiers = t;
      byCo = Object.fromEntries(c.map((x) => [x.id, x]));
      records = r.filter((x) => x.status === 'published' && byCo[x.company_id] && /^\d{4}-\d{2}$/.test(x.disclosed));
      maxYear = Math.max(new Date().getFullYear(), ...records.map(yearOf));
      $('ev').innerHTML = `<option value="all">Any evidence</option><option value="nou">Hide unconfirmed</option>${TIER_ORDER.filter((k) => tiers[k]).map((k) => `<option value="${k}">${esc(tiers[k])} only</option>`).join('')}`;
      const updated = records.map((x) => x.verified_on || '').sort().pop();
      $('updated').textContent = `${plural(records.length, 'published case')}${updated ? ` · Data last verified ${dayLabel(updated)}` : ''}`;
      if (records.length) $('since').textContent = Math.min(...records.map(yearOf));
      renderAbout(md);
      $('loading').remove();
      $('ftr').hidden = false;
      setHdrH();
      wire();
      route();
    } catch (err) {
      $('loading')?.remove();
      $('err').hidden = false;
      $('err').textContent = `Could not load data (${err.message}). Serve the repo root over HTTP, e.g. python3 -m http.server, and open /app/.`;
    }
  }
  load();
})();

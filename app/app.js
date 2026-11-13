// Scandal Tracker — reads data/*.json and docs/METHODOLOGY.md; no records are hard-coded.
(() => {
  const WINDOW = 20, STEP = 5, MIN_YEAR = 1990;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const SCOPES = ['All', 'Fortune 500', 'Global 500', 'Other notable'];
  // Headline stats: how many companies, and how many people lost their role over it.
  const statList = (recs) => [
    [new Set(recs.map((r) => r.company_id)).size, 'Companies'],
    [recs.filter((r) => r.lost_role).length, 'Lost their role'],
  ];

  const st = { view: 'timeline', scope: 'All', showU: true, showZero: false, end: null, q: '', sel: null, calU: true, calSel: null, type: 'all', showP: true };
  const TYPES = [['all', 'All cases'], ['relationship', 'Relationships'], ['misconduct', 'Misconduct']];
  let companies = [], byCo = {}, records = [], tiers = {}, maxYear = new Date().getFullYear();

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yearOf = (r) => +r.disclosed.slice(0, 4);
  const dateLabel = (r) => `${MONTHS[+r.disclosed.slice(5, 7) - 1]} ${r.disclosed.slice(0, 4)}`;
  const isU = (r) => r.evidence === 'unconfirmed';
  const isM = (r) => r.type === 'misconduct';
  const isP = (r) => r.role_level === 'prominent';
  const typeOk = (r) => (st.type === 'all' || r.type === st.type) && (st.showP || !isP(r));
  const roleLine = (r) => `${esc(r.role)}${isP(r) ? ' · <span class="ptag">Prominent employee</span>' : ''}`;
  const markCls = (r) => `${isU(r) ? 'ring' : ''} ${isM(r) ? 'sq' : ''}`;
  const dotHtml = (r, cls = '') => `<i class="dot ${cls} ${markCls(r)}"></i>`;
  const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);

  function visible() {
    return records.filter((r) =>
      typeOk(r) && (st.scope === 'All' || byCo[r.company_id]?.scope === st.scope) && (st.showU || !isU(r)));
  }

  // ---------- Timeline ----------
  function renderTimeline() {
    const recs = visible();
    const start = st.end - WINDOW + 1;
    const years = Array.from({ length: WINDOW }, (_, i) => start + i);

    $('stats').innerHTML = statList(recs).map(([v, l]) => `<div><div class="stat-v">${v}</div><div class="stat-l">${l}</div></div>`).join('');

    $('scopes').innerHTML = SCOPES.map((s) =>
      `<button data-scope="${esc(s)}" class="${s === st.scope ? 'on' : ''}">${s === 'All' ? 'All' : esc(s)}</button>`).join('');
    $('rangeLabel').textContent = `${start} – ${st.end}`;
    $('back').disabled = start <= MIN_YEAR;
    $('fwd').disabled = st.end >= maxYear;

    const perYear = years.map((y) => recs.filter((r) => yearOf(r) === y).length);
    const maxN = Math.max(1, ...perYear);
    const yy = (y) => `'${String(y).slice(2)}`;

    let rows = companies
      .filter((c) => st.scope === 'All' || c.scope === st.scope)
      .map((c) => {
        const mine = recs.filter((r) => r.company_id === c.id).sort((a, b) => a.disclosed.localeCompare(b.disclosed));
        return { c, mine, latest: mine.length ? mine[mine.length - 1].disclosed : '' };
      })
      .filter((x) => st.showZero || x.mine.length)
      .sort((a, b) => b.mine.length - a.mine.length || b.latest.localeCompare(a.latest) || a.c.name.localeCompare(b.c.name));

    let html = `
      <div class="tl-row hd"><div class="tl-lab big">Per year</div>
        <div class="hist">${perYear.map((n) => `<div class="bar-col"><div class="bar-n">${n || ''}</div><div class="bar" style="height:${Math.round((n / maxN) * 44)}px"></div></div>`).join('')}</div><div></div></div>
      <div class="tl-row hd"><div class="tl-lab">Company</div>
        <div class="years">${years.map((y) => `<div class="yr">${yy(y)}</div>`).join('')}</div><div class="tot-h">Total</div></div>`;
    html += rows.map(({ c, mine }) => {
      const earlier = mine.filter((r) => yearOf(r) < start).length;
      const cells = years.map((y) => `<div class="cell">${mine.filter((r) => yearOf(r) === y).map((r) =>
        `<button class="dot ${markCls(r)}" data-id="${r.id}" title="${esc(`${r.executive} · ${dateLabel(r)} · ${tiers[r.evidence] || r.evidence}`)}" aria-label="${esc(`${r.executive}, ${dateLabel(r)}`)}"></button>`).join('')}</div>`).join('');
      return `<div class="tl-row co"><div class="tl-name" title="${esc(c.name)}">${esc(c.name)}</div><div class="years">${cells}</div>
        <div class="tot">${earlier ? `<span class="tot-e" title="Earlier records outside this range">+${earlier}‹</span>` : ''}<span class="tot-n ${mine.length ? '' : 'zero'}">${mine.length}</span></div></div>`;
    }).join('');
    if (!rows.length) html += `<div class="empty">No records match these filters.</div>`;
    $('timeline').innerHTML = html;
  }

  // ---------- Calendar heat map (company-agnostic) ----------
  function renderCalendar() {
    const recs = records.filter((r) => typeOk(r) && (st.calU || !isU(r)));
    const counts = {};
    for (const r of recs) counts[r.disclosed] = (counts[r.disclosed] || 0) + 1;
    const ys = recs.map(yearOf);
    const first = ys.length ? Math.min(...ys) : maxYear;
    const years = []; for (let y = maxYear; y >= first; y--) years.push(y);
    const maxN = Math.max(1, ...Object.values(counts));
    const shade = (n) => n ? `rgba(200,65,43,${(0.22 + 0.78 * (n / maxN)).toFixed(2)})` : '';

    $('calStats').innerHTML = statList(recs).map(([v, l]) => `<div><div class="stat-v">${esc(v)}</div><div class="stat-l">${esc(l)}</div></div>`).join('');

    let html = `<div></div>${MONTHS.map((m) => `<div class="hm-h">${m}</div>`).join('')}<div class="hm-h" style="text-align:right">Total</div>`;
    for (const y of years) {
      let tot = 0;
      html += `<div class="hm-y">${y}</div>`;
      for (let m = 1; m <= 12; m++) {
        const key = `${y}-${String(m).padStart(2, '0')}`, n = counts[key] || 0; tot += n;
        const lbl = `${MONTHS[m - 1]} ${y}: ${n} case${n === 1 ? '' : 's'}`;
        html += n
          ? `<button class="hm-c has ${st.calSel === key ? 'on' : ''}" data-m="${key}" style="background:${shade(n)};color:${n / maxN > 0.5 ? '#fff' : 'var(--ink)'}" title="${lbl}" aria-label="${lbl}">${n}</button>`
          : `<div class="hm-c" title="${lbl}"></div>`;
      }
      html += `<div class="hm-t ${tot ? '' : 'zero'}">${tot}</div>`;
    }
    $('heat').innerHTML = html;
    const steps = [1, Math.ceil(maxN / 2), maxN].filter((v, i, a) => a.indexOf(v) === i);
    $('heatLegend').innerHTML = `<span>Fewer</span>${steps.map((n) => `<span><i class="hm-sw" style="background:${shade(n)}"></i>${n}</span>`).join('')}<span>More</span><span class="legend-note">Placed by the month a case became public. Coverage is incomplete.</span>`;

    const box = $('monthList');
    const sel = st.calSel ? recs.filter((r) => r.disclosed === st.calSel) : [];
    box.hidden = !sel.length;
    if (sel.length) {
      box.innerHTML = `<h2>${MONTHS[+st.calSel.slice(5) - 1]} ${st.calSel.slice(0, 4)} · ${sel.length} case${sel.length === 1 ? '' : 's'}</h2>
        <div class="card scroll-x"><table class="tbl"><thead><tr><th>Disclosed</th><th>Company</th><th>Executive</th><th>Category</th><th>Outcome</th><th>Evidence</th></tr></thead>
        <tbody>${rowsHtml(sel)}</tbody></table></div>`;
    }
  }

  // ---------- Records ----------
  function rowsHtml(list) {
    return list.map((r) => `
      <tr data-id="${r.id}" tabindex="0">
        <td class="td-date">${esc(dateLabel(r))}</td>
        <td class="td-co">${esc(byCo[r.company_id]?.name)}</td>
        <td class="td-ex"><div>${esc(r.executive)}</div><div class="sub">${roleLine(r)}</div></td>
        <td>${esc(r.category)}</td>
        <td>${esc(r.outcome)}</td>
        <td><div class="ev">${dotHtml(r, 'sm')}${esc(tiers[r.evidence] || r.evidence)}</div></td>
      </tr>`).join('');
  }
  function renderRecords() {
    const q = st.q.trim().toLowerCase();
    const list = records
      .filter(typeOk)
      .filter((r) => !q || [byCo[r.company_id]?.name, r.executive, r.role, r.category, r.summary, r.outcome].join(' ').toLowerCase().includes(q))
      .sort((a, b) => b.disclosed.localeCompare(a.disclosed));
    $('rows').innerHTML = list.length ? rowsHtml(list) : `<tr><td colspan="6" class="empty">No records match “${esc(st.q)}”.</td></tr>`;
  }

  // ---------- About (from METHODOLOGY.md) ----------
  function renderAbout(md) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
    let out = '', list = null;
    const close = () => { if (list) { out += `</${list}>`; list = null; } };
    for (const line of md.split('\n')) {
      let m;
      if (/^# /.test(line)) continue;
      if ((m = line.match(/^## (.+)/))) { close(); out += `${out ? '</section>' : ''}<section><h2>${inline(m[1])}</h2>`; }
      else if ((m = line.match(/^\s*[-*] (.+)/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = line.match(/^\s*\d+\. (.+)/))) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; }
      else if (line.trim()) { close(); out += `<p>${inline(line)}</p>`; }
    }
    close();
    $('about').insertAdjacentHTML('beforeend', out + (out ? '</section>' : ''));
  }

  // ---------- Drawer ----------
  function openDrawer(id) {
    const r = records.find((x) => x.id === +id);
    if (!r) return;
    st.sel = r;
    const url = safeUrl(r.primary_url);
    let host = '';
    try { host = url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { /* ignore */ }
    const urlLabel = /sec\.gov$/.test(host) ? 'SEC filing' : 'Primary report';
    const srcs = (r.sources || []).map((s) => {
      const u = safeUrl(s.url);
      return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : esc(s.label)}</li>`;
    }).join('');
    $('drawer').innerHTML = `
      <div class="dr-top"><div>
        <div class="dr-meta">${esc(byCo[r.company_id]?.name)} · ${esc(dateLabel(r))}</div>
        <div class="dr-name">${esc(r.executive)}</div><div class="dr-role">${roleLine(r)}</div></div>
        <button class="dr-x" id="drClose" aria-label="Close">×</button></div>
      <div class="pills"><div class="pill">${dotHtml(r, 'sm')}${esc(tiers[r.evidence] || r.evidence)}</div>
        <div class="pill">${esc(r.category)}</div><div class="pill">${esc(r.outcome)}</div></div>
      <p class="dr-sum">${esc(r.summary)}</p>
      <div class="dr-src">
        ${url ? `<a class="src-card" href="${esc(url)}" target="_blank" rel="noopener"><div><div class="src-l">${urlLabel}</div><div class="src-h">${esc(host)}</div></div><div class="src-arrow">↗</div></a>` : ''}
        <div class="src-t">Sources</div><ul>${srcs}</ul>
      </div>`;
    $('drawer').hidden = false; $('backdrop').hidden = false;
    $('drClose').focus();
  }
  function closeDrawer() { st.sel = null; $('drawer').hidden = true; $('backdrop').hidden = true; }

  // ---------- Routing / events ----------
  function show() {
    const v = (location.hash.slice(1) || 'timeline');
    const VIEWS = ['timeline', 'calendar', 'records', 'about'];
    st.view = VIEWS.includes(v) ? v : 'timeline';
    for (const k of VIEWS) $(`v-${k}`).hidden = k !== st.view;
    document.querySelectorAll('.pChk').forEach((el) => { el.checked = st.showP; });
    document.querySelectorAll('.typeSeg').forEach((el) => { el.innerHTML = TYPES.map(([k, l]) => `<button data-type="${k}" class="${k === st.type ? 'on' : ''}">${l}</button>`).join(''); });
    if (st.view === 'calendar') renderCalendar();
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === st.view));
    if (st.view === 'timeline') renderTimeline();
    if (st.view === 'records') renderRecords();
  }

  function wire() {
    $('tabs').addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.view; if (v) location.hash = v; });
    $('scopes').addEventListener('click', (e) => { const s = e.target.closest('button')?.dataset.scope; if (s) { st.scope = s; renderTimeline(); } });
    $('showU').addEventListener('change', (e) => { st.showU = e.target.checked; renderTimeline(); });
    $('showZero').addEventListener('change', (e) => { st.showZero = e.target.checked; renderTimeline(); });
    $('back').addEventListener('click', () => { st.end = Math.max(MIN_YEAR + WINDOW - 1, st.end - STEP); renderTimeline(); });
    $('fwd').addEventListener('click', () => { st.end = Math.min(maxYear, st.end + STEP); renderTimeline(); });
    $('timeline').addEventListener('click', (e) => { const id = e.target.closest('button.dot')?.dataset.id; if (id) openDrawer(id); });
    $('rows').addEventListener('click', (e) => { const id = e.target.closest('tr')?.dataset.id; if (id) openDrawer(id); });
    $('rows').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const id = e.target.closest('tr')?.dataset.id; if (id) openDrawer(id); } });
    document.addEventListener('click', (e) => { const t = e.target.closest('.typeSeg button')?.dataset.type; if (t) { st.type = t; st.calSel = null; show(); } });
    document.addEventListener('change', (e) => { if (e.target.classList?.contains('pChk')) { st.showP = e.target.checked; st.calSel = null; show(); } });
    $('calU').addEventListener('change', (e) => { st.calU = e.target.checked; renderCalendar(); });
    $('heat').addEventListener('click', (e) => { const m = e.target.closest('button.hm-c')?.dataset.m; if (m) { st.calSel = st.calSel === m ? null : m; renderCalendar(); } });
    $('monthList').addEventListener('click', (e) => { const id = e.target.closest('tr')?.dataset.id; if (id) openDrawer(id); });
    $('q').addEventListener('input', (e) => { st.q = e.target.value; renderRecords(); });
    $('backdrop').addEventListener('click', closeDrawer);
    $('drawer').addEventListener('click', (e) => { if (e.target.closest('#drClose')) closeDrawer(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.sel) closeDrawer(); });
    window.addEventListener('hashchange', show);
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
      st.end = maxYear;
      renderAbout(md);
      wire();
      show();
    } catch (err) {
      $('err').hidden = false;
      $('err').textContent = `Could not load data (${err.message}). Serve the repo root over HTTP, e.g. python3 -m http.server, and open /app/.`;
    }
  }
  load();
})();

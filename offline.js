/* سند جايك — خرائط دون اتصال: تنزيل بلاطات المحافظات وتخزينها بالجهاز.
 * الخريطة (OpenFreeMap) تنخزّن بـ Cache API باسم offline-maps، والـ service worker يقدّمها بدون إنترنت.
 */
(function () {
  'use strict';
  const F = window.F;

  const CACHE = 'offline-maps';
  const KEY = 'sanad_offline_v1';
  const TJ = 'https://tiles.openfreemap.org/planet';
  const AVG = 22000;               // متوسط حجم البلاطة (تقدير للعرض قبل التنزيل)
  const K = 0.83867, SC = 75;      // نفس إسقاط رسم المحافظات
  // [أصغر مستوى تقريب، أكبر مستوى، نصف قطر حول مركز المحافظة بالدرجات (null = كل المحافظة)]
  const LEVELS = [[4, 10, null], [11, 11, 0.6], [12, 12, 0.3], [13, 13, 0.15], [14, 14, 0.06]];

  let el, tab = 'map', sel = '', jobs = {}, store = {};

  function load() { try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  /* ---------- حسابات البلاطات (نقية) ---------- */
  function tileOf(lng, lat, z) {
    const n = Math.pow(2, z);
    const x = Math.floor((lng + 180) / 360 * n);
    const r = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n);
    return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
  }
  function addBox(set, b, z0, z1) { // b = [غرب، جنوب، شرق، شمال]
    for (let z = z0; z <= z1; z++) {
      const a = tileOf(b[0], b[3], z), c = tileOf(b[2], b[1], z);
      for (let x = a.x; x <= c.x; x++) for (let y = a.y; y <= c.y; y++) set.add(z + '/' + x + '/' + y);
    }
  }
  function plan(name) {
    const g = F.IRAQ.govs[name], c = F.GOVS.find((x) => x.name === name), set = new Set();
    LEVELS.forEach((L) => {
      const b = L[2] == null ? g.b : [c.lng - L[2], c.lat - L[2], c.lng + L[2], c.lat + L[2]];
      addBox(set, b, L[0], L[1]);
    });
    return set;
  }
  function planAll() {
    const s = new Set();
    F.GOVS.forEach((g) => plan(g.name).forEach((t) => s.add(t)));
    return s;
  }
  const estMB = (n) => (n * AVG / 1048576);
  const fmtMB = (mb) => '<bdi dir="ltr">' + (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB</bdi>';
  const sizeEst = {};
  function estOf(name) { return sizeEst[name] || (sizeEst[name] = estMB(name === '*' ? planAll().size : plan(name).size)); }
  const have = (name) => !!store[name];
  const allDone = () => F.GOVS.every((g) => have(g.name));

  /* ---------- التنزيل ---------- */
  async function putUrl(cache, url) {
    try {
      const r = await fetch(url);
      if (r && r.ok) { await cache.put(url, r.clone()); return r; }
    } catch (e) {}
    return null;
  }

  // الأساسيات اللي بدونها الخريطة ما تفتح: TileJSON، الأنماط، الأيقونات، الخطوط
  async function infra(cache) {
    const tjRes = await putUrl(cache, TJ);
    if (!tjRes) throw new Error('tilejson');
    const tj = await tjRes.clone().json();
    const tpl = (tj.tiles && tj.tiles[0]) || '';
    if (!tpl) throw new Error('tpl');
    const fonts = {};
    let glyphs = '';
    for (const sUrl of [F.MAP_STYLE_DARK, F.MAP_STYLE_LIGHT]) {
      const r = await putUrl(cache, sUrl);
      if (!r) continue;
      let st; try { st = await r.clone().json(); } catch (e) { continue; }
      if (st.sprite) for (const suf of ['.json', '.png', '@2x.json', '@2x.png']) await putUrl(cache, st.sprite + suf);
      if (st.glyphs) glyphs = st.glyphs;
      (st.layers || []).forEach((l) => {
        const tf = l.layout && l.layout['text-font'];
        if (Array.isArray(tf)) {
          const stack = tf.filter((x) => typeof x === 'string').join(',');
          if (stack) fonts[stack] = 1;
        }
      });
    }
    if (glyphs) {
      const ranges = ['0-255', '256-511', '1536-1791', '1792-2047', '8192-8447', '64256-64511', '64512-64767', '64768-65023', '65024-65279', '65280-65535'];
      const jobs2 = [];
      Object.keys(fonts).forEach((stack) => ranges.forEach((rg) => {
        jobs2.push(glyphs.replace('{fontstack}', encodeURIComponent(stack)).replace('{range}', rg));
      }));
      await pool(jobs2, 6, (u) => putUrl(cache, u));
    }
    return tpl;
  }

  async function pool(list, n, fn, tick) {
    let i = 0;
    const run = async () => { while (i < list.length) { const k = i++; await fn(list[k], k); if (tick) tick(); } };
    await Promise.all(Array.from({ length: n }, run));
  }

  function setJob(name, patch) { jobs[name] = Object.assign(jobs[name] || {}, patch); draw(); }

  async function download(name) {
    if (jobs[name] && !jobs[name].err) return;
    if (!('caches' in window)) { F.toast('جهازك ما يدعم التنزيل بدون إنترنت', 'err'); return; }
    if (!navigator.onLine) { F.toast('تحتاج إنترنت حتى تنزّل الخريطة', 'err'); return; }
    const job = { pct: 0, cancel: false };
    jobs[name] = job; draw();
    try {
      const cache = await caches.open(CACHE);
      const tpl = await infra(cache);
      const tiles = Array.from(plan(name));
      let done = 0, bad = 0, bytes = 0;
      await pool(tiles, 8, async (t) => {
        if (job.cancel) return;
        const url = tpl.replace('{z}/{x}/{y}', t);
        if (await cache.match(url)) return;
        for (let a = 0; a < 2; a++) {
          try {
            const r = await fetch(url);
            if (r.ok) { const b = await r.clone().arrayBuffer(); bytes += b.byteLength; await cache.put(url, r); }
            else if (r.status !== 404 && r.status !== 204) { if (a) bad++; else continue; }
            return;
          } catch (e) { if (a) bad++; }
        }
      }, () => { done++; if (done % 5 === 0 || done === tiles.length) setJob(name, { pct: Math.round(done / tiles.length * 100) }); });
      if (job.cancel) { delete jobs[name]; draw(); return; }
      if (bad > tiles.length * 0.15) throw new Error('net');
      if (F.shops && F.shops.prefetch) { try { { const c = F.GOVS.find((x) => x.name === name); await F.shops.prefetch([c.lng - 0.5, c.lat - 0.5, c.lng + 0.5, c.lat + 0.5]); } } catch (e) {} }
      store[name] = { tpl: tpl, tiles: tiles.length, bytes: bytes, t: Date.now() };
      save(); delete jobs[name]; draw();
      F.toast('تم تنزيل خريطة ' + name, 'ok');
    } catch (e) {
      jobs[name] = { err: 1 }; draw();
      F.toast('فشل التنزيل. تأكد من الإنترنت وجرّب مرة ثانية.', 'err');
    }
  }

  async function downloadAll() {
    for (const g of F.GOVS) {
      if (have(g.name)) continue;
      await download(g.name);
      if (jobs[g.name]) break; // فشل أو انلغى
    }
  }

  async function remove(name) {
    try {
      const cache = await caches.open(CACHE);
      const tpl = store[name] && store[name].tpl;
      delete store[name]; save();
      if (tpl) {
        const keep = new Set();
        Object.keys(store).forEach((n) => plan(n).forEach((t) => keep.add(t)));
        for (const t of plan(name)) if (!keep.has(t)) await cache.delete(tpl.replace('{z}/{x}/{y}', t));
      }
      if (!Object.keys(store).length) await caches.delete(CACHE);
    } catch (e) {}
    draw();
  }

  /* ---------- الرسم ---------- */
  function nearest() {
    const l = F.loc();
    return l && l.source !== 'default' ? F.govOf(l.lat, l.lng) : '';
  }
  const meXY = () => {
    const l = F.loc(); if (!l || l.source === 'default') return null;
    return [(l.lng - 38.5) * K * SC + 10, (37.5 - l.lat) * SC + 10];
  };

  function svg() {
    const I = F.IRAQ, names = Object.keys(I.govs), cur = sel || nearest();
    const me = meXY();
    let h = '<svg class="off-svg" viewBox="' + I.vb + '" role="img" aria-label="خريطة محافظات العراق">' +
      '<defs><clipPath id="off-clip"><path d="' + I.outline + '"/></clipPath></defs><g clip-path="url(#off-clip)">';
    names.forEach((n) => { h += '<path class="gov' + (have(n) ? ' got' : '') + '" data-gov="' + n + '" d="' + I.govs[n].d + '"/>'; });
    if (cur && I.govs[cur]) h += '<path class="gov on" d="' + I.govs[cur].d + '"/>';
    h += '</g><path class="out" d="' + I.outline + '"/>';
    names.forEach((n) => { h += '<text class="gl" x="' + I.govs[n].l[0] + '" y="' + I.govs[n].l[1] + '">' + n + '</text>'; });
    if (me) h += '<circle class="me-r" cx="' + me[0] + '" cy="' + me[1] + '" r="9"/><circle class="me-d" cx="' + me[0] + '" cy="' + me[1] + '" r="4.5"/>';
    return h + '</svg>';
  }

  function row(name) {
    const all = name === '*';
    let j = jobs[name];
    if (all) {
      const act = F.GOVS.map((g) => jobs[g.name]).find(Boolean);
      const n = F.GOVS.filter((g) => have(g.name)).length;
      j = act ? (act.err ? { err: 1 } : { pct: Math.round((n * 100 + (act.pct || 0)) / F.GOVS.length) }) : null;
    }
    const ready = all ? allDone() : have(name);
    const mb = ready && !all && store[name] && store[name].bytes ? store[name].bytes / 1048576 : estOf(name);
    let side;
    if (j && j.err) side = '<button class="off-btn" data-dl="' + name + '">' + F.icon('download') + ' أعد المحاولة</button>';
    else if (j) side = '<button class="off-btn busy" data-cancel="' + name + '"><span class="off-pct">' + (j.pct || 0) + '%</span> إلغاء</button>';
    else if (ready) side = '<button class="off-btn del" data-del="' + name + '" aria-label="حذف">' + F.icon('trash') + '</button>';
    else side = '<button class="off-btn" data-dl="' + name + '">' + F.icon('download') + ' تنزيل</button>';
    const sub = ready ? fmtMB(mb) + '<span class="ok">جاهزة دون اتصال</span>' : fmtMB(mb);
    return '<div class="off-row' + (ready ? ' ready' : '') + '">' +
      '<div class="off-ic">' + F.icon(ready ? 'check' : 'map') + '</div>' +
      '<div class="off-t"><b>' + (all ? 'كل العراق' : name) + '</b><span>' + sub + '</span></div>' +
      side +
      (j && !j.err ? '<i class="off-bar" style="width:' + (j.pct || 0) + '%"></i>' : '') +
      '</div>';
  }

  function draw() {
    if (!el) return;
    const cur = sel || nearest();
    const names = F.GOVS.map((g) => g.name);
    const got = names.filter(have);
    let body = '';
    if (tab === 'map') {
      body += '<div class="off-card off-mapbox">' + svg() + '</div>';
      if (cur) body += '<div class="off-h g">' + (sel ? 'المحافظة المحددة' : 'مقترح لك') + '</div>' + row(cur);
      body += '<div class="off-h">كل العراق</div>' + row('*');
      if (got.length) body += '<div class="off-h">تم تنزيلها</div>' + got.filter((n) => n !== cur).map(row).join('');
    } else {
      if (got.length) body += '<div class="off-h g">تم تنزيلها</div>' + got.map(row).join('');
      body += '<div class="off-h">اكتشف العراق</div>' + row('*') +
        names.filter((n) => !have(n)).map(row).join('');
    }
    el.querySelector('#off-body').innerHTML = body;
    el.querySelectorAll('.off-seg button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  }

  function show() {
    el = F.$('#v-offline');
    load();
    el.classList.add('off');
    el.innerHTML =
      '<h1 class="off-title">خرائط دون اتصال</h1>' +
      '<div class="off-card off-info">' + F.icon('map') +
        '<div><b>دربك جاهز، حتى بلا إنترنت</b><span>حمّل خريطة محافظتك للبحث عن الأماكن والكرينات والوصول إليها دون اتصال.</span></div></div>' +
      '<div class="off-seg"><button data-tab="map">خريطة</button><button data-tab="list">قائمة</button></div>' +
      '<div id="off-body"></div>' +
      '<p class="off-note">الرسم تخطيطي للاختيار فقط. التنزيل يخزّن الخريطة بجهازك (قد يستهلك بيانات، فضّل واي فاي). بيانات الخرائط © مساهمو OpenStreetMap.</p>';
    el.onclick = (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return draw(); }
      const g = e.target.closest('[data-gov]'); if (g) { sel = g.dataset.gov; return draw(); }
      const d = e.target.closest('[data-dl]'); if (d) return d.dataset.dl === '*' ? downloadAll() : download(d.dataset.dl);
      const c = e.target.closest('[data-cancel]'); if (c) { if (c.dataset.cancel === '*') F.GOVS.forEach((x) => jobs[x.name] && (jobs[x.name].cancel = true)); else if (jobs[c.dataset.cancel]) jobs[c.dataset.cancel].cancel = true; return; }
      const x = e.target.closest('[data-del]');
      if (x) {
        const n = x.dataset.del;
        if (!confirm('تحذف الخريطة من جهازك؟')) return;
        if (n === '*') F.GOVS.forEach((g) => have(g.name) && remove(g.name)); else remove(n);
      }
    };
    draw();
  }

  F.offline = { show: show, plan: plan, planAll: planAll, tileOf: tileOf, CACHE: CACHE };
})();

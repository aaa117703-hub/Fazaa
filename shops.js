/* سند جايك — محلات تصليح السيارات والإطارات من OpenStreetMap (Overpass).
 * نجلب حسب خلايا 0.5° ونخزّنها بالجهاز حتى تشتغل بدون إنترنت.
 */
(function () {
  'use strict';
  const F = window.F;
  const KEY = 'sanad_shops_v1';
  const TTL = 14 * 864e5, CELL = 0.5, MAX_CELLS = 60;
  const EP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

  let db = null;
  const open = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { db = {}; } } return db; };
  const flush = () => {
    const d = open(), ks = Object.keys(d);
    if (ks.length > MAX_CELLS) ks.sort((a, b) => d[a].t - d[b].t).slice(0, ks.length - MAX_CELLS).forEach((k) => delete d[k]);
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { try { localStorage.removeItem(KEY); } catch (e2) {} }
  };
  const cellKey = (i, j) => i + '_' + j;
  const cellBox = (i, j) => [i * CELL, j * CELL, (i + 1) * CELL, (j + 1) * CELL]; // غرب، جنوب، شرق، شمال

  const KINDS = { car_repair: 'تصليح سيارات', tyres: 'إطارات وبنشر', car_parts: 'قطع غيار', mechanic: 'ميكانيكي', car_electrics: 'كهرباء سيارات', oil_change: 'تبديل زيوت', fuel: 'محطة وقود', restaurant: 'مطعم على الطريق الدولي', rest_area: 'استراحة على الطريق الدولي' };
  const OIL = /زيت|زيوت|oil|lube|lubric/i;
  function parse(json) {
    const out = [];
    ((json && json.elements) || []).forEach((e) => {
      const t = e.tags || {};
      const lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon;
      if (lat == null || lng == null) return;
      const k = t.amenity === 'fuel' ? 'fuel' : /^(restaurant|fast_food)$/.test(t.amenity || '') ? 'restaurant' : t.amenity === 'cafe' || /^(rest_area|services)$/.test(t.highway || '') ? 'rest_area' : t['service:vehicle:oil_change'] === 'yes' || OIL.test((t['name:ar'] || '') + ' ' + (t.name || '') + ' ' + (t['name:en'] || '')) ? 'oil_change' : t.shop === 'car_repair' || t.amenity === 'car_repair' ? 'car_repair' : t.shop === 'tyres' ? 'tyres' : t.shop === 'car_parts' ? 'car_parts' : t.craft === 'mechanic' ? 'mechanic' : t.craft === 'car_electrics' ? 'car_electrics' : 'car_repair';
      out.push([String(e.id), +lat.toFixed(5), +lng.toFixed(5), t['name:ar'] || t.name || '', t.phone || t['contact:phone'] || t.mobile || t['contact:mobile'] || '', k]);
    });
    return out;
  }
  function query(b) {
    const bb = '(' + b[1] + ',' + b[0] + ',' + b[3] + ',' + b[2] + ')';
    return '[out:json][timeout:25];(' +
      ['"shop"="car_repair"', '"amenity"="car_repair"', '"shop"="tyres"', '"shop"="car_parts"', '"craft"="mechanic"', '"craft"="car_electrics"', '"service:vehicle:oil_change"="yes"'].map((q) => 'nwr[' + q + ']' + bb + ';').join('') + 'nwr["name"~"زيوت|زيت|oil change|lube",i]' + bb + ';' +
      ');out center tags 500;';
  }
  const ALL = 'sanad_shops_all_v2';
  let allMem = null;
  function allQuery() {
    return '[out:json][timeout:120];area["ISO3166-1"="IQ"]->.a;(' +
      ['"shop"="car_repair"', '"amenity"="car_repair"', '"shop"="tyres"', '"shop"="car_parts"', '"craft"="mechanic"', '"craft"="car_electrics"', '"service:vehicle:oil_change"="yes"'].map((q) => 'nwr[' + q + '](area.a);').join('') + 'nwr["name"~"زيوت|زيت|oil change|lube",i]["shop"~"car|tyres|car_repair|car_parts"](area.a);nwr["name"~"زيوت|تبديل زيت|oil change|lube",i]["amenity"](area.a);' +
      ');out center tags 6000;';
  }
  async function allCached() {
    if (!allMem) { try { allMem = JSON.parse(localStorage.getItem(ALL) || 'null'); } catch (e) { allMem = null; } }
    return allMem && Date.now() - allMem.t < TTL ? allMem.l : null;
  }
  let failed = false;
  let allBusy = null;
  // كل العراق بطلب واحد (يتخزّن 14 يوم)
  function all(allowNet) { return allBusy || (allBusy = allImpl(allowNet).finally(() => { allBusy = null; })); }
  async function allImpl(allowNet) {
    if (!allMem) { try { allMem = JSON.parse(localStorage.getItem(ALL) || 'null'); } catch (e) { allMem = null; } }
    if (allMem && Date.now() - allMem.t < TTL) return allMem.l;
    if (allowNet !== false && navigator.onLine !== false) {
      failed = true;
      for (const u of EP) {
        try {
          const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 60000);
          const r = await fetch(u, { method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(allQuery()) }).finally(() => clearTimeout(tm));
          if (!r.ok) continue;
          const l = parse(await r.json());
          if (l.length) { failed = false; allMem = { t: Date.now(), l: l }; try { localStorage.setItem(ALL, JSON.stringify(allMem)); } catch (e) {} return l; }
        } catch (e) {}
      }
    }
    return allMem ? allMem.l : null;
  }

  async function fetchBox(b) {
    const body = 'data=' + encodeURIComponent(query(b));
    let err;
    for (const u of EP) {
      try {
        const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
        if (r.ok) return parse(await r.json());
        err = new Error('http ' + r.status);
      } catch (e) { err = e; }
    }
    throw err;
  }

  async function ensureCell(i, j, allowNet) {
    const d = open(), k = cellKey(i, j), c = d[k];
    if (c && Date.now() - c.t < TTL) return c.l;
    if (!allowNet || navigator.onLine === false) return c ? c.l : [];
    try {
      const l = await fetchBox(cellBox(i, j));
      d[k] = { t: Date.now(), l: l }; flush(); failed = false;
      return l;
    } catch (e) { failed = true; return c ? c.l : []; }
  }

  function cellsOf(b) {
    const out = [];
    for (let i = Math.floor(b[0] / CELL); i <= Math.floor(b[2] / CELL); i++)
      for (let j = Math.floor(b[1] / CELL); j <= Math.floor(b[3] / CELL); j++) out.push([i, j]);
    return out;
  }

  // محلات أضافها المستخدمون ووافق عليها المدير (جدول shops)
  const CK = 'sanad_shops_comm_v1';
  let commMem = null;
  async function comm(allowNet) {
    if (!commMem) { try { commMem = JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) { commMem = null; } }
    if (commMem && Date.now() - commMem.t < 30 * 60000) return commMem.l;
    if (allowNet !== false && navigator.onLine !== false) {
      try {
        const rows = await F.sb.q('shops', 'select=id,name,kind,phone,lat,lng&status=eq.approved&limit=3000');
        commMem = { t: Date.now(), l: (rows || []).map((r) => ['c' + r.id, +r.lat, +r.lng, r.name, r.phone || '', r.kind, 1]) };
        try { localStorage.setItem(CK, JSON.stringify(commMem)); } catch (e) {}
      } catch (e) {}
    }
    return commMem ? commMem.l : [];
  }
  const inB = (b) => (s) => s[2] >= b[0] && s[2] <= b[2] && s[1] >= b[1] && s[1] <= b[3];
  function resetComm() { commMem = null; try { localStorage.removeItem(CK); } catch (e) {} }

  // ---- استراحات ومطاعم الطريق الدولي فقط (خارج المدن) من OSM، تُخزَّن 7 أيام ----
  const HK = 'sanad_hw_v1', HTTL = 7 * 864e5, HC = 0.25;
  let hwMem = null;
  const hwLoad = () => { if (!hwMem) { try { hwMem = JSON.parse(localStorage.getItem(HK) || '{}'); } catch (e) { hwMem = {}; } } return hwMem; };
  function hwQuery(c) {
    const bb = '(' + c[1] + ',' + c[0] + ',' + (c[1] + HC) + ',' + (c[0] + HC) + ')';
    return '[out:json][timeout:40];way["highway"~"^(motorway|trunk)$"]' + bb + '->.h;' +
      '(nwr(around.h:450)["amenity"~"^(restaurant|fast_food|cafe)$"]' + bb + ';nwr(around.h:450)["highway"~"^(rest_area|services)$"]' + bb + ';)->.x;' +
      'node["place"~"^(city|town)$"](' + (c[1] - 0.1) + ',' + (c[0] - 0.1) + ',' + (c[1] + HC + 0.1) + ',' + (c[0] + HC + 0.1) + ')->.c;' +
      'nwr.x(around.c:3500)->.ic;(.x;-.ic;);out center tags 300;';
  }
  async function hwCell(c, net) {
    const key = c[0] + ',' + c[1], m = hwLoad(), e = m[key];
    if (e && Date.now() - e.t < HTTL) return e.l;
    if (!net || navigator.onLine === false) return e ? e.l : [];
    for (const u of EP) {
      try {
        const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 30000);
        const r = await fetch(u, { method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(hwQuery(c)) }).finally(() => clearTimeout(tm));
        if (!r.ok) continue;
        const l = parse(await r.json()).filter((x) => x[5] === 'restaurant' || x[5] === 'rest_area').map((x) => { x[0] = 'h' + x[0]; return x; });
        m[key] = { t: Date.now(), l: l };
        try { localStorage.setItem(HK, JSON.stringify(m)); } catch (er) {}
        return l;
      } catch (er) {}
    }
    return e ? e.l : [];
  }
  async function hwBox(b, net) {
    const x0 = Math.floor(b[0] / HC) * HC, y0 = Math.floor(b[1] / HC) * HC, cs = [];
    for (let x = x0; x <= b[2]; x += HC) for (let y = y0; y <= b[3]; y += HC) cs.push([+x.toFixed(2), +y.toFixed(2)]);
    if (cs.length > 6) return [];
    const parts = await Promise.all(cs.map((c) => hwCell(c, net)));
    const out = [];
    parts.forEach((l) => l.forEach((s) => { if (s[2] >= b[0] && s[2] <= b[2] && s[1] >= b[1] && s[1] <= b[3]) out.push(s); }));
    return out;
  }

  async function inBox(b, allowNet) {
    const C = (await comm(allowNet)).filter(inB(b));
    const [O, H] = await Promise.all([inBoxOsm(b, allowNet), hwBox(b, allowNet !== false).catch(() => [])]);
    const seen = {}; return C.concat(O, H).filter((x) => (seen[x[0]] ? false : (seen[x[0]] = 1)));
  }

  function addShop() {
    if (F.isGuest()) { F.toast('سجّل دخول أول حتى تضيف محل.', 'err'); return; }
    const admin = F.isRealAdmin();
    let loc = F.loc().source === 'default' ? null : { lat: F.loc().lat, lng: F.loc().lng };
    const m = F.modal(
      '<h2>' + F.icon('wrench') + ' أضف محل تصليح</h2>' +
      '<p class="muted small">' + (admin ? 'كمدير: المحل يظهر فوراً.' : 'المحل يظهر للجميع بعد مراجعة الإدارة.') + '</p>' +
      '<form id="sh-form" novalidate>' +
      '<div class="field"><label>اسم المحل</label><input id="sh-name" maxlength="60"></div>' +
      '<div class="field"><label>النوع</label><select id="sh-kind">' + Object.keys(KINDS).map((k) => '<option value="' + k + '">' + KINDS[k] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>رقم الهاتف (اختياري)</label><input id="sh-phone" class="ltr" inputmode="tel" maxlength="16"></div>' +
      '<div class="field"><label>ملاحظة (اختياري)</label><input id="sh-note" maxlength="140" placeholder="مثال: يشتغل 24 ساعة، متخصص كهرباء"></div>' +
      '<div class="field"><label>الموقع</label><button type="button" class="btn secondary" id="sh-loc">' + F.icon('pin') + (loc ? ' موقعي الحالي (اضغط للتغيير)' : ' حدد موقع المحل على الخريطة') + '</button></div>' +
      '<div class="err" id="sh-err" style="margin-bottom:8px"></div>' +
      '<div class="row"><button class="btn grow" type="submit">' + (admin ? 'إضافة' : 'أرسل للمراجعة') + '</button><button class="btn secondary" type="button" id="sh-x">إلغاء</button></div></form>');
    const $ = (i) => F.$(i, m.el);
    $('#sh-x').onclick = m.close;
    $('#sh-loc').onclick = async () => { const p = await F.pickLocation(loc); if (p) { loc = p; $('#sh-loc').innerHTML = F.icon('check-circle') + ' تم تحديد الموقع'; } };
    $('#sh-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = $('#sh-name').value.trim(), ph = F.cleanPhone($('#sh-phone').value), err = $('#sh-err');
      if (name.length < 2) { err.textContent = 'اكتب اسم المحل.'; return; }
      if (ph && !F.validPhone(ph)) { err.textContent = 'الرقم لازم 11 رقم ويبدأ بـ 07.'; return; }
      if (!loc) { err.textContent = 'حدد موقع المحل.'; return; }
      try {
        await F.sb.q('shops', '', { method: 'POST', body: { name: name, kind: $('#sh-kind').value, phone: ph || null, note: $('#sh-note').value.trim() || null, lat: loc.lat, lng: loc.lng, governorate: F.govOf ? F.govOf(loc.lat, loc.lng) : null, status: admin ? 'approved' : 'pending' } });
        resetComm(); m.close();
        F.toast(admin ? 'تمت الإضافة' : 'وصل طلبك. راح نراجعه ونضيفه قريباً.', 'ok');
        if (F.home && F.home.reloadShops) F.home.reloadShops();
      } catch (ex) { err.textContent = F.errMsg(ex); }
    };
  }

  // المصدر الأول: جدول places بقاعدة البيانات (مستورد ومنظّف، نفس الشي لكل المستخدمين).
  // إذا الجدول فارغ أو السيرفر ما رد، نرجع للطريقة القديمة (Overpass من الجهاز).
  const SRV_KINDS = ['car_repair', 'tyres', 'car_parts', 'mechanic', 'car_electrics', 'oil_change', 'fuel']; // بدون محطات الوقود (طبقة مستقلة لاحقاً)
  let srvDownUntil = 0; // إذا السيرفر فشل نوقف المحاولة دقيقتين
  async function inBoxSrv(b) {
    const rows = await F.sb.rpc('places_in_bbox', { p_west: b[0], p_south: b[1], p_east: b[2], p_north: b[3], p_kinds: SRV_KINDS, p_limit: 800 });
    return (rows || []).map((r) => ['p' + r.id, +r.lat, +r.lng, r.name_ar || r.name || '', r.phone || '', r.kind, 0, r.governorate || '']);
  }

  // محلات داخل صندوق (غرب، جنوب، شرق، شمال). allowNet=false: من الذاكرة فقط.
  async function inBoxOsm(b, allowNet) {
    if (allowNet !== false && navigator.onLine !== false && F.sb && Date.now() > srvDownUntil) {
      try {
        const S = await inBoxSrv(b);
        if (S.length) return S; // السيرفر عنده بيانات لهذي المنطقة
      } catch (e) { srvDownUntil = Date.now() + 120000; }
    }
    // السيرفر فارغ لهذي المنطقة أو ما رد: نكمل بالطريقة القديمة
    // إذا قائمة كل العراق جاهزة نستخدمها، وإلا نجلب الخلايا القريبة بسرعة ونكمل كل العراق بالخلفية
    const A = await allCached();
    if (!A && allowNet !== false) all(true).catch(() => {});
    if (A) return A.filter((s) => s[2] >= b[0] && s[2] <= b[2] && s[1] >= b[1] && s[1] <= b[3]);
    const cs = cellsOf(b);
    if (cs.length > 6) return [];
    const parts = await Promise.all(cs.map((c) => ensureCell(c[0], c[1], allowNet !== false)));
    const seen = {}, out = [];
    parts.forEach((l) => l.forEach((s) => {
      if (seen[s[0]] || s[2] < b[0] || s[2] > b[2] || s[1] < b[1] || s[1] > b[3]) return;
      seen[s[0]] = 1; out.push(s);
    }));
    return out;
  }

  // تحميل مسبق لمحافظة كاملة (عند تنزيل الخريطة)
  async function prefetch(b) {
    if (await allCached()) return;
    for (const c of cellsOf(b)) await ensureCell(c[0], c[1], true);
  }

  F.shops = { add: addShop, resetComm: resetComm, failed: () => failed, all: all, inBox: inBox, prefetch: prefetch, parse: parse, query: query, KINDS: KINDS, cellsOf: cellsOf };
})();

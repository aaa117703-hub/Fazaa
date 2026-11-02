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

  const KINDS = { car_repair: 'تصليح سيارات', tyres: 'إطارات وبنشر', car_parts: 'قطع غيار', mechanic: 'ميكانيكي', car_electrics: 'كهرباء سيارات' };
  function parse(json) {
    const out = [];
    ((json && json.elements) || []).forEach((e) => {
      const t = e.tags || {};
      const lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon;
      if (lat == null || lng == null) return;
      const k = t.shop === 'car_repair' || t.amenity === 'car_repair' ? 'car_repair' : t.shop === 'tyres' ? 'tyres' : t.shop === 'car_parts' ? 'car_parts' : t.craft === 'mechanic' ? 'mechanic' : t.craft === 'car_electrics' ? 'car_electrics' : 'car_repair';
      out.push([String(e.id), +lat.toFixed(5), +lng.toFixed(5), t['name:ar'] || t.name || '', t.phone || t['contact:phone'] || t.mobile || t['contact:mobile'] || '', k]);
    });
    return out;
  }
  function query(b) {
    const bb = '(' + b[1] + ',' + b[0] + ',' + b[3] + ',' + b[2] + ')';
    return '[out:json][timeout:25];(' +
      ['"shop"="car_repair"', '"amenity"="car_repair"', '"shop"="tyres"', '"shop"="car_parts"', '"craft"="mechanic"', '"craft"="car_electrics"'].map((q) => 'nwr[' + q + ']' + bb + ';').join('') +
      ');out center tags 500;';
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
      d[k] = { t: Date.now(), l: l }; flush();
      return l;
    } catch (e) { return c ? c.l : []; }
  }

  function cellsOf(b) {
    const out = [];
    for (let i = Math.floor(b[0] / CELL); i <= Math.floor(b[2] / CELL); i++)
      for (let j = Math.floor(b[1] / CELL); j <= Math.floor(b[3] / CELL); j++) out.push([i, j]);
    return out;
  }

  // محلات داخل صندوق (غرب، جنوب، شرق، شمال). allowNet=false: من الذاكرة فقط.
  async function inBox(b, allowNet) {
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
    for (const c of cellsOf(b)) await ensureCell(c[0], c[1], true);
  }

  F.shops = { inBox: inBox, prefetch: prefetch, parse: parse, query: query, KINDS: KINDS, cellsOf: cellsOf };
})();

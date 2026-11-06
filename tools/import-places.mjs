#!/usr/bin/env node
// سند جايك — يسحب ورش وإطارات وقطع غيار من OpenStreetMap لكل المحافظات ويرفعها لجدول places.
// يشتغل على جهازك (Node 18+). السيرفرات العامة تحجب Supabase بس غالباً ما تحجب جهازك.
//
// الاستعمال:
//   IMPORT_KEY=<المفتاح السري> node tools/import-places.mjs            # كل المحافظات
//   IMPORT_KEY=... node tools/import-places.mjs بغداد البصرة            # محافظات محددة
//   IMPORT_KEY=... DRY_RUN=1 node tools/import-places.mjs بغداد         # تجربة بدون كتابة
//
// المفتاح: من لوحة Supabase > SQL Editor:
//   select value from app_secrets where key = 'import_places_key';
// البيانات © مساهمو OpenStreetMap (ODbL).

const FN = process.env.FN_URL || 'https://hwlpzlfimplzkdleaclw.supabase.co/functions/v1/import-places';
const KEY = process.env.IMPORT_KEY;
const DRY = !!process.env.DRY_RUN;
const ATTR = '© OpenStreetMap contributors (ODbL)';
const ISO = { 'بغداد': 'IQ-BG', 'البصرة': 'IQ-BA', 'ذي قار': 'IQ-DQ', 'ميسان': 'IQ-MA', 'واسط': 'IQ-WA', 'القادسية': 'IQ-QA', 'المثنى': 'IQ-MU', 'النجف': 'IQ-NA', 'كربلاء': 'IQ-KA', 'بابل': 'IQ-BB', 'الأنبار': 'IQ-AN', 'ديالى': 'IQ-DI', 'صلاح الدين': 'IQ-SD', 'كركوك': 'IQ-KI', 'نينوى': 'IQ-NI', 'أربيل': 'IQ-AR', 'السليمانية': 'IQ-SU', 'دهوك': 'IQ-DA', 'حلبجة': 'IQ-HA' };
const EP = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function kindOf(t) {
  if (t.amenity === 'fuel') return 'fuel';
  if (t.shop === 'tyres') return 'tyres';
  if (t.shop === 'car_parts') return 'car_parts';
  if (t.craft === 'mechanic') return 'mechanic';
  if (t.craft === 'car_electrics') return 'car_electrics';
  return 'car_repair';
}
export function toRow(e) {
  const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return {
    source_id: `${(e.type || 'x')[0]}${e.id}`, kind: kindOf(t),
    name: t.name || t['name:en'] || null, name_ar: t['name:ar'] || null,
    phone: t.phone || t['contact:phone'] || t.mobile || t['contact:mobile'] || null,
    lat, lng, attribution: ATTR,
  };
}
const query = (iso) => `[out:json][timeout:180];area["ISO3166-2"="${iso}"]->.a;(` +
  `nwr["shop"~"^(car_repair|tyres|car_parts)$"](area.a);nwr["amenity"~"^(car_repair|fuel)$"](area.a);` +
  `nwr["craft"~"^(mechanic|car_electrics)$"](area.a););out center tags qt;`;

async function overpass(iso) {
  let last = '';
  for (let round = 0; round < 3; round++) {
    for (const u of EP) {
      try {
        const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SanadJaik-places-importer/1.0' }, body: 'data=' + encodeURIComponent(query(iso)), signal: AbortSignal.timeout(200000) });
        if (!r.ok) { last = `${new URL(u).host} http ${r.status}`; continue; }
        const d = await r.json();
        if (d.remark && !(d.elements || []).length) { last = `${new URL(u).host}: ${d.remark}`; continue; }
        return d.elements || [];
      } catch (e) { last = `${new URL(u).host}: ${e.message}`; }
    }
    await sleep(15000 * (round + 1));
  }
  throw new Error(last);
}

async function call(body) {
  const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-import-key': KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j)}`);
  return j;
}

async function main() {
  if (!KEY) { console.error('حط المفتاح: IMPORT_KEY=... node tools/import-places.mjs'); process.exit(1); }
  const want = process.argv.slice(2), govs = want.length ? want : Object.keys(ISO);
  const bad = govs.filter((g) => !ISO[g]);
  if (bad.length) { console.error('محافظة غير معروفة:', bad.join(', ')); process.exit(1); }
  const summary = [];
  for (const gov of govs) {
    const started = new Date().toISOString();
    process.stdout.write(`${gov}: جلب من OSM... `);
    let els;
    try { els = await overpass(ISO[gov]); } catch (e) { console.log('فشل —', e.message); summary.push([gov, 'فشل']); continue; }
    const rows = els.map(toRow).filter(Boolean);
    process.stdout.write(`${rows.length} مكان، رفع... `);
    let up = 0, skipped = 0;
    for (let i = 0; i < rows.length; i += 1000) {
      const j = await call({ action: 'ingest', gov, source: 'osm', rows: rows.slice(i, i + 1000), dry_run: DRY });
      up += j.upserted ?? j.valid ?? 0; skipped += j.skipped || 0;
    }
    let del = 0;
    if (!DRY && rows.length) del = (await call({ action: 'prune', gov, source: 'osm', before: started })).deleted;
    console.log(`تم (${up} مكان، تخطّى ${skipped}، حُذف القديم ${del})${DRY ? ' [تجربة]' : ''}`);
    summary.push([gov, up]);
    await sleep(5000);
  }
  console.log('\nالملخص:'); for (const [g, n] of summary) console.log(`  ${g}: ${n}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });

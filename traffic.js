/* سند جايك — طبقة الزحام والترافيك.
 * مخفية تماماً حتى تتفعّل من قاعدة البيانات: جدول app_settings، المفتاح traffic، القيمة مثلاً:
 *   { "on": true, "type": "geojson", "url": "https://...", "attribution": "© المصدر", "refresh_s": 120 }
 *   { "on": true, "type": "raster",  "url": "https://.../{z}/{x}/{y}.png", "attribution": "© المصدر" }
 * type=geojson: خطوط (LineString) وكل خط عنده خاصية level بقيمة: free | moderate | heavy | blocked.
 *   إذا المصدر يسمّي الخاصية بشكل ثاني نعدّل LEVEL_PROP / COLORS تحت.
 * نستعمل فقط بيانات عندنا موافقة رسمية على استخدامها. الرابط لازم https.
 */
(function () {
  'use strict';
  const F = window.F;
  const SRC = 'sanad-traffic', LYR = 'sanad-traffic-l', KEY = 'sanad_traffic_on';
  const LEVEL_PROP = 'level';
  const COLORS = { free: '#10B981', moderate: '#F59E0B', heavy: '#EF4444', blocked: '#7F1D1D' };

  let cfg = null, map = null, on = false, timer = null;

  async function load() {
    try {
      const rows = await F.sb.q('app_settings', 'select=key,value&key=eq.traffic');
      const v = rows && rows[0] && rows[0].value;
      const okType = v && (v.type === 'geojson' || v.type === 'raster');
      cfg = v && v.on && okType && typeof v.url === 'string' && /^https:\/\//.test(v.url) ? v : null;
    } catch (e) { cfg = null; }
    return cfg;
  }

  function firstSymbol() {
    const ls = (map.getStyle() || {}).layers || [];
    const s = ls.find((l) => l.type === 'symbol');
    return s ? s.id : undefined; // نحط الزحام تحت أسماء الشوارع
  }

  function add() {
    if (!map || !cfg || !on || !map.isStyleLoaded()) return;
    try {
      if (map.getLayer(LYR)) map.removeLayer(LYR);
      if (map.getSource(SRC)) map.removeSource(SRC);
      if (cfg.type === 'raster') {
        map.addSource(SRC, { type: 'raster', tiles: [cfg.url], tileSize: 256, attribution: cfg.attribution || '' });
        map.addLayer({ id: LYR, type: 'raster', source: SRC, paint: { 'raster-opacity': 0.85 } }, firstSymbol());
      } else {
        map.addSource(SRC, { type: 'geojson', data: cfg.url, attribution: cfg.attribution || '' });
        map.addLayer({
          id: LYR, type: 'line', source: SRC,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 12, 4, 16, 7],
            'line-color': ['match', ['get', LEVEL_PROP], 'free', COLORS.free, 'moderate', COLORS.moderate, 'heavy', COLORS.heavy, 'blocked', COLORS.blocked, '#94A3B8']
          }
        }, firstSymbol());
      }
    } catch (e) { /* الخريطة ما جاهزة: نعيد المحاولة عند style.load */ }
  }

  function remove() {
    try {
      if (map && map.getLayer(LYR)) map.removeLayer(LYR);
      if (map && map.getSource(SRC)) map.removeSource(SRC);
    } catch (e) {}
  }

  function schedule() {
    clearInterval(timer);
    if (!on || !cfg || cfg.type !== 'geojson') return;
    const s = Math.max(60, +cfg.refresh_s || 120);
    timer = setInterval(() => {
      try { const src = map.getSource(SRC); if (src && src.setData && navigator.onLine !== false) src.setData(cfg.url); } catch (e) {}
    }, s * 1000);
  }

  function set(chip, v) {
    on = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {}
    chip.classList.toggle('on', v);
    if (v) { add(); schedule(); } else { remove(); clearInterval(timer); }
  }

  // نضيف زر الزحام فقط إذا الميزة مفعّلة من قاعدة البيانات
  async function mount(m, chipsBox) {
    map = m;
    if (!map || !chipsBox || !(await load())) return;
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.id = 'h-traffic';
    chip.textContent = 'الزحام المباشر';
    chipsBox.insertBefore(chip, chipsBox.firstChild);
    chip.onclick = () => set(chip, !on);
    map.on('style.load', () => { if (on) add(); }); // بعد تبديل النمط الداكن/الفاتح
    let saved = false;
    try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (saved) {
      if (map.isStyleLoaded()) set(chip, true);
      else map.once('load', () => set(chip, true));
    }
  }

  F.traffic = { mount: mount };
})();

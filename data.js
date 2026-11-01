/* سند جايك — البيانات والدوال المشتركة
 * الإعدادات والموقع محليّة. بيانات الكرينات والطلبات من Supabase (sb.js).
 */
(function () {
  'use strict';
  const F = (window.F = window.F || {});

  F.K = {
    user: 'fazaa_user',
    session: 'fazaa_session',
    cranes: 'fazaa_cranes',
    events: 'fazaa_events',
    pin: 'fazaa_admin_pin',
    consent: 'fazaa_consent',
    loc: 'fazaa_loc',
    seeded: 'fazaa_seeded_v1',
    settings: 'sanad_settings'
  };

  F.CENTER = { lat: 33.2, lng: 43.7 }; // مركز العراق (عرض البلد كامل)
  // محافظات العراق (مركز كل محافظة) — للفلترة وتحديد الموقع يدوياً
  F.GOVS = [
    ['بغداد', 33.3152, 44.3661], ['البصرة', 30.5085, 47.7835], ['ذي قار', 31.0439, 46.2573], ['ميسان', 31.8356, 47.1458],
    ['واسط', 32.5126, 45.8183], ['القادسية', 31.9889, 44.9264], ['المثنى', 31.3189, 45.2864], ['النجف', 31.9929, 44.3365],
    ['كربلاء', 32.616, 44.0249], ['بابل', 32.4833, 44.4333], ['الأنبار', 33.4258, 43.2989], ['ديالى', 33.75, 44.6333],
    ['صلاح الدين', 34.6071, 43.6782], ['كركوك', 35.4681, 44.3922], ['نينوى', 36.335, 43.1189], ['أربيل', 36.1912, 44.0092],
    ['السليمانية', 35.5613, 45.4309], ['دهوك', 36.8679, 42.9885], ['حلبجة', 35.1778, 45.9861]
  ].map((g) => ({ name: g[0], lat: g[1], lng: g[2] }));
  // أقرب محافظة لنقطة (تقريبي، حسب مركز المحافظة)
  F.govOf = function (lat, lng) {
    let best = null, bd = 1e9;
    F.GOVS.forEach((g) => { const d = Math.hypot(g.lat - lat, (g.lng - lng) * 0.85); if (d < bd) { bd = d; best = g; } });
    return best ? best.name : '';
  };
  F.TYPES = ['سحب', 'سطحة', 'هيدروليك', 'ثقيل', 'ونش', 'ميكانيك متنقل', 'بنشر وإطارات', 'بطارية', 'وقود'];
  F.STALE_MS = 3 * 3600 * 1000; // بعد 3 ساعات بدون تحديث نحذّر الزبون

  F.PACKAGES = [
    {
      id: 'free', name: 'مجاني', price: 0, unit: '',
      features: [
        { t: 'الظهور بالقائمة والخريطة' },
        { t: 'اتصال مباشر من الزبائن' },
        { t: 'بدون أولوية', soon: false }
      ]
    },
    {
      id: 'basic', name: 'أساسي', price: 10000, unit: 'دينار / شهر',
      features: [
        { t: 'كل مميزات المجاني' },
        { t: 'إحصائيات الاتصالات' },
        { t: 'شارة «موثق» بعد زيارة وتحقق ميداني' },
        { t: 'دعم مباشر' }
      ]
    },
    {
      id: 'premium', name: 'مميز', price: 20000, unit: 'دينار / شهر',
      features: [
        { t: 'كل مميزات الأساسي' },
        { t: 'شارة «مميز» بالقائمة' },
        { t: 'أولوية ظهور', soon: true },
        { t: 'إشعارات الطلبات', soon: true },
        { t: 'صفحة شخصية', soon: true }
      ]
    },
    {
      id: 'annual', name: 'سنوي', price: 100000, unit: 'دينار / سنة',
      features: [
        { t: 'كل مميزات المميز' },
        { t: 'خصم 20% عن الدفع الشهري' }
      ]
    }
  ];

  /* ---------- أدوات عامة ---------- */
  F.$ = (s, r) => (r || document).querySelector(s);
  F.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  F.get = function (k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch (e) { return d; }
  };
  F.set = function (k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { F.toast('تعذّر الحفظ على الجهاز (المساحة ممتلئة أو التخزين معطّل)', 'err'); return false; }
  };
  F.del = function (k) { try { localStorage.removeItem(k); } catch (e) {} };

  /* ---------- الإعدادات ---------- */
  const DEFAULT_SETTINGS = { theme: 'auto', reduceMotion: false, onlyAvail: false, hideDemo: false };
  F.getSettings = () => Object.assign({}, DEFAULT_SETTINGS, F.get(F.K.settings, {}));
  F.resolveTheme = function (pref) {
    pref = pref || F.getSettings().theme;
    if (pref === 'auto') {
      return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return pref === 'light' ? 'light' : 'dark';
  };
  F.applySettings = function () {
    const s = F.getSettings();
    const root = document.documentElement;
    const theme = F.resolveTheme(s.theme);
    root.setAttribute('data-theme', theme);
    root.classList.toggle('reduce-motion', !!s.reduceMotion);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F5F7' : '#101214');
  };
  F.saveSettings = function (patch) {
    F.set(F.K.settings, Object.assign(F.getSettings(), patch));
    F.applySettings();
  };
  try {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (F.getSettings().theme === 'auto') F.applySettings();
    });
  } catch (e) {}

  F.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  F.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  F.rand = (a, b) => a + Math.random() * (b - a);

  // أرقام عربية/فارسية → إنجليزية
  F.digits = function (s) {
    return String(s == null ? '' : s)
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  };
  // يقبل 07701234567 أو +964 770 123 4567 ويرجّعها 07701234567
  F.cleanPhone = function (s) {
    let p = F.digits(s).replace(/[\s\-+()]/g, '');
    if (/^9647\d{9}$/.test(p)) p = '0' + p.slice(3);
    return p;
  };
  F.validPhone = (p) => /^07\d{9}$/.test(p);

  F.firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';

  F.dist = function (a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  F.fmtDist = (km) => (km < 1 ? Math.max(50, Math.round(km * 1000 / 50) * 50) + ' م' : km.toFixed(1) + ' كم');

  F.ago = function (ts) {
    if (!ts) return '—';
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'الآن';
    if (s < 3600) return 'قبل ' + Math.floor(s / 60) + ' د';
    if (s < 86400) return 'قبل ' + Math.floor(s / 3600) + ' س';
    return 'قبل ' + Math.floor(s / 86400) + ' يوم';
  };
  F.fmtDate = function (ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('ar-IQ-u-nu-latn', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('ar-IQ-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
  };
  F.isToday = (ts) => new Date(ts).toDateString() === new Date().toDateString();
  F.money = (n) => Number(n).toLocaleString('en-US');

  F.toast = function (msg, kind) {
    const root = F.$('#toasts');
    if (!root) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  };

  // نافذة منبثقة. يرجّع { el, close }
  F.modal = function (html, opts) {
    opts = opts || {};
    const root = F.$('#modal-root');
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    root.appendChild(ov);
    function close() {
      document.removeEventListener('keydown', onKey);
      ov.remove();
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    ov.addEventListener('mousedown', (e) => { if (e.target === ov && !opts.sticky) close(); });
    document.addEventListener('keydown', onKey);
    return { el: F.$('.sheet', ov), close };
  };

  F.download = function (filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- الموقع ---------- */
  F.loc = function () {
    return F.get(F.K.loc, null) || { lat: F.CENTER.lat, lng: F.CENTER.lng, source: 'default', at: 0 };
  };
  F.setLoc = function (lat, lng, source) {
    const l = { lat: lat, lng: lng, source: source, at: Date.now() };
    F.set(F.K.loc, l);
    return l;
  };
  F.locLabel = function (l) {
    if (l.source === 'gps') return 'موقعك الحالي (GPS) · ' + F.ago(l.at);
    if (l.source === 'manual') return 'موقع حدّدته يدوياً';
    return 'موقعك غير محدد — فعّل GPS أو اختر محافظتك';
  };

  // GPS بشكل Promise
  F.getGPS = function () {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject({ code: 0 });
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => reject(e),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  };
  F.gpsError = function (e) {
    if (e && e.code === 1) return 'ما أعطيت إذن الموقع. فعّله من إعدادات المتصفح أو حدّد موقعك يدوياً.';
    if (e && e.code === 3) return 'انتهت مهلة تحديد الموقع. جرّب مرة ثانية أو حدّده يدوياً.';
    return 'تعذّر تحديد موقعك. حدّده يدوياً على الخريطة.';
  };

  /* ---------- الخريطة: MapLibre GL + OpenFreeMap (مجانية، بدون مفتاح) ---------- */
  // نجرّب النمط الداكن، وإذا ما انفتح نرجع للنمط الافتراضي.
  F.MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';
  F.MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
  // الأول: بلاطات جاهزة (صور) أسماؤها العربية مرسومة من الخادم، فتطلع واضحة ومتصلة الحروف.
  // إذا ما تحمّلت نرجع لأنماط OpenFreeMap (متجهة).
  const rasterStyle = (kind) => {
    const hi = (window.devicePixelRatio || 1) > 1.4 ? '@2x' : '';
    return {
      version: 8,
      sources: { base: { type: 'raster', tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap © CARTO',
        tiles: ['a', 'b', 'c', 'd'].map((x) => 'https://' + x + '.basemaps.cartocdn.com/' + kind + '/{z}/{x}/{y}' + hi + '.png') } },
      layers: [{ id: 'base', type: 'raster', source: 'base' }]
    };
  };
  F.mapStyles = () => {
    const t = F.resolveTheme() === 'light' ? 'light' : 'dark';
    const own = rasterStyle(t === 'light' ? 'rastertiles/voyager' : 'dark_all');
    return [own].concat(t === 'light' ? [F.MAP_STYLE_LIGHT, F.MAP_STYLE_DARK] : [F.MAP_STYLE_DARK, F.MAP_STYLE_LIGHT]);
  };
  F.hasMap = () => !!window.maplibregl;

  let rtlTried = false;
  // يخلي أسماء الشوارع تظهر بالعربي (name:ar) إذا موجودة بخرائط OSM
  F.localizeMap = function (map) {
    try {
      (map.getStyle().layers || []).forEach((l) => {
        const tf = l.layout && l.layout['text-field'];
        if (tf && JSON.stringify(tf).indexOf('name') > -1) {
          map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:ar'], ['get', 'name']]);
        }
      });
    } catch (e) {}
  };

  F.createMap = function (container, center, zoom) {
    const ml = window.maplibregl;
    if (!ml) return null;
    if (!rtlTried) {
      rtlTried = true;
      try { ml.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', true); } catch (e) {}
    }
    const styles = F.mapStyles();
    let idx = 0, loaded = false, sawTile = false;
    const map = new ml.Map({
      container: container,
      style: styles[0],
      center: [center.lng, center.lat],
      zoom: zoom || 13,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false
    });
    try { map.touchZoomRotate.disableRotation(); } catch (e) {}
    map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-left');
    const next = () => { if (idx < styles.length - 1) { idx++; loaded = false; map.setStyle(styles[idx]); } };
    map.on('style.load', () => { loaded = true; F.localizeMap(map); });
    map.on('data', (e) => { if (e.sourceId === 'base' && e.tile) sawTile = true; });
    map.on('error', () => { if (!loaded) next(); });
    // البلاطات الجاهزة ما تفشل عند تحميل النمط، فنراقبها: إذا ما وصل ولا بلاطة خلال 8 ثواني ننتقل للنمط التالي
    setTimeout(() => { if (idx === 0 && !sawTile) next(); }, 8000);
    return map;
  };

  // دبوس: عنصر خارجي (MapLibre يحرّكه) + عنصر داخلي (نحن ننسّقه)
  F.marker = function (map, lat, lng, cls, emoji, popupHtml) {
    const el = document.createElement('div');
    el.innerHTML = '<div class="pin ' + cls + '">' + (emoji || '') + '</div>';
    const m = new maplibregl.Marker({ element: el, anchor: cls === 'me' ? 'center' : 'bottom' }).setLngLat([lng, lat]);
    if (popupHtml) m.setPopup(new maplibregl.Popup({ offset: cls === 'me' ? 14 : 44, closeButton: false }).setHTML(popupHtml));
    return m.addTo(map);
  };
  F.markerSet = function (m, lat, lng, cls, popupHtml) {
    m.setLngLat([lng, lat]);
    const inner = m.getElement().firstChild;
    if (inner) inner.className = 'pin ' + cls;
    if (popupHtml && m.getPopup()) m.getPopup().setHTML(popupHtml);
  };

  // اختيار موقع بالنقر على الخريطة. يرجّع Promise<{lat,lng}|null>
  F.pickLocation = function (initial) {
    return new Promise((resolve) => {
      if (!F.hasMap()) { F.toast('الخريطة غير متوفرة حالياً (تحتاج إنترنت أول مرة)', 'err'); return resolve(null); }
      let chosen = null, done = false, map = null;
      const m = F.modal(
        '<h2>حدّد الموقع على الخريطة</h2>' +
        '<p class="muted small">اضغط على الخريطة لتثبيت الدبوس.</p>' +
        '<div id="pick-map" class="map map-pick"></div>' +
        '<div class="row mt"><button class="btn grow" id="pick-ok" disabled>تأكيد الموقع</button>' +
        '<button class="btn secondary" id="pick-cancel">إلغاء</button></div>',
        { onClose: () => { try { if (map) map.remove(); } catch (e) {} if (!done) { done = true; resolve(null); } } }
      );
      const start = initial || F.CENTER;
      map = F.createMap(F.$('#pick-map', m.el), start, initial && initial.source !== 'default' ? 14 : 6);
      let pin = null;
      map.on('click', (e) => {
        chosen = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        if (pin) pin.setLngLat(e.lngLat);
        else pin = new maplibregl.Marker({ color: '#FF6B2C' }).setLngLat(e.lngLat).addTo(map);
        F.$('#pick-ok', m.el).disabled = false;
      });
      setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
      F.$('#pick-ok', m.el).onclick = () => { done = true; m.close(); resolve(chosen); };
      F.$('#pick-cancel', m.el).onclick = () => m.close();
    });
  };

})();

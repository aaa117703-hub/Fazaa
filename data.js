/* سند جايك — البيانات والدوال المشتركة
 * المرحلة 1: كل شي يتخزن بجهاز المستخدم (localStorage).
 * لا توجد مزامنة بين الأجهزة — هذا يتغير مع Supabase بالمرحلة 3.
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

  F.CENTER = { lat: 31.0439, lng: 46.2573 }; // الناصرية
  F.TYPES = ['سحب', 'سطحة', 'هيدروليك', 'ثقيل', 'ونش'];
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

  /* ---------- المستخدم ---------- */
  F.user = () => F.get(F.K.user, null);
  F.setUser = (u) => F.set(F.K.user, u);
  F.loggedIn = () => !!F.user() && F.get(F.K.session, false) === true;

  /* ---------- الكرينات ---------- */
  F.cranes = () => F.get(F.K.cranes, []);
  F.saveCranes = (arr) => F.set(F.K.cranes, arr);
  F.myCrane = function () {
    const u = F.user();
    return u ? F.cranes().find((c) => c.ownerPhone === u.phone) || null : null;
  };
  F.updateCrane = function (id, patch) {
    const arr = F.cranes();
    const i = arr.findIndex((c) => c.id === id);
    if (i < 0) return null;
    arr[i] = Object.assign({}, arr[i], patch);
    F.saveCranes(arr);
    return arr[i];
  };

  /* ---------- السجل (الأحداث) ---------- */
  F.events = () => F.get(F.K.events, []);
  F.logEvent = function (type, data) {
    const arr = F.events();
    arr.push(Object.assign({ id: F.uid(), type: type, at: Date.now() }, data));
    if (arr.length > 2000) arr.splice(0, arr.length - 2000);
    F.set(F.K.events, arr);
  };
  F.logCall = function (crane) {
    const u = F.user() || {};
    F.logEvent('call', {
      craneId: crane.id,
      craneName: crane.name,
      by: { name: u.name || '', phone: u.phone || '' },
      demo: !!crane.demo
    });
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
    return 'موقعك غير محدد — المسافات تقديرية من مركز الناصرية';
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
  F.mapStyles = () => (F.resolveTheme() === 'light'
    ? [F.MAP_STYLE_LIGHT, F.MAP_STYLE_DARK]
    : [F.MAP_STYLE_DARK, F.MAP_STYLE_LIGHT]);
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
    let idx = 0, loaded = false;
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
    map.on('style.load', () => { loaded = true; F.localizeMap(map); });
    map.on('error', () => {
      if (!loaded && idx < styles.length - 1) { idx++; map.setStyle(styles[idx]); }
    });
    return map;
  };

  // دبوس: عنصر خارجي (MapLibre يحرّكه) + عنصر داخلي (نحن ننسّقه)
  F.marker = function (map, lat, lng, cls, emoji, popupHtml) {
    const el = document.createElement('div');
    el.innerHTML = '<div class="pin ' + cls + '">' + (emoji || '') + '</div>';
    const m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]);
    if (popupHtml) m.setPopup(new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(popupHtml));
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
      map = F.createMap(F.$('#pick-map', m.el), start, 14);
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

  /* ---------- بيانات تجريبية ---------- */
  // كرينات وهمية حتى ترى الواجهة شغالة. تظهر بشارة «تجريبي» ولا تتصل بأرقام حقيقية.
  F.seed = function () {
    const now = Date.now();
    if (!F.get(F.K.seeded, false)) {
      const c = F.CENTER;
      const demo = [
        ['كرين تجريبي ١ — وسط الناصرية', 'سحب', 0.006, -0.004, 'available'],
        ['كرين تجريبي ٢ — حي الحبوبي', 'سطحة', -0.012, 0.010, 'available'],
        ['كرين تجريبي ٣ — طريق بغداد', 'هيدروليك', 0.022, -0.016, 'busy'],
        ['كرين تجريبي ٤ — الجزائر', 'ونش', -0.020, -0.022, 'available'],
        ['كرين تجريبي ٥ — طريق الشطرة', 'ثقيل', 0.003, 0.034, 'busy'],
        ['كرين تجريبي ٦ — الحي الصناعي', 'سحب', -0.030, 0.004, 'available']
      ].map((d, i) => ({
        id: 'demo' + (i + 1),
        name: d[0], type: d[1],
        lat: c.lat + d[2], lng: c.lng + d[3],
        status: d[4],
        phone: '', ownerPhone: '',
        package: 'free', verified: false, rating: null,
        demo: true, createdAt: now, updatedAt: now
      }));
      F.saveCranes(F.cranes().concat(demo));
      F.set(F.K.seeded, true);
    }
    // نخلي وقت التحديث للتجريبي قريب حتى ما يظهر «قديم»
    const arr = F.cranes();
    let changed = false;
    arr.forEach((c) => { if (c.demo) { c.updatedAt = now - Math.floor(F.rand(1, 20)) * 60000; changed = true; } });
    if (changed) F.saveCranes(arr);
  };

  F.removeDemo = function () {
    F.saveCranes(F.cranes().filter((c) => !c.demo));
    F.set(F.K.events, F.events().filter((e) => !e.demo));
  };
})();

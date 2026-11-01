/* سند جايك — التوجيه على طريقة ويز: تتبّع مباشر، سهم اتجاه، مسار للكرين، منعطفات وصوت.
 * المسار من خادم OSRM العام (للتجربة). إذا فشل نرسم خطاً مستقيماً بوقت تقريبي.
 */
(function () {
  'use strict';
  const F = window.F;
  const RAD = Math.PI / 180;
  const OSRM = 'https://router.project-osrm.org/route/v1/driving/';

  /* ---------- حسابات (نقية، قابلة للاختبار) ---------- */
  const km = (a, b) => {
    const dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(x));
  };
  const bearing = (a, b) => {
    const dLng = (b.lng - a.lng) * RAD;
    const y = Math.sin(dLng) * Math.cos(b.lat * RAD);
    const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos(dLng);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  };
  const ANGLE = { 'sharp left': -135, left: -90, 'slight left': -45, straight: 0, 'slight right': 45, right: 90, 'sharp right': 135, uturn: 180 };
  const TXT = { 'sharp left': 'انعطاف حاد يساراً', left: 'انعطف يساراً', 'slight left': 'يساراً قليلاً', straight: 'استمر مباشرة', 'slight right': 'يميناً قليلاً', right: 'انعطف يميناً', 'sharp right': 'انعطاف حاد يميناً', uturn: 'استدر للخلف' };

  function stepInfo(st) {
    const m = st.maneuver || {}, mod = m.modifier || 'straight';
    let text, angle = ANGLE[mod] != null ? ANGLE[mod] : 0;
    if (m.type === 'arrive') { text = 'وصلت وجهتك'; angle = 0; }
    else if (m.type === 'depart') { text = 'انطلق'; angle = 0; }
    else if (m.type === 'roundabout' || m.type === 'rotary' || m.type === 'roundabout turn') { text = 'ادخل الدوّار' + (m.exit ? ' وخذ المخرج ' + m.exit : ''); angle = 0; }
    else if (m.type === 'fork' || m.type === 'merge') text = /left/.test(mod) ? 'خذ المسار الأيسر' : /right/.test(mod) ? 'خذ المسار الأيمن' : 'ادمج بالمسار';
    else if (m.type === 'continue' || m.type === 'new name') text = 'استمر';
    else text = TXT[mod] || 'استمر';
    if (st.name && m.type !== 'arrive') text += ' — ' + st.name;
    return { text: text, angle: angle };
  }

  function fmtKm(k) { return k < 1 ? Math.max(10, Math.round(k * 100) * 10) + ' م' : (k < 10 ? k.toFixed(1) : Math.round(k)) + ' كم'; }
  function fmtMin(s) { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + ' د' : Math.floor(m / 60) + ' س ' + (m % 60) + ' د'; }

  // أقرب نقطة على المسار → { i, d (كم)، remaining (كم) }
  function progress(coords, p) {
    let bi = 0, bd = 1e9;
    for (let i = 0; i < coords.length; i++) {
      const d = km(p, { lat: coords[i][1], lng: coords[i][0] });
      if (d < bd) { bd = d; bi = i; }
    }
    let rem = 0;
    for (let i = bi; i < coords.length - 1; i++) rem += km({ lat: coords[i][1], lng: coords[i][0] }, { lat: coords[i + 1][1], lng: coords[i + 1][0] });
    return { i: bi, d: bd, remaining: rem };
  }

  /* ---------- الحالة ---------- */
  let map = null, panel = null, opts = {}, ctl = null;
  let target = null, route = null, stepIdx = 1, following = false, voice = false;
  let watchId = null, last = null, heading = null, compass = null, live = false, compassOn = false, paintQ = 0, lastReroute = 0, spoken = {};

  const ARROW = '<svg class="me-arrow" viewBox="0 0 24 24"><path d="M12 2.5 19 21l-7-4-7 4z" fill="#fff"/></svg>';
  F.navArrowSvg = ARROW;

  function speak(t) {
    try {
      if (!voice || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(t); u.lang = 'ar'; u.rate = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------- الخريطة ---------- */
  function ensureLayers() {
    if (!map || !route) return;
    const data = { type: 'Feature', geometry: { type: 'LineString', coordinates: route.coords } };
    try {
      if (map.getSource('route')) map.getSource('route').setData(data);
      else {
        map.addSource('route', { type: 'geojson', data: data });
        const lay = { 'line-cap': 'round', 'line-join': 'round' };
        map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: lay, paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 16, 16] } });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: lay, paint: { 'line-color': '#2F7BFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 16, 10], 'line-dasharray': route.approx ? [1.5, 1.5] : [1, 0] } });
      }
    } catch (e) {}
  }
  function removeLayers() {
    if (!map) return;
    try { ['route-line', 'route-casing'].forEach((id) => map.getLayer(id) && map.removeLayer(id)); if (map.getSource('route')) map.removeSource('route'); } catch (e) {}
  }

  function meEl() { const m = opts.getMe && opts.getMe(); return m ? m.getElement() : null; }
  // الاتجاه: من حركة GPS إذا تتحرك، وإلا البوصلة، وإلا آخر اتجاه معروف
  const curHeading = () => (heading != null ? heading : compass);
  function paintHeading() {
    const el = meEl();
    if (!el) return;
    el.dataset.hd = '1'; // السهم دائماً ظاهر
    const a = el.querySelector('.me-arrow');
    const h = curHeading();
    if (a) a.style.transform = 'rotate(' + Math.round((h == null ? 0 : h) - (map ? map.getBearing() : 0)) + 'deg)';
  }
  function paintSoon() { if (paintQ) return; paintQ = requestAnimationFrame(() => { paintQ = 0; paintHeading(); }); }

  // بوصلة الجهاز (للسهم لما تكون واقف)
  function startCompass() {
    if (compassOn) return;
    compassOn = true;
    const on = (e) => {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
      else if (e.absolute && e.alpha != null) h = (360 - e.alpha) % 360;
      if (h == null || isNaN(h)) return;
      compass = h; paintSoon();
    };
    window.addEventListener('deviceorientationabsolute', on, true);
    window.addEventListener('deviceorientation', on, true);
    // آيفون يحتاج إذن بلمسة من المستخدم
    document.addEventListener('click', () => {
      try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (e) {}
    }, { once: true });
  }

  function camera(l) {
    if (!map || !following) return;
    map.easeTo({ center: [l.lng, l.lat], bearing: curHeading() != null ? curHeading() : map.getBearing(), pitch: 55, zoom: Math.max(map.getZoom(), 16), duration: 900, essential: true });
  }

  /* ---------- الموقع المباشر ---------- */
  function onPos(p) {
    const l = { lat: p.coords.latitude, lng: p.coords.longitude };
    if (p.coords.heading != null && !isNaN(p.coords.heading) && (p.coords.speed == null || p.coords.speed > 1)) heading = p.coords.heading;
    else if (last && km(last, l) > 0.005) heading = bearing(last, l);
    last = l;
    F.setLoc(l.lat, l.lng, 'gps');
    if (opts.onLoc) opts.onLoc(l);
    paintHeading();
    camera(l);
    if (route) track(l);
    draw();
  }
  function startWatch(silent) {
    if (watchId !== null || !navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(onPos, (e) => {
      if (silent) { stopWatch(true); return; }
      F.toast(F.gpsError(e), 'err'); setFollow(false);
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  }
  function stopWatch(force) {
    if (live && !force) return; // التتبّع الحي للسهم يبقى شغال
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  // تتبّع حي هادئ: السهم يتحرك ويدور مع المستخدم حتى بدون مسار
  function startLive() {
    live = true;
    startCompass();
    startWatch(true);
    paintHeading();
  }

  function track(l) {
    const pr = progress(route.coords, l);
    route.remainKm = pr.remaining;
    // المنعطف التالي
    while (stepIdx < route.steps.length - 1 && km(l, { lat: route.steps[stepIdx].maneuver.location[1], lng: route.steps[stepIdx].maneuver.location[0] }) < 0.03) stepIdx++;
    const st = route.steps[stepIdx];
    if (st) {
      const dn = km(l, { lat: st.maneuver.location[1], lng: st.maneuver.location[0] });
      const info = stepInfo(st);
      [[0.3, 'بعد 300 متر '], [0.08, '']].forEach((t) => {
        const k = stepIdx + '_' + t[0];
        if (dn < t[0] && !spoken[k]) { spoken[k] = 1; speak(t[1] + info.text); }
      });
    }
    if (km(l, target) < 0.04) { F.toast('وصلت وجهتك', 'ok'); speak('وصلت وجهتك'); return clear(true); }
    // خرجت عن المسار؟ نعيد الحساب
    if (!route.approx && pr.d > 0.12 && Date.now() - lastReroute > 15000) { lastReroute = Date.now(); routeTo(target, true); }
  }

  /* ---------- المسار ---------- */
  async function fetchRoute(from, to) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(OSRM + from.lng + ',' + from.lat + ';' + to.lng + ',' + to.lat + '?overview=full&geometries=geojson&steps=true', { signal: ctrl.signal });
      const j = await r.json();
      const rt = j.routes && j.routes[0];
      if (!rt) throw new Error('no route');
      return { coords: rt.geometry.coordinates, distance: rt.distance / 1000, duration: rt.duration, steps: rt.legs[0].steps, approx: false };
    } finally { clearTimeout(t); }
  }

  async function routeTo(crane, silent) {
    const from = F.loc();
    if (from.source === 'default') {
      F.toast('حدّد موقعك أول (GPS أو يدوي) حتى نرسم المسار.', 'err');
      return;
    }
    target = { lat: crane.lat, lng: crane.lng, name: crane.name, id: crane.id };
    if (!silent) { F.toast('جاري رسم المسار…'); spoken = {}; }
    try {
      route = await fetchRoute(from, target);
      stepIdx = Math.min(1, route.steps.length - 1);
    } catch (e) {
      const d = km(from, target);
      route = { coords: [[from.lng, from.lat], [target.lng, target.lat]], distance: d, duration: d / 40 * 3600, steps: [], approx: true };
      stepIdx = 0;
      if (!silent) F.toast('تعذّر جلب المسار الدقيق. هذا خط مستقيم بوقت تقريبي.');
    }
    route.remainKm = route.distance;
    removeLayers();
    ensureLayers();
    if (map && !silent) {
      const b = new maplibregl.LngLatBounds();
      route.coords.forEach((c) => b.extend(c));
      map.fitBounds(b, { padding: 60, maxZoom: 16, duration: 800 });
    }
    draw();
  }

  function clear(arrived) {
    route = null; target = null; spoken = {};
    removeLayers();
    setFollow(false);
    stopWatch();
    paintHeading();
    draw();
    if (arrived && opts.onArrive) opts.onArrive();
  }

  /* ---------- الواجهة ---------- */
  function setFollow(on) {
    following = !!on;
    if (ctl) { ctl.classList.toggle('on', following); ctl.setAttribute('aria-pressed', following); }
    if (following) { startWatch(); const l = F.loc(); if (last || l.source !== 'default') camera(last || l); }
    else {
      if (!route) stopWatch();
      if (map) map.easeTo({ bearing: 0, pitch: 0, duration: 600 });
    }
    paintHeading();
    draw();
  }

  function draw() {
    if (!panel) return;
    if (!route || !target) { panel.innerHTML = ''; return; }
    const remain = route.remainKm != null ? route.remainKm : route.distance;
    const eta = route.duration * (route.distance ? Math.min(1, remain / route.distance) : 1);
    const here = last || F.loc();
    const st = route.steps[stepIdx];
    let banner = '';
    if (st && !route.approx) {
      const info = stepInfo(st);
      const dn = km(here, { lat: st.maneuver.location[1], lng: st.maneuver.location[0] });
      banner = '<div class="nav-banner"><div class="nav-turn"><svg viewBox="0 0 24 24" style="transform:rotate(' + info.angle + 'deg)"><path d="M12 3v15M12 3 6 9M12 3l6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="grow"><div class="nav-dist">' + fmtKm(dn) + '</div><div class="nav-text">' + F.esc(info.text) + '</div></div></div>';
    }
    const rel = bearing(here, target) - (heading != null ? heading : 0);
    panel.innerHTML = '<div class="card nav-card">' + banner +
      '<div class="row between"><div><b>' + F.esc(target.name) + '</b><div class="muted small">' + fmtKm(remain) + ' · ' + fmtMin(eta) + (route.approx ? ' (تقريبي)' : '') + '</div></div>' +
        '<div class="nav-compass" title="اتجاه الكرين"><svg viewBox="0 0 24 24" style="transform:rotate(' + Math.round(rel) + 'deg)"><path d="M12 2.5 19 21l-7-4-7 4z" fill="var(--orange,#FF6B2C)"/></svg></div></div>' +
      '<div class="row wrap mt-s">' +
        '<button class="btn sm ' + (following ? 'green' : '') + '" data-n="follow">' + (following ? 'إيقاف التوجيه' : 'ابدأ التوجيه') + '</button>' +
        '<button class="btn sm secondary" data-n="voice">' + (voice ? '🔊 الصوت شغّال' : '🔇 الصوت') + '</button>' +
        '<a class="btn sm secondary" target="_blank" rel="noopener" href="https://waze.com/ul?ll=' + target.lat + ',' + target.lng + '&navigate=yes">Waze</a>' +
        '<a class="btn sm secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + target.lat + ',' + target.lng + '&travelmode=driving">Google</a>' +
        '<button class="btn sm ghost" data-n="close">إغلاق</button></div></div>';
  }

  function init(m, panelEl, o) {
    map = m; panel = panelEl; opts = o || {};
    if (panel && !panel.dataset.bound) {
      panel.dataset.bound = '1';
      panel.addEventListener('click', (e) => {
        const b = e.target.closest('[data-n]');
        if (!b) return;
        if (b.dataset.n === 'follow') setFollow(!following);
        else if (b.dataset.n === 'voice') { voice = !voice; if (voice) speak('تم تشغيل الصوت'); draw(); }
        else if (b.dataset.n === 'close') clear();
      });
    }
    if (!map) return;
    // زر «تتبّع موقعي» فوق الخريطة
    ctl = document.createElement('button');
    ctl.type = 'button'; ctl.className = 'map-follow'; ctl.setAttribute('aria-label', 'تتبّع موقعي');
    ctl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.5 19 21l-7-4-7 4z" fill="currentColor"/></svg>';
    ctl.onclick = () => {
      if (F.loc().source === 'default' && !last) F.toast('جاري تحديد موقعك…');
      setFollow(!following);
    };
    map.getContainer().appendChild(ctl);
    map.on('dragstart', (e) => { if (following && e.originalEvent) setFollow(false); });
    map.on('style.load', () => { if (route) ensureLayers(); });
    map.on('rotate', paintHeading);
  }

  F.nav = { init: init, startLive: startLive, paint: paintHeading, routeTo: routeTo, clear: clear, follow: setFollow,
    _t: { km: km, bearing: bearing, stepInfo: stepInfo, progress: progress, fmtKm: fmtKm, fmtMin: fmtMin } };
})();

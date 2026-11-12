/* سند جايك — عداد السرعة فوق الخريطة (كم/س) من GPS الجهاز */
(function () {
  'use strict';
  const F = window.F;
  const KEY = 'sanad_speedo';
  let on = false, watch = null, box = null, last = null, sm = 0;

  const saved = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const save = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} };

  function dist(a, b) {
    const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function paint(kmh) {
    if (!box) return;
    const v = Math.round(kmh);
    box.querySelector('b').textContent = v;
    box.classList.toggle('fast', v >= 120);
    box.classList.toggle('idle', v < 2);
  }
  function onPos(p) {
    const c = p.coords, now = p.timestamp || Date.now();
    let ms = c.speed;
    if ((ms == null || isNaN(ms)) && last) {
      const dt = (now - last.t) / 1000;
      if (dt > 0.5 && c.accuracy < 40) ms = dist(last, { lat: c.latitude, lng: c.longitude }) / dt;
    }
    last = { lat: c.latitude, lng: c.longitude, t: now };
    if (ms == null || isNaN(ms) || ms < 0) return;
    sm = sm * 0.55 + ms * 3.6 * 0.45; // تنعيم حتى ما يقفز الرقم
    paint(ms * 3.6 < 1 ? 0 : sm);
  }
  function start() {
    if (watch != null || !navigator.geolocation) return;
    watch = navigator.geolocation.watchPosition(onPos, () => paint(0), { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
  }
  function stop() {
    if (watch != null) navigator.geolocation.clearWatch(watch);
    watch = null; last = null; sm = 0;
  }
  function mount(mapEl) {
    if (box && box.parentNode) box.remove();
    box = document.createElement('div');
    box.className = 'speedo idle'; box.setAttribute('aria-live', 'off');
    box.innerHTML = '<b>0</b><span>كم/س</span>';
    box.hidden = !on;
    mapEl.appendChild(box);
  }
  function set(v) {
    on = !!v; save(on);
    if (box) box.hidden = !on;
    if (on) { start(); try { if (!localStorage.getItem('sanad_speedo_hint')) { localStorage.setItem('sanad_speedo_hint', '1'); F.toast('العداد يظهر بزاوية الخريطة ويقيس سرعتك بالكم/س من GPS الجهاز.'); } } catch (e) { /* */ } } else stop();
    const b = F.$('#h-speed'); if (b) b.classList.toggle('on', on);
  }

  F.speedo = {
    attach(mapEl) { on = saved(); mount(mapEl); const b = F.$('#h-speed'); if (b) { b.classList.toggle('on', on); b.onclick = () => set(!on); } if (on) start(); },
    stop: stop
  };
})();

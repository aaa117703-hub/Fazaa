/* سند جايك — الشاشة الرئيسية: الموقع، الخريطة، قائمة الكرينات، الاتصال */
(function () {
  'use strict';
  const F = window.F;

  let el, map, markers = {}, shopMk = {}, shopsOn = false, shopTimer = 0, meMarker = null, ready = false, items = [], loading = false, loadErr = false;
  const state = { onlyAvail: !!F.getSettings().onlyAvail, type: '', gov: '' };

  const TEMPLATE =
    '<div class="locbar">' +
      '<div class="state" id="h-locstate"></div>' +
      '<button class="btn sm secondary" id="h-gps">' + F.icon('gps') + ' موقعي</button>' +
      '<button class="btn sm secondary" id="h-manual">' + F.icon('cursor') + ' يدوي</button>' +
    '</div>' +
    '<div id="h-active"></div>' +
    '<div id="h-hero"></div>' +
    '<div class="row wrap quick">' +
      '<button class="btn danger grow" id="h-sos">' + F.icon('alert') + ' طوارئ SOS</button>' +
      '<button class="btn secondary grow" id="h-guide">' + F.icon('shield') + ' شنو أسوي؟</button>' +
      '<button class="btn secondary grow" id="h-share">' + F.icon('share') + ' أرسل موقعي</button>' +
      '<button class="btn secondary grow" id="h-offline">' + F.icon('map') + ' خرائط دون اتصال</button>' +
    '</div>' +
    '<div id="h-route"></div>' +
    '<div class="home-grid">' +
      '<div><div id="map"></div><div class="muted small shop-hint" id="h-shophint" hidden></div></div>' +
      '<div>' +
        '<div class="filters">' +
          '<button class="chip" id="h-avail">متاح فقط</button>' +
          '<button class="chip" id="h-shops">' + F.icon('gear') + ' محلات وخدمات</button>' +
          '<button class="chip" id="h-speed">' + F.icon('gauge') + ' عداد السرعة</button>' +
          '<select id="h-gov" aria-label="المحافظة"><option value="">كل المحافظات</option>' +
            F.GOVS.map((g) => '<option>' + g.name + '</option>').join('') +
          '</select>' +
          '<select id="h-type" aria-label="نوع الكرين"><option value="">كل الأنواع</option>' +
            F.TYPES.map((t) => '<option>' + t + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div id="h-list"></div>' +
      '</div>' +
    '</div>';

  function status(c) {
    if (c.status === 'available') {
      const stale = !c.demo && Date.now() - c.updatedAt > F.STALE_MS;
      return stale
        ? { cls: 'amber', txt: 'متاح؟ آخر تحديث ' + F.ago(c.updatedAt) + ' — اتصل وتأكد', stale: true }
        : { cls: 'green', txt: 'متاح · آخر تحديث ' + F.ago(c.updatedAt), stale: false };
    }
    return { cls: 'red', txt: 'مشغول · آخر تحديث ' + F.ago(c.updatedAt), stale: false };
  }

  function sorted() {
    const me = F.loc();
    let arr = items.filter((c) => !(F.getSettings().hideDemo && c.demo)).map((c) => Object.assign({ d: F.dist(me, c) }, c));
    if (state.onlyAvail) arr = arr.filter((c) => c.status === 'available');
    if (state.type) arr = arr.filter((c) => c.type === state.type);
    if (state.gov) arr = arr.filter((c) => (c.gov || F.govOf(c.lat, c.lng)) === state.gov);
    arr.sort((a, b) => {
      const av = (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1);
      const ra = F.drive && F.drive.get(a.id), rb = F.drive && F.drive.get(b.id);
      return av || (ra && rb ? ra.min - rb.min : a.d - b.d);
    });
    return arr;
  }

  function roadTxt(c) {
    const x = F.drive && F.drive.get(c.id);
    if (!x) return F.fmtDist(c.d);
    return '<span class="' + (F.drive.far(c.id) ? 'far' : 'road') + '">' + F.drive.label(x) + (F.drive.far(c.id) ? ' · بعيد' : '') + '</span>';
  }

  function cardHtml(c) {
    const s = status(c);
    const badges =
      (c.demo ? ' <span class="badge">تجريبي</span>' : '') +
      (c.verified ? ' <span class="badge green">موثق</span>' : '') +
      ((c.tier && c.tier !== 'bronze') ? ' <span class="badge tier-b-' + c.tier + '">' + F.tierOf(c.tier).name + '</span>' : '');
    return (
      '<article class="card crane ' + (c.status === 'available' ? '' : 'busy') + '" data-id="' + F.esc(c.id) + '">' +
        '<div class="row">' +
          '<div class="avatar tier-' + (c.tier || 'bronze') + '" title="' + F.tierOf(c.tier).name + '">' + F.icon('crane') + '</div>' +
          '<div class="grow">' +
            '<h3>' + F.esc(c.name) + badges + '</h3>' +
            '<div class="sub">' + F.esc(c.type) + (c.gov ? ' · ' + F.esc(c.gov) : '') + ' · ' + roadTxt(c) + (c.ratingCount ? ' · <span class="stars">★ ' + c.rating.toFixed(1) + '</span> (' + c.ratingCount + ')' : ' · بدون تقييم') + '</div>' +
            '<div class="meta ' + (s.stale ? 'stale' : '') + '"><span class="dot ' + s.cls + '"></span>' + s.txt + '</div>' +
          '</div>' +
          '<div class="stack" style="gap:6px"><button class="btn ' + (c.status === 'available' ? 'green' : 'secondary') + '" data-call="' + F.esc(c.id) + '">' + F.icon('phone') + ' اتصال</button>' +
          '<div class="row" style="gap:6px">' + (c.demo ? '' : '<button class="btn sm secondary grow" data-wa="' + F.esc(c.id) + '" aria-label="واتساب">' + F.icon('share') + ' واتساب</button>') +
          '<button class="btn sm secondary grow" data-route="' + F.esc(c.id) + '">' + F.icon('cursor') + ' طريق</button></div></div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderHero(list) {
    const best = list.find((c) => c.status === 'available');
    const box = F.$('#h-hero', el);
    if (!best) {
      box.innerHTML =
        '<div class="hero"><h2>سيارتي تعطلت</h2>' +
        '<div class="sub" style="margin:0 0 10px">' + (loading ? 'جاري البحث عن الكرينات…' : loadErr ? 'تعذّر تحميل الكرينات. تأكد من الإنترنت.' : 'ما لكينا كرين متاح هسه' +
        (state.onlyAvail || state.type ? ' بهذا الفلتر' : '') + '. شوف القائمة وجرّب تتصل.') + '</div>' +
        '<button class="btn big block" data-req="1">' + F.icon('alert') + ' أرسل طلب لأقرب كرينات</button></div>';
      return;
    }
    box.innerHTML =
      '<div class="hero"><h2>' + F.icon('alert') + ' سيارتي تعطلت — أقرب كرين متاح</h2>' +
      '<div class="name">' + F.esc(best.name) + '</div>' +
      '<div class="sub">' + F.esc(best.type) + ' · ' + F.fmtDist(best.d) + ' عنك · ' + status(best).txt + '</div>' +
      '<button class="btn big block" data-req="1">' + F.icon('alert') + ' أرسل طلب لأقرب 3 كرينات</button>' +
      '<button class="btn block green" style="margin-top:8px" data-call="' + F.esc(best.id) + '">' + F.icon('phone') + ' أو اتصل مباشرة بأقرب كرين</button></div>';
  }

  const skeleton = () => '<div class="skel"></div>'.repeat(3);
  function emptyHtml() {
    const filtered = state.onlyAvail || state.type || state.gov;
    if (loadErr) return '<div class="empty">تعذّر تحميل الكرينات. تأكد من الإنترنت.<br><button class="btn secondary mt" data-retry="1">إعادة المحاولة</button></div>';
    return '<div class="empty">' + (filtered ? 'ما كو كرينات تطابق الفلتر.' : 'ما كو كرينات مسجّلة قريبة منك هسه.') +
      '<br>' + (filtered ? '<button class="btn secondary mt" data-clear="1">إلغاء الفلاتر</button> ' : '') +
      '<button class="btn mt" data-req="1">أرسل طلب لأقرب كرينات</button></div>';
  }
  function clearFilters() {
    state.onlyAvail = false; state.type = ''; state.gov = '';
    F.$('#h-avail', el).classList.remove('on');
    F.$('#h-gov', el).value = ''; F.$('#h-type', el).value = '';
    if (typeof loadShops === 'function') { clearShops(); loadShops(); }
    refresh();
  }

  function renderMap(list) {
    if (!map) return;
    const me = F.loc();
    if (!meMarker) { meMarker = F.marker(map, me.lat, me.lng, 'me', F.navArrowSvg || '', 'موقعك'); F.nav.paint(); }
    else F.markerSet(meMarker, me.lat, me.lng, 'me');

    const keep = {};
    list.forEach((c) => {
      keep[c.id] = true;
      const cls = c.status === 'available' ? 'green' : 'red';
      const pop = '<b>' + F.esc(c.name) + '</b><br>' + F.esc(c.type) + ' · ' + F.fmtDist(c.d);
      if (markers[c.id]) {
        F.markerSet(markers[c.id], c.lat, c.lng, cls, pop);
      } else {
        const m = F.marker(map, c.lat, c.lng, cls, F.icon('crane'), pop);
        m.getElement().addEventListener('click', () => focusCard(c.id));
        markers[c.id] = m;
      }
    });
    Object.keys(markers).forEach((id) => { if (!keep[id]) { markers[id].remove(); delete markers[id]; } });
  }


  /* ---------- محلات تصليح السيارات (OpenStreetMap) ---------- */
  const SHOP_ZOOM = 11; // ≈ 20 كم أو أقل بعرض الشاشة
  const KMK = { car_repair: ['repair', 'gear'], tyres: ['repair', 'gear'], car_parts: ['repair', 'gear'], mechanic: ['repair', 'gear'], car_electrics: ['repair', 'gear'], oil_change: ['oil', 'oilcan'], fuel: ['fuel', 'pump'], restaurant: ['food', 'fork'], rest_area: ['rest', 'cup'] };
  function shopPop(s) {
    const tel = (s[4] || '').split(/[;,\/]/)[0].trim();
    return '<b>' + F.esc(s[3] || F.shops.KINDS[s[5]] || 'محل تصليح') + '</b>' + (s[6] ? ' <span class="badge green">موثّق من المجتمع</span>' : '') + '<br>' + F.esc(F.shops.KINDS[s[5]] || '') +
      (tel ? '<br><a href="tel:' + F.esc(tel.replace(/[^+\d]/g, '')) + '">' + F.icon('phone') + ' ' + F.esc(tel) + '</a>' : '<br><span class="muted small">بدون رقم مسجّل</span>') +
      '<br><a href="#" data-pop-route="' + s[1] + ',' + s[2] + '">' + F.icon('cursor') + ' مسار داخل التطبيق</a>';
  }
  async function loadShops() {
    if (!map || !shopsOn || !F.shops) return;
    if (map.getZoom() < SHOP_ZOOM) { clearShops(); setShopHint('قرّب الخريطة (حوالي 20 كم) حتى تظهر المحلات والخدمات'); return; }
    const b = map.getBounds();
    let list = [];
    try { list = await F.shops.inBox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], true); } catch (e) {}
    if (!shopsOn) return;
    const chip = F.$('#h-shops', el);
    if (chip) chip.innerHTML = F.icon('gear') + ' محلات وخدمات';
    setShopHint(list.length ? '' : F.shops.failed() ? 'تعذّر جلب المحلات (تأكد من الإنترنت). اضغط الزر مرتين للمحاولة من جديد.' : 'ما لكينا محلات مسجّلة بهذي المنطقة بخرائط OpenStreetMap');
    if (state.gov) list = list.filter((s) => (s[7] || F.govOf(s[1], s[2])) === state.gov);
    const keep = {};
    const mc = map.getCenter();
    list.sort((a, b) => Math.hypot(a[1] - mc.lat, a[2] - mc.lng) - Math.hypot(b[1] - mc.lat, b[2] - mc.lng));
    list.slice(0, 150).forEach((s) => {
      keep[s[0]] = 1;
      if (!shopMk[s[0]]) { const k = KMK[s[5]] || KMK.car_repair; shopMk[s[0]] = F.marker(map, s[1], s[2], 'poi k-' + k[0], F.icon(k[1]), shopPop(s)); }
    });
    Object.keys(shopMk).forEach((id) => { if (!keep[id]) { shopMk[id].remove(); delete shopMk[id]; } });
  }
  function clearShops() { Object.keys(shopMk).forEach((id) => { shopMk[id].remove(); delete shopMk[id]; }); }
  function setShopHint(t) { const n = F.$('#h-shophint', el); if (n) { n.textContent = t; n.hidden = !t; } }
  function toggleShops(on) {
    shopsOn = on;
    try { localStorage.setItem('sanad_shops_on', on ? '1' : '0'); } catch (e) {}
    F.$('#h-shops', el).classList.toggle('on', on);
    if (!on) { clearShops(); setShopHint(''); return; }
    if (map && map.getZoom() < SHOP_ZOOM) {
      const l = F.loc(); map.flyTo({ center: [l.lng, l.lat], zoom: l.source === 'default' ? 11 : 12, duration: 700 });
    }
    loadShops();
  }

  function focusCard(id) {
    const card = F.$('.crane[data-id="' + id + '"]', el);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('flash');
    void card.offsetWidth;
    card.classList.add('flash');
  }

  function fitMap() {
    if (!map) return;
    const l = F.loc();
    const b = new maplibregl.LngLatBounds();
    if (l.source !== 'default') b.extend([l.lng, l.lat]);
    Object.values(markers).forEach((m) => b.extend(m.getLngLat()));
    if (b.isEmpty()) return map.flyTo({ center: [F.CENTER.lng, F.CENTER.lat], zoom: 6, duration: 700 });
    map.fitBounds(b, { padding: 50, maxZoom: l.source === 'default' ? 9 : l.source === 'ip' ? 11 : 15, duration: 700 });
  }

  function refresh() {
    if (!ready) return;
    F.$('#h-locstate', el).textContent = F.locLabel(F.loc());
    const list = sorted();
    renderHero(list);
    if (F.request) F.request.banner(F.$('#h-active', el));
    F.$('#h-list', el).innerHTML = list.length
      ? list.map(cardHtml).join('')
      : loading ? skeleton() : emptyHtml();
    renderMap(list);
  }

  async function load() {
    loading = items.length === 0; loadErr = false;
    if (loading) refresh();
    try {
      const l = F.loc();
      items = await F.fetchCranes(l.lat, l.lng);
    } catch (e) { loadErr = true; if (!items.length) F.toast(F.errMsg(e), 'err'); }
    loading = false;
    refresh();
    if (F.drive) F.drive.enrich(sorted(), F.loc(), 10).then((ch) => { if (ch) refresh(); }).catch(() => {});
    F.contact.warm(sorted());
    return items;
  }

  function callOf(id, how) {
    const c = items.find((x) => x.id === id);
    if (!c) return;
    F.drive.guard(c, sorted(), () => F.contact[how](c), (nid) => callOf(nid, how));
  }

  async function locateGPS(silent) {
    try {
      const p = await F.getGPS();
      F.setLoc(p.lat, p.lng, 'gps');
      await load();
      fitMap();
      F.nav.startLive(); // السهم يتحرك ويدور مع موقعك
      if (!silent) F.toast('تم تحديد موقعك', 'ok');
      return true;
    } catch (e) {
      if (!silent) {
        F.toast(F.gpsError(e), 'err');
        if (e && e.code !== 1) setTimeout(locateManual, 900); // نفتح اختيار الموقع اليدوي بدل ما يوقف
      }
      return e;
    }
  }

  // بدون أي نافذة سماح: إذا الإذن ممنوح مسبقاً نحدّد بدقة بهدوء، وإلا نستخدم موقعاً تقريبياً من الإنترنت.
  // طلب GPS (ونافذة المتصفح) يصير فقط لما المستخدم يضغط «موقعي» أو يرسل طلب.
  async function ipLocate() {
    try {
      const r = await fetch('https://ipwho.is/?fields=success,latitude,longitude,country_code');
      const j = await r.json();
      if (j && j.success && j.country_code === 'IQ' && F.loc().source !== 'gps' && F.loc().source !== 'manual') {
        F.setLoc(j.latitude, j.longitude, 'ip');
        await load();
        fitMap();
      }
    } catch (e) {}
  }
  async function autoLocate() {
    let state = 'prompt';
    try { if (navigator.permissions) state = (await navigator.permissions.query({ name: 'geolocation' })).state; } catch (e) {}
    if (state === 'granted' && navigator.geolocation) return locateGPS(true);
    if (F.loc().source === 'default' || F.loc().source === 'ip') ipLocate();
  }

  async function locateManual() {
    const p = await F.pickLocation(F.loc());
    if (!p) return;
    F.setLoc(p.lat, p.lng, 'manual');
    await load();
    fitMap();
  }

  function init() {
    el = F.$('#v-home');
    el.innerHTML = TEMPLATE;
    ready = true;

    if (F.hasMap()) {
      try {
        map = F.createMap(F.$('#map', el), F.loc(), F.loc().source === 'default' ? 6 : 13);
        if (F.speedo) F.speedo.attach(F.$('#map', el));
      } catch (e) {
        map = null;
        F.$('#map', el).innerHTML = '<div class="empty">تعذّر تشغيل الخريطة على هذا الجهاز. القائمة تشتغل عادي.</div>';
      }
    } else {
      F.$('#map', el).innerHTML = '<div class="empty">الخريطة غير متوفرة بدون إنترنت أول مرة. القائمة تشتغل عادي.</div>';
    }

    let lastList = 0;
    F.nav.init(map, F.$('#h-route', el), {
      getMe: () => meMarker,
      onLoc: (l) => {
        if (meMarker) F.markerSet(meMarker, l.lat, l.lng, 'me');
        if (Date.now() - lastList > 10000) { lastList = Date.now(); refresh(); }
      }
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-call]');
      if (b) return callOf(b.dataset.call, 'call');
      const pf = e.target.closest('.crane .avatar, .crane h3');
      if (pf) { const card = pf.closest('.crane'); if (card && card.dataset.id) return F.cprofile.show(card.dataset.id); }
      const pr = e.target.closest('[data-pop-route]');
      if (pr) { e.preventDefault(); const [la, ln] = pr.dataset.popRoute.split(',').map(Number); F.nav.routeTo({ lat: la, lng: ln, name: 'المحل', id: 'poi' }); return; }
      const w = e.target.closest('[data-wa]');
      if (w) return callOf(w.dataset.wa, 'whatsapp');
      if (e.target.closest('[data-clear]')) return clearFilters();
      const r = e.target.closest('[data-route]');
      if (r) { const c = items.find((x) => x.id === r.dataset.route); if (c) F.drive.guard(c, sorted(), () => F.nav.routeTo(c), (nid) => { const o = items.find((x) => x.id === nid); if (o) F.nav.routeTo(o); }); return; }
      if (e.target.closest('[data-retry]')) { load(); return; }
      if (e.target.closest('[data-req]')) F.request.start();
    });
    if (map && F.traffic) F.traffic.mount(map, F.$('.filters', el)); // يظهر الزر فقط إذا الزحام مفعّل من app_settings
    F.$('#h-gps', el).onclick = () => locateGPS(false);
    F.$('#h-guide', el).onclick = () => F.guide.show();
    F.$('#h-sos', el).onclick = () => F.guide.sos();
    F.$('#h-share', el).onclick = () => F.guide.shareLocation();
    F.$('#h-offline', el).onclick = () => { location.hash = '#offline'; };
    F.$('#h-shops', el).onclick = () => toggleShops(!shopsOn);
    if (map) map.on('moveend', () => { clearTimeout(shopTimer); shopTimer = setTimeout(loadShops, 600); });
    try { if (localStorage.getItem('sanad_shops_on') === '1') setTimeout(() => toggleShops(true), 800); } catch (e) {}
    F.$('#h-avail', el).classList.toggle('on', state.onlyAvail);
    F.$('#h-manual', el).onclick = locateManual;
    F.$('#h-avail', el).onclick = (e) => {
      state.onlyAvail = !state.onlyAvail;
      e.currentTarget.classList.toggle('on', state.onlyAvail);
      refresh();
    };
    F.$('#h-gov', el).onchange = (e) => {
      state.gov = e.target.value;
      const g = F.GOVS.find((x) => x.name === state.gov);
      if (g) {
        if (F.loc().source === 'default') F.setLoc(g.lat, g.lng, 'manual');
        if (map) map.flyTo({ center: [g.lng, g.lat], zoom: 10, duration: 700 });
      }
      clearShops(); loadShops();
      refresh();
    };
    F.$('#h-type', el).onchange = (e) => { state.type = e.target.value; refresh(); };

    refresh();
    load().then(fitMap);
    // نطلب الموقع تلقائياً. إذا موقعه محفوظ من قبل نحدّثه بهدوء ونشغّل السهم الحي.
    autoLocate();
    setTimeout(F.contact.followUp, 600);
  }

  F.home = {
    reloadShops: function () { clearShops(); loadShops(); },
    init: init,
    show: function () {
      if (!ready) init();
      else { refresh(); load(); }
      if (map) setTimeout(() => { try { map.resize(); } catch (e) {} }, 60);
    },
    refresh: refresh,
    reload: load
  };
})();

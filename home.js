/* سند جايك — الشاشة الرئيسية: الموقع، الخريطة، قائمة الكرينات، الاتصال */
(function () {
  'use strict';
  const F = window.F;

  let el, map, markers = {}, meMarker = null, ready = false, items = [], loading = false, loadErr = false;
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
      '<button class="btn secondary grow" id="h-guide">' + F.icon('shield') + ' شنو أسوي؟</button>' +
      '<button class="btn secondary grow" id="h-share">' + F.icon('share') + ' أرسل موقعي</button>' +
    '</div>' +
    '<div id="h-route"></div>' +
    '<div class="home-grid">' +
      '<div id="map"></div>' +
      '<div>' +
        '<div class="filters">' +
          '<button class="chip" id="h-avail">متاح فقط</button>' +
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
      return av || a.d - b.d;
    });
    return arr;
  }

  function cardHtml(c) {
    const s = status(c);
    const badges =
      (c.demo ? ' <span class="badge">تجريبي</span>' : '') +
      (c.verified ? ' <span class="badge green">موثق</span>' : '') +
      (c.package === 'premium' || c.package === 'annual' ? ' <span class="badge amber">مميز</span>' : '');
    return (
      '<article class="card crane ' + (c.status === 'available' ? '' : 'busy') + '" data-id="' + F.esc(c.id) + '">' +
        '<div class="row">' +
          '<div class="avatar">' + F.icon('crane') + '</div>' +
          '<div class="grow">' +
            '<h3>' + F.esc(c.name) + badges + '</h3>' +
            '<div class="sub">' + F.esc(c.type) + (c.gov ? ' · ' + F.esc(c.gov) : '') + ' · ' + F.fmtDist(c.d) + (c.ratingCount ? ' · ★ ' + c.rating.toFixed(1) + ' (' + c.ratingCount + ')' : '') + '</div>' +
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
    F.contact.warm(sorted());
    return items;
  }

  function callOf(id, how) {
    const c = items.find((x) => x.id === id);
    if (c) F.contact[how](c);
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
      if (!silent) F.toast(F.gpsError(e), 'err');
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
      const w = e.target.closest('[data-wa]');
      if (w) return callOf(w.dataset.wa, 'whatsapp');
      if (e.target.closest('[data-clear]')) return clearFilters();
      const r = e.target.closest('[data-route]');
      if (r) { const c = items.find((x) => x.id === r.dataset.route); if (c) F.nav.routeTo(c); return; }
      if (e.target.closest('[data-retry]')) { load(); return; }
      if (e.target.closest('[data-req]')) F.request.start();
    });
    F.$('#h-gps', el).onclick = () => locateGPS(false);
    F.$('#h-guide', el).onclick = () => F.guide.show();
    F.$('#h-share', el).onclick = () => F.guide.shareLocation();
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

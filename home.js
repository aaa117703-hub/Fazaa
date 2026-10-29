/* سند جايك — الشاشة الرئيسية: الموقع، الخريطة، قائمة الكرينات، الاتصال */
(function () {
  'use strict';
  const F = window.F;

  let el, map, markers = {}, meMarker = null, ready = false;
  const state = { onlyAvail: !!F.getSettings().onlyAvail, type: '' };

  const TEMPLATE =
    '<div class="locbar">' +
      '<div class="state" id="h-locstate"></div>' +
      '<button class="btn sm secondary" id="h-gps">' + F.icon('gps') + ' موقعي</button>' +
      '<button class="btn sm secondary" id="h-manual">' + F.icon('cursor') + ' يدوي</button>' +
    '</div>' +
    '<div id="h-hero"></div>' +
    '<div class="row wrap quick">' +
      '<button class="btn secondary grow" id="h-guide">' + F.icon('shield') + ' شنو أسوي؟</button>' +
      '<button class="btn secondary grow" id="h-share">' + F.icon('share') + ' أرسل موقعي</button>' +
    '</div>' +
    '<div class="home-grid">' +
      '<div id="map"></div>' +
      '<div>' +
        '<div class="filters">' +
          '<button class="chip" id="h-avail">متاح فقط</button>' +
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
    let arr = F.cranes().filter((c) => !(F.getSettings().hideDemo && c.demo)).map((c) => Object.assign({ d: F.dist(me, c) }, c));
    if (state.onlyAvail) arr = arr.filter((c) => c.status === 'available');
    if (state.type) arr = arr.filter((c) => c.type === state.type);
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
            '<div class="sub">' + F.esc(c.type) + ' · ' + F.fmtDist(c.d) + '</div>' +
            '<div class="meta ' + (s.stale ? 'stale' : '') + '"><span class="dot ' + s.cls + '"></span>' + s.txt + '</div>' +
          '</div>' +
          '<button class="btn ' + (c.status === 'available' ? 'green' : 'secondary') + '" data-call="' + F.esc(c.id) + '">' + F.icon('phone') + ' اتصال</button>' +
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
        '<div class="sub" style="margin:0">ما لكينا كرين متاح هسه' +
        (state.onlyAvail || state.type ? ' بهذا الفلتر' : '') + '. شوف القائمة وجرّب تتصل.</div></div>';
      return;
    }
    box.innerHTML =
      '<div class="hero"><h2>' + F.icon('alert') + ' سيارتي تعطلت — أقرب كرين متاح</h2>' +
      '<div class="name">' + F.esc(best.name) + '</div>' +
      '<div class="sub">' + F.esc(best.type) + ' · ' + F.fmtDist(best.d) + ' عنك · ' + status(best).txt + '</div>' +
      '<button class="btn big block green" data-call="' + F.esc(best.id) + '">' + F.icon('phone') + ' اتصل هسه</button></div>';
  }

  function renderMap(list) {
    if (!map) return;
    const me = F.loc();
    if (!meMarker) meMarker = F.marker(map, me.lat, me.lng, 'me', '', 'موقعك');
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
    b.extend([l.lng, l.lat]);
    Object.values(markers).forEach((m) => b.extend(m.getLngLat()));
    map.fitBounds(b, { padding: 50, maxZoom: 15, duration: 700 });
  }

  function refresh() {
    if (!ready) return;
    F.$('#h-locstate', el).textContent = F.locLabel(F.loc());
    const list = sorted();
    renderHero(list);
    F.$('#h-list', el).innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<div class="empty">ما كو كرينات تطابق الفلتر.</div>';
    renderMap(list);
  }

  function call(id) {
    const c = F.cranes().find((x) => x.id === id);
    if (!c) return;
    F.logCall(c);
    if (c.demo || !c.phone) {
      F.toast('هذا كرين تجريبي، ما عنده رقم حقيقي. سجّلنا الاتصال بالسجل.');
      return;
    }
    window.location.href = 'tel:' + c.phone;
  }

  async function locateGPS(silent) {
    try {
      const p = await F.getGPS();
      F.setLoc(p.lat, p.lng, 'gps');
      refresh();
      fitMap();
      if (!silent) F.toast('تم تحديد موقعك', 'ok');
    } catch (e) {
      if (!silent) F.toast(F.gpsError(e), 'err');
    }
  }

  async function locateManual() {
    const p = await F.pickLocation(F.loc());
    if (!p) return;
    F.setLoc(p.lat, p.lng, 'manual');
    refresh();
    fitMap();
  }

  function init() {
    el = F.$('#v-home');
    el.innerHTML = TEMPLATE;
    ready = true;

    if (F.hasMap()) {
      try {
        map = F.createMap(F.$('#map', el), F.loc(), 13);
      } catch (e) {
        map = null;
        F.$('#map', el).innerHTML = '<div class="empty">تعذّر تشغيل الخريطة على هذا الجهاز. القائمة تشتغل عادي.</div>';
      }
    } else {
      F.$('#map', el).innerHTML = '<div class="empty">الخريطة غير متوفرة بدون إنترنت أول مرة. القائمة تشتغل عادي.</div>';
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-call]');
      if (b) call(b.dataset.call);
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
    F.$('#h-type', el).onchange = (e) => { state.type = e.target.value; refresh(); };

    refresh();
    fitMap();
    // أول مرة: نحاول GPS إذا المستخدم وافق (المتصفح راح يسأله بنفسه)
    if (F.get(F.K.consent, false) && F.loc().source === 'default') locateGPS(true);
  }

  F.home = {
    init: init,
    show: function () {
      if (!ready) init();
      else refresh();
      if (map) setTimeout(() => { try { map.resize(); } catch (e) {} }, 60);
    },
    refresh: refresh
  };
})();

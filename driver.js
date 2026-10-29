/* فزعة — وضع السائق: التسجيل، متاح/مشغول، الموقع، الإحصائيات */
(function () {
  'use strict';
  const F = window.F;

  let el, watchId = null, beat = null, lastPush = 0;

  /* ---------- تتبع الموقع (فقط أثناء «متاح» والتطبيق مفتوح) ---------- */
  function startWatch() {
    stopWatch();
    const c = F.myCrane();
    if (!c || c.status !== 'available') return;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          const now = Date.now();
          if (now - lastPush < 45000) return; // مرة كل 45 ثانية كحد أدنى
          lastPush = now;
          const mine = F.myCrane();
          if (!mine || mine.status !== 'available') return;
          F.setLoc(p.coords.latitude, p.coords.longitude, 'gps');
          F.updateCrane(mine.id, { lat: p.coords.latitude, lng: p.coords.longitude, updatedAt: now });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 }
      );
    }
    // نبضة: تبقي «آخر تحديث» حقيقي طالما التطبيق مفتوح
    beat = setInterval(() => {
      const mine = F.myCrane();
      if (mine && mine.status === 'available') F.updateCrane(mine.id, { updatedAt: Date.now() });
    }, 60000);
  }

  function stopWatch() {
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (beat) clearInterval(beat);
    beat = null;
  }

  async function goAvailable(c) {
    let loc;
    try {
      const p = await F.getGPS();
      loc = F.setLoc(p.lat, p.lng, 'gps');
    } catch (e) {
      F.toast(F.gpsError(e), 'err');
      const start = F.loc().source === 'default' ? null : F.loc();
      const p = await F.pickLocation(start);
      if (!p) return;
      loc = F.setLoc(p.lat, p.lng, 'manual');
    }
    F.updateCrane(c.id, { status: 'available', lat: loc.lat, lng: loc.lng, updatedAt: Date.now() });
    startWatch();
    F.toast('أنت الحين «متاح»', 'ok');
    render();
  }

  function goBusy(c) {
    stopWatch();
    F.updateCrane(c.id, { status: 'busy', updatedAt: Date.now() });
    F.toast('أنت الحين «مشغول»');
    render();
  }

  /* ---------- نماذج ---------- */
  function typeOptions(sel) {
    return F.TYPES.map((t) => '<option' + (t === sel ? ' selected' : '') + '>' + t + '</option>').join('');
  }

  function formHtml(c, u) {
    return (
      '<div class="field"><label>اسم الكرين الظاهر للزبائن</label>' +
        '<input id="d-name" value="' + F.esc(c ? c.name : 'كرين ' + F.firstName(u.name)) + '" maxlength="40">' +
        '<div class="err" id="de-name"></div></div>' +
      '<div class="field"><label>نوع الكرين</label>' +
        '<select id="d-type">' + typeOptions(c ? c.type : '') + '</select></div>' +
      '<div class="field"><label>رقم الاتصال للزبائن</label>' +
        '<input id="d-phone" class="ltr" inputmode="tel" value="' + F.esc(c ? c.phone : u.phone) + '" maxlength="16">' +
        '<div class="hint">هذا الرقم يظهر للزبائن ويتصلون عليه.</div>' +
        '<div class="err" id="de-phone"></div></div>'
    );
  }

  function readForm(root) {
    const name = F.$('#d-name', root).value.trim();
    const type = F.$('#d-type', root).value;
    const phone = F.cleanPhone(F.$('#d-phone', root).value);
    let ok = true;
    F.$('#de-name', root).textContent = name.length >= 3 ? '' : (ok = false, 'اكتب اسم للكرين.');
    F.$('#de-phone', root).textContent = F.validPhone(phone) ? '' : (ok = false, 'الرقم لازم 11 رقم ويبدأ بـ 07.');
    return ok ? { name: name, type: type, phone: phone } : null;
  }

  /* ---------- الشاشات ---------- */
  function renderRegister(u) {
    el.innerHTML =
      '<h1>' + F.icon('crane') + ' كن سائق كرين</h1>' +
      '<p class="lead">سجّل كرينك حتى يلكوك الزبائن على الخريطة ويتصلون بيك مباشرة.</p>' +
      '<form class="card" id="d-form" novalidate>' + formHtml(null, u) +
        '<div class="promo">' + F.icon('gift') + ' أول 20 سائق: 3 أشهر مجاناً بدون أي التزام.</div>' +
        '<label class="check"><input type="checkbox" id="d-agree">' +
          '<span>أفهم إن موقعي يتحدّث فقط وأنا «متاح» والتطبيق مفتوح، وإن اسمي ورقمي يظهرون للزبائن.</span></label>' +
        '<div class="err" id="de-agree" style="margin:-8px 0 10px"></div>' +
        '<button class="btn big block" type="submit">سجّل كرينك</button>' +
      '</form>';

    F.$('#d-form', el).onsubmit = (e) => {
      e.preventDefault();
      const v = readForm(el);
      const agree = F.$('#d-agree', el).checked;
      F.$('#de-agree', el).textContent = agree ? '' : 'لازم توافق حتى نكمّل.';
      if (!v || !agree) return;
      const l = F.loc();
      const arr = F.cranes();
      arr.push({
        id: F.uid(), name: v.name, type: v.type, phone: v.phone,
        ownerPhone: u.phone, lat: l.lat, lng: l.lng,
        status: 'busy', package: 'free', verified: false, rating: null,
        demo: false, createdAt: Date.now(), updatedAt: Date.now()
      });
      F.saveCranes(arr);
      F.toast('تم تسجيل كرينك. اضغط «متاح» لتظهر للزبائن.', 'ok');
      render();
    };
  }

  function renderDash(c, u) {
    const calls = F.events().filter((e) => e.type === 'call' && e.craneId === c.id);
    const today = calls.filter((e) => F.isToday(e.at)).length;
    const pkg = F.PACKAGES.find((p) => p.id === c.package) || F.PACKAGES[0];
    const avail = c.status === 'available';

    el.innerHTML =
      '<h1>' + F.icon('crane') + ' وضع السائق</h1>' +
      '<p class="lead">' + F.esc(c.name) + ' · ' + F.esc(c.type) +
        (c.verified ? ' <span class="badge green">موثق</span>' : '') + '</p>' +

      '<div class="card">' +
        '<h2>حالتك الحين</h2>' +
        '<div class="status-switch">' +
          '<button id="d-on" class="' + (avail ? 'on-green' : '') + '">' + F.icon('check-circle') + 'متاح</button>' +
          '<button id="d-off" class="' + (!avail ? 'on-red' : '') + '">' + F.icon('pause-circle') + 'مشغول</button>' +
        '</div>' +
        '<p class="muted small mt-s">آخر تحديث: ' + F.ago(c.updatedAt) + '. ' +
          (avail ? 'موقعك يتحدّث طول ما التطبيق مفتوح.' : 'موقعك ما يتحدّث وأنت «مشغول».') + '</p>' +
        (avail ? '<p class="muted small">إذا سكّرت التطبيق وانت «متاح»، الزبون يشوف تحذير «آخر تحديث قديم». لا تنسى تحوّل «مشغول» إذا طلعت.</p>' : '') +
      '</div>' +

      '<div class="card"><h2>إحصائياتك</h2>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + today + '</b><span>اتصالات اليوم</span></div>' +
          '<div class="stat"><b>' + calls.length + '</b><span>كل الاتصالات</span></div>' +
          '<div class="stat"><b>—</b><span>التقييم (قريباً)</span></div>' +
        '</div>' +
        '<p class="muted small mt-s">الأرقام من اتصالات سُجّلت على هذا الجهاز فقط.</p>' +
      '</div>' +

      '<div class="card"><h2>آخر الاتصالات</h2>' +
        (calls.length
          ? '<ul class="list">' + calls.slice(-5).reverse().map((e) =>
              '<li><span>' + F.esc(F.firstName(e.by && e.by.name) || 'زبون') + '</span><span class="muted">' + F.fmtDate(e.at) + '</span></li>').join('') + '</ul>'
          : '<div class="muted small">ما كو اتصالات بعد.</div>') +
      '</div>' +

      '<div class="card"><h2>باقتك</h2>' +
        '<div class="row between"><div><b>' + F.esc(pkg.name) + '</b>' +
          (c.promoUntil ? '<div class="muted small">عرض مجاني لين ' + new Date(c.promoUntil).toLocaleDateString('ar-IQ-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' : '') +
        '</div><a class="btn sm ghost" href="#packages">غيّر الباقة</a></div>' +
      '</div>' +

      '<div class="row wrap mt">' +
        '<button class="btn secondary" id="d-edit">' + F.icon('pencil') + ' تعديل بياناتي</button>' +
        '<button class="btn danger" id="d-remove">حذف تسجيلي كسائق</button>' +
      '</div>';

    F.$('#d-on', el).onclick = () => { if (!avail) goAvailable(c); };
    F.$('#d-off', el).onclick = () => { if (avail) goBusy(c); };
    F.$('#d-edit', el).onclick = () => editModal(c, u);
    F.$('#d-remove', el).onclick = () => {
      const m = F.modal('<h2>حذف تسجيلك كسائق؟</h2><p class="muted">راح يختفي كرينك من القائمة والخريطة.</p>' +
        '<div class="row mt"><button class="btn danger grow" id="rm-yes">نعم، احذف</button><button class="btn secondary grow" id="rm-no">لا</button></div>');
      F.$('#rm-no', m.el).onclick = m.close;
      F.$('#rm-yes', m.el).onclick = () => {
        stopWatch();
        F.saveCranes(F.cranes().filter((x) => x.id !== c.id));
        m.close();
        F.toast('تم حذف تسجيلك');
        render();
      };
    };
  }

  function editModal(c, u) {
    const m = F.modal('<h2>تعديل بيانات الكرين</h2><form id="de-form" novalidate>' + formHtml(c, u) +
      '<div class="row"><button class="btn grow" type="submit">حفظ</button><button class="btn secondary" type="button" id="de-cancel">إلغاء</button></div></form>');
    F.$('#de-cancel', m.el).onclick = m.close;
    F.$('#de-form', m.el).onsubmit = (e) => {
      e.preventDefault();
      const v = readForm(m.el);
      if (!v) return;
      F.updateCrane(c.id, v);
      m.close();
      F.toast('تم الحفظ', 'ok');
      render();
    };
  }

  function render() {
    const u = F.user();
    if (!u) return;
    const c = F.myCrane();
    if (c) renderDash(c, u); else renderRegister(u);
  }

  F.driver = {
    init: function () { el = F.$('#v-driver'); },
    show: function () { render(); },
    // نستأنف التتبع إذا السائق كان «متاح» وفتح التطبيق
    resume: function () { startWatch(); },
    stop: stopWatch
  };
})();

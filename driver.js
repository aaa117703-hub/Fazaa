/* سند جايك — وضع السائق: التسجيل، متاح/مشغول، الموقع، الطلبات الواردة */
(function () {
  'use strict';
  const F = window.F;
  const ISSUE = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح مقفلة', accident: 'حادث', other: 'أخرى' };

  let el, watchId = null, beat = null, poller = null, lastPush = 0;
  let crane = null, docs = [], pushOn = false, phone = '', stats = { today: 0, total: 0, rating: null, count: 0 }, incoming = [], jobs = [], known = {}, busy = false;

  const uid = () => F.sb.uid();

  async function loadAll() {
    const rows = await F.sb.q('cranes', 'select=*&owner_id=eq.' + uid() + '&limit=1');
    crane = rows && rows[0] || null;
    if (!crane) { incoming = []; jobs = []; return; }
    const id = crane.id;
    const [ct, callsRaw, rs, tg, jb, dc] = await Promise.all([
      F.sb.q('crane_contacts', 'select=phone&crane_id=eq.' + id),
      F.sb.q('calls', 'select=created_at&crane_id=eq.' + id + '&order=created_at.desc&limit=500'),
      F.sb.q('crane_rating_summary', 'select=rating_avg,rating_count&crane_id=eq.' + id),
      F.sb.q('request_targets', 'select=request_id,distance_km,sent_at,requests(id,lat,lng,issue,destination,note,status,created_at)&crane_id=eq.' + id + '&status=eq.sent&order=sent_at.desc&limit=20'),
      F.sb.q('requests', 'select=*&accepted_crane_id=eq.' + id + '&status=eq.accepted&order=accepted_at.desc'),
      F.sb.q('driver_documents', 'select=id,kind,status,note,created_at&crane_id=eq.' + id + '&order=created_at.desc')
    ]);
    docs = dc || [];
    pushOn = F.push ? await F.push.enabled() : false;
    phone = ct && ct[0] ? ct[0].phone : '';
    const calls = callsRaw || [];
    stats = {
      total: calls.length, today: calls.filter((c) => F.isToday(Date.parse(c.created_at))).length,
      rating: rs && rs[0] ? +rs[0].rating_avg : null, count: rs && rs[0] ? rs[0].rating_count : 0
    };
    incoming = (tg || []).filter((t) => t.requests && t.requests.status === 'open');
    jobs = [];
    for (const r of (jb || [])) {
      let p = null;
      try { const x = await F.sb.q('profiles', 'select=full_name,phone,car&id=eq.' + r.customer_id); p = x && x[0]; } catch (e) {}
      jobs.push({ r: r, p: p });
    }
  }

  async function refresh(silent) {
    if (busy || F.isGuest()) return;
    busy = true;
    try {
      await loadAll();
      incoming.forEach((t) => {
        if (!known[t.request_id]) {
          known[t.request_id] = 1;
          if (silent) { F.toast('طلب جديد من زبون قريب!', 'ok'); try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {} }
        }
      });
      if (el && !el.hidden) render();
    } catch (e) { if (!silent) F.toast(F.errMsg(e), 'err'); }
    busy = false;
  }

  /* ---------- الموقع (فقط أثناء «متاح» والتطبيق مفتوح) ---------- */
  function pushLoc(lat, lng) {
    if (!crane) return;
    F.sb.q('cranes', 'id=eq.' + crane.id, { method: 'PATCH', body: { lat: lat, lng: lng, status: 'available' } }).catch(() => {});
  }

  function startWatch() {
    stopWatch();
    if (!crane || crane.status !== 'available') return;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((p) => {
        const now = Date.now();
        if (now - lastPush < 45000) return;
        lastPush = now;
        F.setLoc(p.coords.latitude, p.coords.longitude, 'gps');
        crane.lat = p.coords.latitude; crane.lng = p.coords.longitude;
        pushLoc(crane.lat, crane.lng);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 });
    }
    beat = setInterval(() => { if (crane && crane.status === 'available') pushLoc(crane.lat, crane.lng); }, 60000);
  }
  function stopWatch() {
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (beat) clearInterval(beat);
    beat = null;
  }
  function startPoll() { stopPoll(); poller = setInterval(() => { if (!document.hidden && crane) refresh(true); }, 8000); }
  function stopPoll() { if (poller) clearInterval(poller); poller = null; }

  async function goAvailable() {
    let loc;
    try { const p = await F.getGPS(); loc = F.setLoc(p.lat, p.lng, 'gps'); }
    catch (e) {
      F.toast(F.gpsError(e), 'err');
      const p = await F.pickLocation(F.loc().source === 'default' ? null : F.loc());
      if (!p) return;
      loc = F.setLoc(p.lat, p.lng, 'manual');
    }
    try {
      const r = await F.sb.q('cranes', 'id=eq.' + crane.id, { method: 'PATCH', body: { status: 'available', lat: loc.lat, lng: loc.lng }, prefer: 'return=representation' });
      crane = r[0] || crane;
      startWatch();
      F.toast('أنت الحين «متاح»', 'ok');
      render();
    } catch (e) { F.toast(F.errMsg(e), 'err'); }
  }

  async function goBusy() {
    try {
      const r = await F.sb.q('cranes', 'id=eq.' + crane.id, { method: 'PATCH', body: { status: 'busy' }, prefer: 'return=representation' });
      crane = r[0] || crane;
      stopWatch();
      F.toast('أنت الحين «مشغول»');
      render();
    } catch (e) { F.toast(F.errMsg(e), 'err'); }
  }

  /* ---------- نماذج ---------- */
  const typeOptions = (sel) => F.TYPES.map((t) => '<option' + (t === sel ? ' selected' : '') + '>' + t + '</option>').join('');

  function formHtml(c, u) {
    return (
      '<div class="field"><label>اسم الكرين الظاهر للزبائن</label>' +
        '<input id="d-name" value="' + F.esc(c ? c.name : 'كرين ' + F.firstName(u.name)) + '" maxlength="40"><div class="err" id="de-name"></div></div>' +
      '<div class="field"><label>نوع الكرين</label><select id="d-type">' + typeOptions(c ? c.type : '') + '</select></div>' +
      '<div class="field"><label>المحافظة اللي تشتغل بيها</label><select id="d-gov"><option value="">اختر المحافظة</option>' +
        F.GOVS.map((g) => '<option' + (g.name === (c ? c.governorate : u.gov) ? ' selected' : '') + '>' + g.name + '</option>').join('') + '</select><div class="err" id="de-gov"></div></div>' +
      '<div class="field"><label>رقم الاتصال للزبائن</label>' +
        '<input id="d-phone" class="ltr" inputmode="tel" value="' + F.esc(c ? phone : u.phone) + '" maxlength="16">' +
        '<div class="hint">يظهر فقط للزبائن المسجّلين.</div><div class="err" id="de-phone"></div></div>'
    );
  }
  function readForm(root) {
    const name = F.$('#d-name', root).value.trim();
    const type = F.$('#d-type', root).value;
    const ph = F.cleanPhone(F.$('#d-phone', root).value);
    const gov = F.$('#d-gov', root).value;
    let ok = true;
    F.$('#de-gov', root).textContent = gov ? '' : (ok = false, 'اختر المحافظة.');
    F.$('#de-name', root).textContent = name.length >= 3 ? '' : (ok = false, 'اكتب اسم للكرين.');
    F.$('#de-phone', root).textContent = F.validPhone(ph) ? '' : (ok = false, 'الرقم لازم 11 رقم ويبدأ بـ 07.');
    return ok ? { name: name, type: type, phone: ph, governorate: gov } : null;
  }

  function loginCard() {
    el.innerHTML = '<h1>' + F.icon('crane') + ' كن سائق كرين</h1><p class="lead">سجّل كرينك حتى يوصلك الزبائن القريبين منك.</p>' +
      '<div class="card"><p class="muted">لازم حساب حتى تسجّل كسائق.</p><button class="btn block" id="d-login">دخول / حساب جديد</button></div>';
    F.$('#d-login', el).onclick = () => F.auth.open();
  }

  function renderRegister(u) {
    el.innerHTML =
      '<h1>' + F.icon('crane') + ' كن سائق كرين</h1>' +
      '<p class="lead">سجّل كرينك. بعد مراجعة الإدارة يظهر للزبائن ويوصلك الطلبات.</p>' +
      '<form class="card" id="d-form" novalidate>' + formHtml(null, u) +
        '<div class="promo">' + F.icon('gift') + ' أول 20 سائق: 3 أشهر مجاناً بدون أي التزام.</div>' +
        '<label class="check"><input type="checkbox" id="d-agree"><span>أفهم إن موقعي يتحدّث فقط وأنا «متاح» والتطبيق مفتوح، وإن اسم الكرين ورقمي يظهرون للزبائن.</span></label>' +
        '<div class="err" id="de-agree" style="margin:-8px 0 10px"></div><div class="err" id="de-form"></div>' +
        '<button class="btn big block" type="submit">سجّل كرينك</button></form>';
    F.$('#d-form', el).onsubmit = async (e) => {
      e.preventDefault();
      const v = readForm(el), agree = F.$('#d-agree', el).checked;
      F.$('#de-agree', el).textContent = agree ? '' : 'لازم توافق حتى نكمّل.';
      if (!v || !agree) return;
      let l;
      try { const g = await F.getGPS(); l = F.setLoc(g.lat, g.lng, 'gps'); }
      catch (ge) {
        F.toast(F.gpsError(ge), 'err');
        const pk = await F.pickLocation(F.loc().source === 'default' ? null : F.loc());
        if (!pk) return;
        l = F.setLoc(pk.lat, pk.lng, 'manual');
      }
      try {
        const r = await F.sb.q('cranes', '', { method: 'POST', prefer: 'return=representation',
          body: { owner_id: uid(), name: v.name, type: v.type, governorate: v.governorate, lat: l.lat, lng: l.lng, status: 'busy', listed: false, verified: false, package: 'free', is_demo: false } });
        await F.sb.q('crane_contacts', '', { method: 'POST', body: { crane_id: r[0].id, phone: v.phone } });
        F.toast('تم التسجيل. بانتظار موافقة الإدارة.', 'ok');
        await refresh();
      } catch (ex) { F.$('#de-form', el).textContent = F.errMsg(ex); }
    };
  }

  function incomingHtml() {
    if (!crane.listed) return '';
    return '<div class="card"><h2>طلبات واردة' + (incoming.length ? ' (' + incoming.length + ')' : '') + '</h2>' +
      (incoming.length ? '<ul class="list">' + incoming.map((t) => {
        const r = t.requests;
        return '<li style="display:block"><div class="row between"><b>' + (ISSUE[r.issue] || r.issue) + '</b><span class="muted small">' + F.fmtDist(+t.distance_km) + ' · ' + F.ago(Date.parse(r.created_at)) + '</span></div>' +
          (r.destination ? '<div class="muted small">إلى: ' + F.esc(r.destination) + '</div>' : '') +
          (r.note ? '<div class="muted small">' + F.esc(r.note) + '</div>' : '') +
          '<div class="row mt-s"><button class="btn grow green" data-acc="' + r.id + '">قبول</button><button class="btn secondary" data-dec="' + r.id + '">رفض</button></div></li>';
      }).join('') + '</ul>' : '<div class="muted small">' + (crane.status === 'available' ? 'ما كو طلبات هسه. التحديث تلقائي.' : 'حوّل «متاح» حتى توصلك الطلبات.') + '</div>') + '</div>';
  }

  function jobsHtml() {
    if (!jobs.length) return '';
    return '<div class="card"><h2>طلبات مقبولة</h2><ul class="list">' + jobs.map((j) => {
      const r = j.r, p = j.p;
      return '<li style="display:block"><b>' + F.esc(p && p.full_name || 'زبون') + '</b> · ' + (ISSUE[r.issue] || '') +
        (p && p.car ? '<div class="muted small">' + F.icon('car') + ' ' + F.esc(p.car) + '</div>' : '') +
        '<div class="row wrap mt-s">' +
          (p && p.phone ? '<a class="btn sm green" href="tel:' + F.esc(p.phone) + '">' + F.icon('phone') + ' اتصل</a>' : '') +
          '<a class="btn sm secondary" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + r.lat + ',' + r.lng + '">' + F.icon('pin') + ' الموقع</a>' +
          '<button class="btn sm" data-done="' + r.id + '">تم الإنجاز</button></div></li>';
    }).join('') + '</ul></div>';
  }

  const KINDS = [['id', 'الهوية أو البطاقة الموحدة'], ['license', 'إجازة السوق'], ['vehicle', 'سنوية الكرين']];
  const ST = { pending: ['amber', 'قيد المراجعة'], approved: ['green', 'مقبول'], rejected: ['red', 'مرفوض'] };

  function docsHtml() {
    return '<div class="card"><h2>' + F.icon('shield') + ' توثيق حسابك</h2>' +
      '<p class="muted small">ارفع صور واضحة. نراجعها وبعدها تظهر لك شارة «موثق» وتزيد ثقة الزبائن. الصور خاصة، ما يشوفها غير الإدارة.</p>' +
      '<ul class="list">' + KINDS.map((k) => {
        const mine = docs.filter((x) => x.kind === k[0])[0];
        const st = mine ? ST[mine.status] : null;
        return '<li style="display:block"><div class="row between"><span>' + k[1] + '</span>' +
          (st ? '<span class="badge ' + st[0] + '">' + st[1] + '</span>' : '<span class="muted small">ما انرفع</span>') + '</div>' +
          (mine && mine.status === 'rejected' && mine.note ? '<div class="muted small">السبب: ' + F.esc(mine.note) + '</div>' : '') +
          (!mine || mine.status === 'rejected' ? '<button class="btn sm secondary mt-s" data-up="' + k[0] + '">' + F.icon('download') + ' رفع صورة</button>' : '') + '</li>';
      }).join('') + '</ul></div>';
  }

  function pushHtml() {
    if (!F.push || !F.push.supported()) return '';
    return '<div class="card"><div class="row between"><div><b>الإشعارات</b><div class="muted small">' + (pushOn ? 'شغّالة: توصلك الطلبات حتى والتطبيق مسكّر.' : 'فعّلها حتى توصلك الطلبات القريبة فوراً.') + '</div></div>' +
      '<button class="btn sm ' + (pushOn ? 'secondary' : '') + '" data-push="' + (pushOn ? 'off' : 'on') + '">' + (pushOn ? 'إيقاف' : 'تفعيل') + '</button></div></div>';
  }

  // تصغير الصورة قبل الرفع (أسرع وأوفر)
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('الصورة غير صالحة.'))), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('الصورة غير صالحة.')); };
      img.src = url;
    });
  }

  function pickDoc(kind) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        F.toast('جاري الرفع…');
        const blob = await shrink(f);
        const path = uid() + '/' + kind + '-' + Date.now() + '.jpg';
        await F.sb.upload('driver-docs', path, blob);
        const old = docs.filter((x) => x.kind === kind && x.status === 'rejected');
        for (const o of old) await F.sb.q('driver_documents', 'id=eq.' + o.id, { method: 'DELETE' }).catch(() => {});
        await F.sb.q('driver_documents', '', { method: 'POST', body: { crane_id: crane.id, owner_id: uid(), kind: kind, path: path } });
        F.toast('تم الرفع. بانتظار المراجعة.', 'ok');
        refresh();
      } catch (e) { F.toast(F.errMsg(e), 'err'); }
    };
    inp.click();
  }

  function renderDash(u) {
    const c = crane, avail = c.status === 'available';
    const pkg = F.PACKAGES.find((p) => p.id === c.package) || F.PACKAGES[0];
    el.innerHTML =
      '<h1>' + F.icon('crane') + ' وضع السائق</h1>' +
      '<p class="lead">' + F.esc(c.name) + ' · ' + F.esc(c.type) + (c.governorate ? ' · ' + F.esc(c.governorate) : '') + (c.verified ? ' <span class="badge green">موثق</span>' : '') + '</p>' +
      (!c.listed ? '<div class="warn">تسجيلك قيد مراجعة الإدارة. ما يظهر للزبائن لين تتم الموافقة.</div>' : '') +
      '<div class="card"><h2>حالتك الحين</h2><div class="status-switch">' +
        '<button id="d-on" class="' + (avail ? 'on-green' : '') + '">' + F.icon('check-circle') + 'متاح</button>' +
        '<button id="d-off" class="' + (!avail ? 'on-red' : '') + '">' + F.icon('pause-circle') + 'مشغول</button></div>' +
        '<p class="muted small mt-s">آخر تحديث: ' + F.ago(Date.parse(c.updated_at)) + '. ' + (avail ? 'موقعك يتحدّث طول ما التطبيق مفتوح.' : 'موقعك ما يتحدّث وأنت «مشغول».') + '</p>' +
        (avail ? '<p class="muted small">إذا سكّرت التطبيق وانت «متاح»، الزبون يشوف تحذير «آخر تحديث قديم». حوّل «مشغول» إذا طلعت.</p>' : '') + '</div>' +
      incomingHtml() + jobsHtml() +
      '<div class="card"><h2>إحصائياتك</h2><div class="stats">' +
        '<div class="stat"><b>' + stats.today + '</b><span>اتصالات اليوم</span></div>' +
        '<div class="stat"><b>' + stats.total + '</b><span>كل الاتصالات</span></div>' +
        '<div class="stat"><b>' + (stats.rating != null ? '★ ' + stats.rating.toFixed(1) : '—') + '</b><span>التقييم' + (stats.count ? ' (' + stats.count + ')' : '') + '</span></div></div></div>' +
      docsHtml() + pushHtml() +
      '<div class="card"><h2>باقتك</h2><div class="row between"><b>' + F.esc(pkg.name) + '</b><a class="btn sm ghost" href="#packages">الباقات</a></div></div>' +
      '<div class="row wrap mt"><button class="btn secondary" id="d-edit">' + F.icon('pencil') + ' تعديل بياناتي</button>' +
        '<button class="btn danger" id="d-remove">حذف تسجيلي كسائق</button></div>';

    F.$('#d-on', el).onclick = () => { if (!avail) goAvailable(); };
    F.$('#d-off', el).onclick = () => { if (avail) goBusy(); };
    F.$('#d-edit', el).onclick = () => editModal(u);
    F.$('#d-remove', el).onclick = () => {
      const m = F.modal('<h2>حذف تسجيلك كسائق؟</h2><p class="muted">راح يختفي كرينك من القائمة والخريطة.</p><div class="row mt"><button class="btn danger grow" id="rm-yes">نعم، احذف</button><button class="btn secondary grow" id="rm-no">لا</button></div>');
      F.$('#rm-no', m.el).onclick = m.close;
      F.$('#rm-yes', m.el).onclick = async () => {
        try { await F.sb.q('cranes', 'id=eq.' + crane.id, { method: 'DELETE' }); stopWatch(); crane = null; m.close(); F.toast('تم حذف تسجيلك'); render(); }
        catch (e) { F.toast(F.errMsg(e), 'err'); }
      };
    };
  }

  async function act(fn, id, okMsg) {
    try {
      await F.sb.rpc(fn, { p_request_id: id });
      if (fn === 'accept_request') F.sb.fn('notify', { kind: 'accepted', request_id: id }).catch(() => {});
      if (okMsg) F.toast(okMsg, 'ok'); await refresh();
    }
    catch (e) { F.toast(F.errMsg(e), 'err'); await refresh(); }
  }

  function editModal(u) {
    const m = F.modal('<h2>تعديل بيانات الكرين</h2><form id="de-form" novalidate>' + formHtml(crane, u) +
      '<div class="row"><button class="btn grow" type="submit">حفظ</button><button class="btn secondary" type="button" id="de-cancel">إلغاء</button></div></form>');
    F.$('#de-cancel', m.el).onclick = m.close;
    F.$('#de-form', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const v = readForm(m.el);
      if (!v) return;
      try {
        await F.sb.q('cranes', 'id=eq.' + crane.id, { method: 'PATCH', body: { name: v.name, type: v.type, governorate: v.governorate } });
        await F.sb.q('crane_contacts', 'crane_id=eq.' + crane.id, { method: 'PATCH', body: { phone: v.phone } });
        m.close(); F.toast('تم الحفظ', 'ok'); refresh();
      } catch (ex) { F.toast(F.errMsg(ex), 'err'); }
    };
  }

  function render() {
    if (!el) return;
    if (F.isGuest()) return loginCard();
    const u = F.user();
    if (!u) return;
    if (crane) renderDash(u); else renderRegister(u);
  }

  F.driver = {
    init: function () {
      el = F.$('#v-driver');
      el.addEventListener('click', (e) => {
        const g = (a) => e.target.closest('[' + a + ']');
        let b;
        if ((b = g('data-acc'))) act('accept_request', b.dataset.acc, 'قبلت الطلب. تواصل مع الزبون.');
        else if ((b = g('data-dec'))) act('decline_request', b.dataset.dec);
        else if ((b = g('data-done'))) act('complete_request', b.dataset.done, 'تم إنجاز الطلب');
        else if ((b = g('data-up'))) pickDoc(b.dataset.up);
        else if ((b = g('data-push'))) {
          (b.dataset.push === 'on' ? F.push.enable() : F.push.disable())
            .then(() => { F.toast(b.dataset.push === 'on' ? 'تم تفعيل الإشعارات' : 'تم إيقاف الإشعارات', 'ok'); refresh(); })
            .catch((err) => F.toast(F.errMsg(err), 'err'));
        }
      });
    },
    show: async function () {
      if (F.isGuest()) return render();
      if (!crane) el.innerHTML = '<p class="muted center mt">جاري التحميل…</p>';
      await refresh();
      render();
      startPoll();
    },
    resume: async function () {
      if (F.isGuest()) return;
      await refresh();
      startWatch();
      startPoll();
    },
    stop: function () { stopWatch(); stopPoll(); crane = null; known = {}; }
  };
})();

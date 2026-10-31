/* سند جايك — طلب «سيارتي تعطلت»: إرسال لأقرب 3 كرينات، تتبّع الحالة، التقييم، الإبلاغ */
(function () {
  'use strict';
  const F = window.F;
  const AK = 'sanad_active_req';
  const ISSUES = [['tow', 'عطل كامل — أحتاج سحب'], ['battery', 'بطارية'], ['tire', 'إطار'], ['fuel', 'وقود'], ['locked', 'مفاتيح داخل السيارة'], ['accident', 'حادث'], ['other', 'شي ثاني']];
  const issueName = (k) => (ISSUES.find((i) => i[0] === k) || [0, k])[1];

  let cur = null, mod = null, timer = null, busy = false;

  const getActive = () => { try { return JSON.parse(localStorage.getItem(AK)); } catch (e) { return null; } };
  const setActive = (v) => { try { v ? localStorage.setItem(AK, JSON.stringify(v)) : localStorage.removeItem(AK); } catch (e) {} };

  async function pickLocation() {
    try {
      const p = await F.getGPS();
      return F.setLoc(p.lat, p.lng, 'gps');
    } catch (e) {
      const l = F.loc();
      if (l.source !== 'default') return l;
      F.toast(F.gpsError(e), 'err');
      const p = await F.pickLocation(l);
      return p ? F.setLoc(p.lat, p.lng, 'manual') : null;
    }
  }

  function start() {
    if (F.isGuest()) return F.requireLogin('لازم تسجّل دخول حتى نرسل طلبك لأقرب كرينات.');
    const a = getActive();
    if (a && a.id) return track(a.id, a.targets);
    const m = F.modal(
      '<h2>' + F.icon('alert') + ' سيارتي تعطلت</h2>' +
      '<p class="muted small">راح نرسل طلبك لأقرب 3 سائقين مناسبين لمشكلتك. أول واحد يقبل يتواصل وياك.</p>' +
      '<form id="rq-form" novalidate>' +
        '<div class="field"><label>شنو المشكلة؟</label><select id="rq-issue">' +
          ISSUES.map((i) => '<option value="' + i[0] + '">' + i[1] + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>وين تريد توصل؟ (اختياري)</label><input id="rq-dest" maxlength="80" placeholder="مثال: ورشة بالحي الصناعي"></div>' +
        '<div class="field"><label>ملاحظة (اختياري)</label><input id="rq-note" maxlength="140" placeholder="مثال: السيارة على الطريق الدولي"></div>' +
        '<div class="err" id="rq-err"></div>' +
        '<div class="row"><button class="btn big grow" type="submit" id="rq-go">أرسل الطلب</button><button class="btn secondary" type="button" id="rq-no">إلغاء</button></div>' +
      '</form>'
    );
    F.$('#rq-no', m.el).onclick = m.close;
    F.$('#rq-form', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const btn = F.$('#rq-go', m.el);
      btn.disabled = true;
      const err = F.$('#rq-err', m.el);
      err.textContent = '';
      try {
        const l = await pickLocation();
        if (!l) { btn.disabled = false; return; }
        const r = await F.sb.rpc('create_request', {
          p_lat: l.lat, p_lng: l.lng, p_issue: F.$('#rq-issue', m.el).value,
          p_destination: F.$('#rq-dest', m.el).value.trim() || null,
          p_note: F.$('#rq-note', m.el).value.trim() || null
        });
        m.close();
        setActive({ id: r.request_id, targets: r.targets });
        F.sb.fn('notify', { kind: 'new_request', request_id: r.request_id }).catch(() => {});
        if (!r.targets) F.toast('ما لكينا كرين متاح قريب هسه. طلبك مسجّل، وتكدر تتصل بالكرينات من القائمة.');
        track(r.request_id, r.targets);
      } catch (ex) {
        err.textContent = F.errMsg(ex);
        btn.disabled = false;
      }
    };
  }

  /* ---------- التتبع ---------- */
  async function fetchReq(id) {
    const rows = await F.sb.q('requests', 'select=*&id=eq.' + id);
    return rows && rows[0] || null;
  }

  async function craneInfo(r) {
    if (!r.accepted_crane_id) return null;
    const [cr, ct] = await Promise.all([
      F.sb.q('cranes', 'select=id,name,type,verified&id=eq.' + r.accepted_crane_id),
      F.sb.q('crane_contacts', 'select=phone&crane_id=eq.' + r.accepted_crane_id)
    ]);
    return cr && cr[0] ? Object.assign({}, cr[0], { phone: ct && ct[0] ? ct[0].phone : '' }) : null;
  }

  async function poll() {
    const a = getActive();
    if (!a || busy) return;
    busy = true;
    try {
      const r = await fetchReq(a.id);
      if (!r) { setActive(null); cur = null; }
      else {
        const was = cur && cur.status;
        cur = r;
        cur.targets = a.targets;
        if (r.status === 'accepted' || r.status === 'completed') cur.crane = await craneInfo(r);
        if (was && was !== r.status && r.status === 'accepted') { F.toast('كرين قبل طلبك!', 'ok'); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} }
        if (['cancelled', 'expired'].includes(r.status) && !(mod && mod.open)) setActive(null);
      }
      draw();
      if (F.home && F.home.refresh) F.home.refresh();
    } catch (e) { /* تجاهل أخطاء الشبكة المؤقتة */ }
    busy = false;
  }

  function startTimer() { stopTimer(); timer = setInterval(() => { if (!document.hidden) poll(); }, 5000); }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function stars(n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }

  function body() {
    const r = cur;
    if (!r) return '<p class="muted">جاري التحميل…</p>';
    const head = '<div class="muted small">' + issueName(r.issue) + (r.destination ? ' · إلى ' + F.esc(r.destination) : '') + ' · ' + F.ago(Date.parse(r.created_at)) + '</div>';
    if (r.status === 'open') {
      return head + '<div class="hero" style="margin-top:10px"><h2>' + F.icon('radar') + ' نبحث لك عن كرين…</h2>' +
        '<div class="sub">أرسلنا طلبك إلى ' + (r.targets != null ? r.targets : 'أقرب') + ' كرين. الطلب ينتهي بعد 15 دقيقة إذا ما انقبل.</div></div>' +
        '<div class="stack mt"><button class="btn danger block" id="rq-cancel">إلغاء الطلب</button><button class="btn secondary block" id="rq-hide">إخفاء (الطلب يبقى شغال)</button></div>';
    }
    if (r.status === 'accepted') {
      const c = r.crane;
      return head + '<div class="hero" style="margin-top:10px"><h2>' + F.icon('check-circle') + ' انقبل طلبك</h2>' +
        '<div class="name">' + F.esc(c ? c.name : 'كرين') + (c && c.verified ? ' <span class="badge green">موثق</span>' : '') + '</div>' +
        '<div class="sub">' + F.esc(c ? c.type : '') + ' — اتصل وتفاهم على السعر ووقت الوصول.</div>' +
        (c && c.phone ? '<a class="btn big block green" href="tel:' + F.esc(c.phone) + '">' + F.icon('phone') + ' اتصل بالسائق</a>' : '') + '</div>' +
        '<div class="stack mt"><button class="btn secondary block" id="rq-report">' + F.icon('alert') + ' إبلاغ عن مشكلة</button><button class="btn secondary block" id="rq-hide">إخفاء</button></div>';
    }
    if (r.status === 'completed') {
      return head + '<div class="hero" style="margin-top:10px"><h2>' + F.icon('check-circle') + ' انتهى الطلب</h2>' +
        '<div class="sub">كيف كانت خدمة ' + F.esc(r.crane ? r.crane.name : 'الكرين') + '؟</div></div>' +
        '<div class="stars" id="rq-stars" style="font-size:34px;text-align:center;margin:12px 0;direction:ltr;cursor:pointer">' +
          [1, 2, 3, 4, 5].map((n) => '<span data-s="' + n + '" style="color:var(--amber,#F59E0B)">☆</span>').join(' ') + '</div>' +
        '<div class="field"><input id="rq-comment" maxlength="140" placeholder="تعليق (اختياري)"></div>' +
        '<div class="err" id="rq-err"></div>' +
        '<div class="row"><button class="btn grow" id="rq-rate" disabled>إرسال التقييم</button><button class="btn secondary" id="rq-skip">تخطّي</button></div>';
    }
    return head + '<div class="hero" style="margin-top:10px"><h2>' + (r.status === 'expired' ? 'انتهى وقت الطلب' : 'تم إلغاء الطلب') + '</h2>' +
      '<div class="sub">' + (r.status === 'expired' ? 'ما قبل أي كرين بالوقت المحدد. جرّب مرة ثانية أو اتصل بالكرينات من القائمة.' : 'تكدر ترسل طلب جديد بأي وقت.') + '</div></div>' +
      '<div class="stack mt"><button class="btn block" id="rq-again">طلب جديد</button><button class="btn secondary block" id="rq-hide">إغلاق</button></div>';
  }

  function draw() {
    if (!mod || !mod.open) return;
    const el = mod.m.el;
    el.innerHTML = '<h2>' + F.icon('alert') + ' طلبك</h2>' + body();
    const on = (id, fn) => { const n = F.$('#' + id, el); if (n) n.onclick = fn; };
    on('rq-hide', () => mod.m.close());
    on('rq-cancel', async () => {
      try { await F.sb.rpc('cancel_request', { p_request_id: cur.id }); F.toast('تم إلغاء الطلب'); setActive(null); cur = null; mod.m.close(); if (F.home) F.home.refresh(); }
      catch (e) { F.toast(F.errMsg(e), 'err'); }
    });
    on('rq-again', () => { setActive(null); cur = null; mod.m.close(); start(); });
    on('rq-skip', () => { setActive(null); cur = null; mod.m.close(); if (F.home) F.home.refresh(); });
    on('rq-report', () => report(cur.accepted_crane_id));
    const st = F.$('#rq-stars', el);
    if (st) {
      let val = 0;
      st.onclick = (e) => {
        const s = e.target.closest('[data-s]'); if (!s) return;
        val = +s.dataset.s;
        F.$$('[data-s]', st).forEach((x) => { x.textContent = +x.dataset.s <= val ? '★' : '☆'; });
        F.$('#rq-rate', el).disabled = false;
      };
      on('rq-rate', async () => {
        try {
          await F.sb.q('ratings', '', { method: 'POST', body: { request_id: cur.id, crane_id: cur.accepted_crane_id, customer_id: F.sb.uid(), stars: val, comment: F.$('#rq-comment', el).value.trim() || null } });
          F.toast('شكراً على تقييمك', 'ok');
          setActive(null); cur = null; mod.m.close(); if (F.home) F.home.refresh();
        } catch (e) { F.$('#rq-err', el).textContent = F.errMsg(e); }
      });
    }
  }

  function track(id, targets) {
    if (mod && mod.open) return;
    if (!getActive()) setActive({ id: id, targets: targets });
    const m = F.modal('', { sticky: false, onClose: () => { mod.open = false; if (!getActive()) stopTimer(); } });
    mod = { m: m, open: true };
    if (!cur || cur.id !== id) cur = null;
    draw();
    poll();
    startTimer();
  }

  /* ---------- إبلاغ ---------- */
  const REASONS = [['no_answer', 'ما رد'], ['wrong_price', 'سعر مختلف'], ['behavior', 'سوء تعامل'], ['fake', 'معلومات مزيفة'], ['other', 'سبب ثاني']];
  function report(craneId) {
    if (F.isGuest()) return F.requireLogin('لازم حساب حتى تبلّغ.');
    const m = F.modal(
      '<h2>إبلاغ عن كرين</h2><form id="rp-form"><div class="field"><label>السبب</label><select id="rp-r">' +
      REASONS.map((r) => '<option value="' + r[0] + '">' + r[1] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>تفاصيل (اختياري)</label><input id="rp-d" maxlength="200"></div><div class="err" id="rp-e"></div>' +
      '<div class="row"><button class="btn grow" type="submit">إرسال</button><button class="btn secondary" type="button" id="rp-no">إلغاء</button></div></form>'
    );
    F.$('#rp-no', m.el).onclick = m.close;
    F.$('#rp-form', m.el).onsubmit = async (e) => {
      e.preventDefault();
      try {
        await F.sb.q('reports', '', { method: 'POST', body: { reporter_id: F.sb.uid(), crane_id: craneId, reason: F.$('#rp-r', m.el).value, details: F.$('#rp-d', m.el).value.trim() || null, status: 'new' } });
        m.close(); F.toast('وصل بلاغك للإدارة', 'ok');
      } catch (ex) { F.$('#rp-e', m.el).textContent = F.errMsg(ex); }
    };
  }

  /* ---------- شريط الطلب النشط بالرئيسية ---------- */
  function banner(box) {
    if (!box) return;
    const a = getActive();
    if (!a || F.isGuest()) { box.innerHTML = ''; stopTimerIfIdle(); return; }
    const s = cur ? cur.status : 'open';
    const txt = { open: 'نبحث لك عن كرين…', accepted: 'انقبل طلبك — اضغط للتفاصيل', completed: 'انتهى الطلب — قيّم الخدمة', cancelled: 'الطلب ملغي', expired: 'انتهى وقت الطلب' }[s];
    box.innerHTML = '<button class="btn block ' + (s === 'accepted' ? 'green' : 'secondary') + '" id="rq-banner" style="margin-bottom:10px">' + F.icon('alert') + ' طلبك: ' + txt + '</button>';
    F.$('#rq-banner', box).onclick = () => track(a.id, a.targets);
    if (!timer) { startTimer(); poll(); }
  }
  function stopTimerIfIdle() { if (!(mod && mod.open)) stopTimer(); }

  F.request = { start: start, banner: banner, report: report, active: getActive, reset: () => { setActive(null); cur = null; stopTimer(); } };
})();

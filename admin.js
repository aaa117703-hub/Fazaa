/* سند جايك — لوحة الإدارة (حقيقية: الصلاحية من جدول user_roles + RLS بقاعدة البيانات) */
(function () {
  'use strict';
  const F = window.F;
  let tab = 'overview';
  let cache = { cranes: [], phones: {} };

  const TABS = [['overview', 'نظرة عامة'], ['cranes', 'الكرينات'], ['requests', 'الطلبات'], ['reports', 'البلاغات'], ['health', 'فحص الاتصال']];
  const stat = (n, l) => '<div class="stat"><b>' + n + '</b><span>' + l + '</span></div>';
  const ISSUE = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح', accident: 'حادث', other: 'أخرى' };
  const REASON = { no_answer: 'ما رد', wrong_price: 'سعر مختلف', behavior: 'سوء تعامل', fake: 'معلومات مزيفة', other: 'أخرى' };
  const RSTATUS = { open: 'مفتوح', accepted: 'مقبول', completed: 'منتهي', cancelled: 'ملغي', expired: 'منتهي الوقت' };

  async function overview() {
    const c = await Promise.all([
      F.sb.count('cranes'), F.sb.count('cranes', 'listed=eq.true'), F.sb.count('cranes', 'listed=eq.false'),
      F.sb.count('cranes', 'status=eq.available&listed=eq.true'), F.sb.count('profiles'),
      F.sb.count('requests'), F.sb.count('requests', 'status=eq.open'), F.sb.count('requests', 'status=eq.completed'),
      F.sb.count('calls'), F.sb.count('reports', 'status=eq.new')
    ]);
    return '<div class="stats">' + stat(c[0], 'كل الكرينات') + stat(c[1], 'ظاهر للزبائن') + stat(c[2], 'بانتظار الموافقة') + '</div>' +
      '<div class="stats mt">' + stat(c[3], 'متاح الحين') + stat(c[4], 'مستخدمين') + stat(c[9], 'بلاغات جديدة') + '</div>' +
      '<div class="stats mt">' + stat(c[5], 'كل الطلبات') + stat(c[6], 'طلبات مفتوحة') + stat(c[7], 'طلبات منتهية') + '</div>' +
      '<div class="stats mt">' + stat(c[8], 'كل الاتصالات') + '</div>' +
      '<div class="card mt"><h2>معيار الانتقال للمرحلة 2</h2><p class="muted small">20+ اتصال أو طلب حقيقي خلال أسبوعين من سواقين حقيقيين. الكرينات التجريبية ما تُحسب.</p></div>';
  }

  async function cranes() {
    const [rows, cs] = await Promise.all([
      F.sb.q('cranes', 'select=*&order=created_at.desc&limit=200'),
      F.sb.q('crane_contacts', 'select=crane_id,phone&limit=500')
    ]);
    cache.cranes = rows || [];
    cache.phones = {};
    (cs || []).forEach((x) => { cache.phones[x.crane_id] = x.phone; });
    const trs = cache.cranes.map((c) =>
      '<tr><td>' + F.esc(c.name) + (c.is_demo ? ' <span class="badge">تجريبي</span>' : '') + '</td>' +
      '<td>' + F.esc(c.type) + '</td>' +
      '<td><span class="dot ' + (c.status === 'available' ? 'green' : 'red') + '"></span>' + (c.status === 'available' ? 'متاح' : 'مشغول') + '</td>' +
      '<td style="direction:ltr">' + F.esc(cache.phones[c.id] || '—') + '</td>' +
      '<td><select data-pkg="' + c.id + '">' + F.PACKAGES.map((p) => '<option value="' + p.id + '"' + (p.id === c.package ? ' selected' : '') + '>' + p.name + '</option>').join('') + '</select></td>' +
      '<td><div class="row">' +
        '<button class="btn sm ' + (c.listed ? 'green' : 'secondary') + '" data-a="list" data-id="' + c.id + '">' + (c.listed ? 'ظاهر' : 'وافق') + '</button>' +
        '<button class="btn sm ' + (c.verified ? 'green' : 'secondary') + '" data-a="verify" data-id="' + c.id + '">' + (c.verified ? 'موثق' : 'وثّق') + '</button>' +
        '<button class="btn sm danger" data-a="del" data-id="' + c.id + '">حذف</button></div></td></tr>').join('');
    return '<div class="card"><div class="row between"><h2 style="margin:0">الكرينات (' + cache.cranes.length + ')</h2><button class="btn sm" data-a="add">+ إضافة كرين</button></div>' +
      '<p class="muted small mt-s">«وافق» = يظهر للزبائن. «وثّق» فقط بعد ما تشوف السائق وكرينه بنفسك.</p>' +
      '<div class="table-wrap mt-s"><table><thead><tr><th>الاسم</th><th>النوع</th><th>الحالة</th><th>الهاتف</th><th>الباقة</th><th></th></tr></thead><tbody>' +
      (trs || '<tr><td colspan="6" class="muted">لا يوجد كرينات.</td></tr>') + '</tbody></table></div></div>';
  }

  async function requests() {
    const rows = await F.sb.q('requests', 'select=id,issue,status,destination,created_at,accepted_at,cranes(name)&order=created_at.desc&limit=50');
    return '<div class="card"><h2>آخر 50 طلب</h2><div class="table-wrap"><table><thead><tr><th>الوقت</th><th>المشكلة</th><th>الحالة</th><th>الكرين</th></tr></thead><tbody>' +
      ((rows || []).map((r) => '<tr><td>' + F.fmtDate(Date.parse(r.created_at)) + '</td><td>' + (ISSUE[r.issue] || r.issue) + '</td><td>' + (RSTATUS[r.status] || r.status) + '</td><td>' + F.esc(r.cranes ? r.cranes.name : '—') + '</td></tr>').join('') || '<tr><td colspan="4" class="muted">ما كو طلبات بعد.</td></tr>') +
      '</tbody></table></div></div>';
  }

  async function reports() {
    const rows = await F.sb.q('reports', 'select=id,reason,details,status,created_at,cranes(name)&order=created_at.desc&limit=100');
    return '<div class="card"><h2>البلاغات</h2><div class="table-wrap"><table><thead><tr><th>الوقت</th><th>الكرين</th><th>السبب</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      ((rows || []).map((r) => '<tr><td>' + F.fmtDate(Date.parse(r.created_at)) + '</td><td>' + F.esc(r.cranes ? r.cranes.name : '—') + '</td><td>' + (REASON[r.reason] || r.reason) + (r.details ? '<div class="muted small">' + F.esc(r.details) + '</div>' : '') + '</td>' +
        '<td>' + ({ new: 'جديد', reviewed: 'تمت المراجعة', dismissed: 'مرفوض' }[r.status] || r.status) + '</td>' +
        '<td>' + (r.status === 'new' ? '<div class="row"><button class="btn sm green" data-a="rp" data-s="reviewed" data-id="' + r.id + '">تمت</button><button class="btn sm secondary" data-a="rp" data-s="dismissed" data-id="' + r.id + '">تجاهل</button></div>' : '') + '</td></tr>').join('') || '<tr><td colspan="5" class="muted">ما كو بلاغات.</td></tr>') +
      '</tbody></table></div></div>';
  }

  async function health() {
    const checks = [];
    const t = async (name, fn) => { try { checks.push([name, true, await fn()]); } catch (e) { checks.push([name, false, F.errMsg(e)]); } };
    await t('قراءة الكرينات (زائر)', async () => (await F.fetchCranes(F.CENTER.lat, F.CENTER.lng)).length + ' كرين');
    await t('الجلسة', async () => F.user().email);
    await t('صلاحية المدير', async () => { if (!F.isRealAdmin()) throw new Error('غير مدير'); return 'مدير'; });
    await t('قراءة أرقام الكرينات', async () => (await F.sb.q('crane_contacts', 'select=crane_id&limit=1')).length >= 0 ? 'يعمل' : '');
    await t('قراءة الطلبات', async () => (await F.sb.count('requests')) + ' طلب');
    return '<div class="card"><h2>فحص الاتصال بقاعدة البيانات</h2><ul class="list">' +
      checks.map((c) => '<li><span>' + c[0] + '</span><span class="' + (c[1] ? '' : 'muted') + '">' + (c[1] ? '✅ ' : '❌ ') + F.esc(c[2]) + '</span></li>').join('') + '</ul>' +
      '<p class="muted small mt-s">الخادم: ' + F.esc(F.sb.API) + '</p></div>';
  }

  async function render() {
    const el = F.$('#v-admin');
    const hdr = '<h1>' + F.icon('lock') + ' لوحة الإدارة</h1><div class="tabs">' +
      TABS.map((t) => '<button class="chip ' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    el.innerHTML = hdr + '<p class="muted center mt">جاري التحميل…</p>';
    let body;
    try { body = await ({ overview: overview, cranes: cranes, requests: requests, reports: reports, health: health }[tab])(); }
    catch (e) { body = '<div class="warn">' + F.esc(F.errMsg(e)) + '</div>'; }
    el.innerHTML = hdr + body;
    F.$$('[data-pkg]', el).forEach((s) => { s.onchange = () => patch(s.dataset.pkg, { package: s.value }, true); });
  }

  async function patch(id, body, noRender) {
    try { await F.sb.q('cranes', 'id=eq.' + id, { method: 'PATCH', body: body }); F.toast('تم', 'ok'); if (!noRender) render(); }
    catch (e) { F.toast(F.errMsg(e), 'err'); }
  }

  function confirmBox(title, text, yesLabel, onYes) {
    const m = F.modal('<h2>' + title + '</h2><p class="muted">' + text + '</p><div class="row mt"><button class="btn danger grow" id="cf-yes">' + yesLabel + '</button><button class="btn secondary grow" id="cf-no">رجوع</button></div>');
    F.$('#cf-no', m.el).onclick = m.close;
    F.$('#cf-yes', m.el).onclick = () => { m.close(); onYes(); };
  }

  function addModal() {
    let loc = { lat: F.CENTER.lat, lng: F.CENTER.lng };
    const m = F.modal(
      '<h2>إضافة كرين (من الإدارة)</h2><form id="ad-form" novalidate>' +
      '<div class="field"><label>الاسم</label><input id="ad-name" maxlength="40"></div>' +
      '<div class="field"><label>النوع</label><select id="ad-type">' + F.TYPES.map((t) => '<option>' + t + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>رقم الهاتف</label><input id="ad-phone" class="ltr" inputmode="tel" maxlength="16"><div class="err" id="ad-err"></div></div>' +
      '<div class="field"><label>الموقع</label><button type="button" class="btn secondary" id="ad-loc">' + F.icon('pin') + ' حدد على الخريطة (الحالي: مركز العراق)</button></div>' +
      '<div class="row"><button class="btn grow" type="submit">إضافة</button><button class="btn secondary" type="button" id="ad-cancel">إلغاء</button></div></form>');
    F.$('#ad-cancel', m.el).onclick = m.close;
    F.$('#ad-loc', m.el).onclick = async () => { const p = await F.pickLocation(loc); if (p) { loc = p; F.$('#ad-loc', m.el).innerHTML = F.icon('check-circle') + ' تم تحديد الموقع'; } };
    F.$('#ad-form', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const name = F.$('#ad-name', m.el).value.trim(), phone = F.cleanPhone(F.$('#ad-phone', m.el).value);
      if (name.length < 3) { F.$('#ad-err', m.el).textContent = 'اكتب اسم الكرين.'; return; }
      if (!F.validPhone(phone)) { F.$('#ad-err', m.el).textContent = 'الرقم لازم 11 رقم ويبدأ بـ 07.'; return; }
      try {
        const r = await F.sb.q('cranes', '', { method: 'POST', prefer: 'return=representation', body: { name: name, type: F.$('#ad-type', m.el).value, lat: loc.lat, lng: loc.lng, status: 'busy', listed: true, verified: false, package: 'free', is_demo: false } });
        await F.sb.q('crane_contacts', '', { method: 'POST', body: { crane_id: r[0].id, phone: phone } });
        m.close(); F.toast('تمت الإضافة', 'ok'); render();
      } catch (ex) { F.$('#ad-err', m.el).textContent = F.errMsg(ex); }
    };
  }

  function onClick(e) {
    const t = e.target.closest('[data-tab],[data-a]');
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
    const a = t.dataset.a, id = t.dataset.id;
    const c = cache.cranes.find((x) => x.id === id);
    if (a === 'add') return addModal();
    if (a === 'list' && c) return patch(id, { listed: !c.listed });
    if (a === 'verify' && c) return patch(id, { verified: !c.verified });
    if (a === 'del') return confirmBox('حذف الكرين؟', F.esc(c ? c.name : ''), 'احذف', async () => {
      try { await F.sb.q('cranes', 'id=eq.' + id, { method: 'DELETE' }); F.toast('تم الحذف', 'ok'); } catch (err) { F.toast(F.errMsg(err), 'err'); }
      render();
    });
    if (a === 'rp') return F.sb.q('reports', 'id=eq.' + id, { method: 'PATCH', body: { status: t.dataset.s } }).then(render).catch((err) => F.toast(F.errMsg(err), 'err'));
  }

  F.admin = {
    init: function () { F.$('#v-admin').addEventListener('click', onClick); },
    // يرجّع true إذا مسموح يعرض الصفحة
    async show() {
      if (!F.isAdmin()) { F.toast('هذي الصفحة للمدير فقط', 'err'); return false; }
      render();
      return true;
    }
  };
})();

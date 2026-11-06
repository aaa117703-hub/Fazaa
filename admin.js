/* سند جايك — لوحة الإدارة (حقيقية: الصلاحية من جدول user_roles + RLS بقاعدة البيانات) */
(function () {
  'use strict';
  const F = window.F;
  let tab = 'subs', mode = 'drivers', govFilter = '';
  let cache = { cranes: [], phones: {} };

  const TABSETS = {
    drivers: [['subs', 'المشتركين'], ['cranes', 'كل السواق'], ['docs', 'الوثائق']],
    app: [['control', 'التحكم'], ['shops', 'المحلات'], ['overview', 'نظرة عامة'], ['requests', 'الطلبات'], ['reports', 'البلاغات'], ['health', 'فحص الاتصال']]
  };
  const DAY = 864e5;
  const left = (c) => {
    if (F.effTier(c) === 'bronze') return c.tier !== 'bronze' && c.sub_expires_at ? '<span class="badge red">منتهي</span>' : '<span class="muted small">مجاني</span>';
    const d = Math.ceil((Date.parse(c.sub_expires_at) - Date.now()) / DAY);
    return '<span class="badge ' + (d <= 5 ? 'red' : 'green') + '">' + (c.sub_period === 'yearly' ? 'سنوي' : 'شهري') + ' · باقي ' + d + ' يوم</span>';
  };
  const dshort = (s) => (s ? new Date(s).toLocaleDateString('en-GB') : '—');
  const DK = { id_front: 'الهوية — أمام', id_back: 'الهوية — خلف', vehicle_front: 'سنوية — أمام', vehicle_back: 'سنوية — خلف', license_front: 'الإجازة — أمام', license_back: 'الإجازة — خلف' };
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
    const list = govFilter ? cache.cranes.filter((c) => c.governorate === govFilter) : cache.cranes;
    const trs = list.map((c) =>
      '<tr><td>' + F.esc(c.name) + (c.is_demo ? ' <span class="badge">تجريبي</span>' : '') + '</td>' +
      '<td>' + F.esc(c.type) + '</td><td>' + F.esc(c.governorate || '—') + '</td>' +
      '<td><span class="dot ' + (c.status === 'available' ? 'green' : 'red') + '"></span>' + (c.status === 'available' ? 'متاح' : 'مشغول') + '</td>' +
      '<td style="direction:ltr">' + F.esc(cache.phones[c.id] || '—') + '</td>' +
      '<td>' + F.tierOf(F.effTier(c)).name + '<div>' + left(c) + '</div></td>' +
      '<td><div class="row">' +
        '<button class="btn sm ' + (c.listed ? 'green' : 'secondary') + '" data-a="list" data-id="' + c.id + '">' + (c.listed ? 'ظاهر' : 'وافق') + '</button>' +
        '<button class="btn sm ' + (c.verified ? 'green' : 'secondary') + '" data-a="verify" data-id="' + c.id + '">' + (c.verified ? 'موثق' : 'وثّق') + '</button>' +
        '<button class="btn sm secondary" data-a="sub" data-id="' + c.id + '">اشتراك</button>' +
        '<button class="btn sm secondary" data-a="info" data-id="' + c.id + '">معلومات</button>' +
        '<button class="btn sm danger" data-a="del" data-id="' + c.id + '">حذف</button></div></td></tr>').join('');
    return '<div class="card"><div class="row between"><h2 style="margin:0">كل السواق (' + cache.cranes.length + ')</h2><button class="btn sm" data-a="add">+ إضافة كرين</button></div>' +
      '<div class="field mt-s"><select id="ad-gov"><option value="">كل المحافظات</option>' + F.GOVS.map((g) => '<option' + (g.name === govFilter ? ' selected' : '') + '>' + g.name + '</option>').join('') + '</select></div>' +
      '<p class="muted small mt-s">«وافق» = يظهر للزبائن. «وثّق» فقط بعد ما تشوف السائق وكرينه بنفسك.</p>' +
      '<div class="table-wrap mt-s"><table><thead><tr><th>الاسم</th><th>النوع</th><th>المحافظة</th><th>الحالة</th><th>الهاتف</th><th>الاشتراك</th><th></th></tr></thead><tbody>' +
      (trs || '<tr><td colspan="7" class="muted">لا يوجد كرينات.</td></tr>') + '</tbody></table></div></div>';
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

  async function docsTab() {
    const rows = await F.sb.q('driver_documents', 'select=id,kind,path,status,note,created_at,crane_id,cranes(name,verified,governorate)&order=created_at.asc&limit=300');
    const by = {};
    (rows || []).forEach((r) => { (by[r.crane_id] = by[r.crane_id] || { c: r.cranes, id: r.crane_id, d: [] }).d.push(r); });
    const list = Object.values(by).sort((x, y) => y.d.filter((z) => z.status === 'pending').length - x.d.filter((z) => z.status === 'pending').length);
    return '<div class="card"><h2>وثائق السواق (' + list.length + ')</h2><p class="muted small">اضغط «عرض» لرؤية الصورة، اقبلها أو ارفضها، ثم سجّل بيانات السائق من «معلومات» وفعّل «موثق».</p>' +
      (list.map((g) => '<div class="doc-driver"><div class="row between"><b>' + F.esc(g.c ? g.c.name : '—') + '</b><span class="muted small">' + F.esc(g.c && g.c.governorate || '') + '</span></div>' +
        '<div class="doc-grid">' + g.d.map((r) =>
          '<div class="doc-slot"><b>' + (DK[r.kind] || r.kind) + '</b><span class="badge ' + ({ pending: 'amber', approved: 'green', rejected: 'red' }[r.status]) + '">' + ({ pending: 'بانتظار', approved: 'مقبول', rejected: 'مرفوض' }[r.status]) + '</span>' +
          '<div class="row"><button class="btn sm secondary" data-a="doc-view" data-p="' + F.esc(r.path) + '">عرض</button>' +
          (r.status !== 'approved' ? '<button class="btn sm green" data-a="doc-ok" data-id="' + r.id + '">قبول</button>' : '') +
          (r.status !== 'rejected' ? '<button class="btn sm danger" data-a="doc-no" data-id="' + r.id + '">رفض</button>' : '') + '</div></div>').join('') + '</div>' +
        '<div class="row mt-s"><button class="btn sm secondary" data-a="info" data-id="' + g.id + '">معلومات السائق</button><button class="btn sm ' + (g.c && g.c.verified ? 'green' : '') + '" data-a="verify-crane" data-id="' + g.id + '">' + (g.c && g.c.verified ? 'موثق ✓' : 'وثّق الكرين') + '</button></div></div>').join('') || '<p class="muted">ما كو وثائق مرفوعة بعد.</p>') + '</div>';
  }

  async function subs() {
    const rows = await F.sb.q('cranes', 'select=*&order=created_at.desc&limit=500');
    cache.cranes = rows || [];
    const real = cache.cranes.filter((c) => !c.is_demo);
    const t = (id) => real.filter((c) => F.effTier(c) === id);
    const paid = real.filter((c) => F.effTier(c) !== 'bronze');
    const head = '<div class="stats">' + stat(real.length, 'كل السواق المسجلين') + stat(paid.length, 'مشتركين') + stat(real.filter((c) => c.tier !== 'bronze' && F.effTier(c) === 'bronze').length, 'اشتراك منتهي') + '</div>';
    const sec = F.TIERS.map((p) => {
      const l = t(p.id);
      return '<div class="card mt tier-sec tier-' + p.id + '"><div class="row between"><h2 style="margin:0;color:' + p.color + '">' + p.name + '</h2><span class="count-pill">' + l.length + '</span></div>' +
        (l.map((c) => '<div class="sub-row"><div><b>' + F.esc(c.name) + '</b><div class="muted small">' + F.esc(c.governorate || '—') + (c.plate ? ' · ' + F.esc(c.plate) : '') + '</div></div>' +
          '<div class="sub-side">' + left(c) + (p.id !== 'bronze' ? '<div class="muted small">ينتهي ' + dshort(c.sub_expires_at) + '</div>' : '') +
          '<button class="btn sm secondary" data-a="sub" data-id="' + c.id + '">إدارة</button></div></div>').join('') || '<p class="muted small">ما كو أحد.</p>') + '</div>';
    }).join('');
    return head + sec;
  }

  async function control() {
    const st = await F.sb.q('app_settings', 'select=key,value');
    const g = (k) => ((st || []).find((x) => x.key === k) || { value: {} }).value || {};
    const m = g('maintenance'), n = g('announcement');
    return '<div class="card"><h2>قفل التطبيق (صيانة)</h2><p class="muted small">عند التفعيل يظهر للزبائن والسواق شاشة صيانة ولا يدخلون. أنت (المدير) تبقى تدخل.</p>' +
      '<div class="field"><label>رسالة الصيانة</label><input id="mt-msg" maxlength="140" value="' + F.esc(m.msg || '') + '"></div>' +
      '<button class="btn block ' + (m.on ? 'danger' : '') + '" data-a="mt-toggle" data-on="' + (m.on ? 1 : 0) + '">' + (m.on ? 'التطبيق مقفول — اضغط للفتح' : 'اقفل التطبيق الآن') + '</button></div>' +
      '<div class="card mt"><h2>إعلان لكل المستخدمين</h2><p class="muted small">شريط يظهر أعلى التطبيق.</p>' +
      '<div class="field"><label>نص الإعلان</label><input id="an-msg" maxlength="160" value="' + F.esc(n.msg || '') + '"></div>' +
      '<div class="row"><button class="btn grow" data-a="an-save" data-on="1">نشر الإعلان</button><button class="btn secondary grow" data-a="an-save" data-on="0">إخفاء</button></div>' +
      '<p class="muted small mt-s">الحالة: ' + (n.on ? 'ظاهر' : 'مخفي') + '</p></div>';
  }

  const SK = { car_repair: 'تصليح سيارات', tyres: 'إطارات وبنشر', car_parts: 'قطع غيار', mechanic: 'ميكانيكي', car_electrics: 'كهرباء سيارات', oil_change: 'تبديل زيوت' };
  async function shopsTab() {
    const rows = await F.sb.q('shops', 'select=*&order=created_at.desc&limit=300');
    const pend = (rows || []).filter((r) => r.status === 'pending'), ok = (rows || []).filter((r) => r.status === 'approved');
    const line = (r, btns) => '<div class="sub-row"><div><b>' + F.esc(r.name) + '</b><div class="muted small">' + (SK[r.kind] || r.kind) + (r.governorate ? ' · ' + F.esc(r.governorate) : '') + (r.phone ? ' · ' + F.esc(r.phone) : '') + '</div>' +
      (r.note ? '<div class="muted small">' + F.esc(r.note) + '</div>' : '') + '<a class="small" target="_blank" rel="noopener" href="https://maps.google.com/?q=' + r.lat + ',' + r.lng + '">عرض بالخريطة</a></div><div class="row">' + btns + '</div></div>';
    return '<div class="card"><div class="row between"><h2 style="margin:0">بانتظار المراجعة (' + pend.length + ')</h2><button class="btn sm" data-a="shop-add">+ إضافة محل</button></div>' +
      (pend.map((r) => line(r, '<button class="btn sm green" data-a="shop-ok" data-id="' + r.id + '">قبول</button><button class="btn sm danger" data-a="shop-del" data-id="' + r.id + '">رفض</button>')).join('') || '<p class="muted small">ما كو محلات جديدة.</p>') + '</div>' +
      '<div class="card mt"><h2>المحلات المقبولة (' + ok.length + ')</h2>' +
      (ok.map((r) => line(r, '<button class="btn sm danger" data-a="shop-del" data-id="' + r.id + '">حذف</button>')).join('') || '<p class="muted small">ما كو بعد.</p>') + '</div>';
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
    const TABS = TABSETS[mode];
    if (!TABS.some((t) => t[0] === tab)) tab = TABS[0][0];
    const hdr = '<h1>' + F.icon('lock') + ' ' + (mode === 'app' ? 'إدارة التطبيق' : 'إدارة السواق') + '</h1><div class="tabs">' +
      TABS.map((t) => '<button class="chip ' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    el.innerHTML = hdr + '<p class="muted center mt">جاري التحميل…</p>';
    let body;
    try { body = await ({ overview: overview, shops: shopsTab, subs: subs, control: control, cranes: cranes, requests: requests, docs: docsTab, reports: reports, health: health }[tab])(); }
    catch (e) { body = '<div class="warn">' + F.esc(F.errMsg(e)) + '</div>'; }
    el.innerHTML = hdr + body;
    const gs = F.$('#ad-gov', el); if (gs) gs.onchange = () => { govFilter = gs.value; render(); };
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

  function subModal(c) {
    const m = F.modal('<h2>اشتراك ' + F.esc(c.name) + '</h2><p class="muted small">الحالي: ' + F.tierOf(F.effTier(c)).name + '</p>' +
      '<div class="field"><label>الباقة</label><select id="sb-t">' + F.TIERS.map((p) => '<option value="' + p.id + '"' + (p.id === F.effTier(c) ? ' selected' : '') + '>' + p.name + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>المدة</label><select id="sb-p"><option value="monthly">شهري (30 يوم)</option><option value="yearly">سنوي (365 يوم)</option></select></div>' +
      (F.effTier(c) !== 'bronze' ? '<label class="check"><input type="checkbox" id="sb-ext"> تمديد من تاريخ الانتهاء الحالي</label>' : '') +
      '<div class="row mt"><button class="btn grow" id="sb-ok">حفظ</button><button class="btn secondary" id="sb-x">رجوع</button></div>');
    F.$('#sb-x', m.el).onclick = m.close;
    F.$('#sb-ok', m.el).onclick = () => {
      const tier = F.$('#sb-t', m.el).value, per = F.$('#sb-p', m.el).value, ext = F.$('#sb-ext', m.el);
      let body;
      if (tier === 'bronze') body = { tier: 'bronze', sub_period: null, sub_started_at: null, sub_expires_at: null };
      else {
        const base = ext && ext.checked && F.effTier(c) !== 'bronze' ? Date.parse(c.sub_expires_at) : Date.now();
        body = { tier: tier, sub_period: per, sub_started_at: new Date().toISOString(), sub_expires_at: new Date(base + (per === 'yearly' ? 365 : 30) * DAY).toISOString() };
      }
      m.close(); patch(c.id, body);
    };
  }

  function infoModal(c) {
    const f = (id, l, v, ltr) => '<div class="field"><label>' + l + '</label><input id="' + id + '"' + (ltr ? ' class="ltr"' : '') + ' maxlength="60" value="' + F.esc(v || '') + '"></div>';
    const m = F.modal('<h2>بيانات السائق</h2>' + f('in-owner', 'اسم مالك السيارة', c.owner_name) + f('in-model', 'نوع السيارة', c.vehicle_model) + f('in-plate', 'رقم السيارة', c.plate) +
      '<div class="row mt"><button class="btn grow" id="in-ok">حفظ</button><button class="btn secondary" id="in-x">رجوع</button></div>');
    F.$('#in-x', m.el).onclick = m.close;
    F.$('#in-ok', m.el).onclick = () => {
      const v = (i) => F.$(i, m.el).value.trim() || null;
      m.close(); patch(c.id, { owner_name: v('#in-owner'), vehicle_model: v('#in-model'), plate: v('#in-plate') });
    };
  }

  async function setting(key, value) {
    try { await F.sb.q('app_settings', 'key=eq.' + key, { method: 'PATCH', body: { value: value, updated_at: new Date().toISOString() } }); F.toast('تم', 'ok'); render(); }
    catch (e) { F.toast(F.errMsg(e), 'err'); }
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
        const r = await F.sb.q('cranes', '', { method: 'POST', prefer: 'return=representation', body: { name: name, type: F.$('#ad-type', m.el).value, governorate: F.govOf(loc.lat, loc.lng), lat: loc.lat, lng: loc.lng, status: 'busy', listed: true, verified: false, tier: 'bronze', is_demo: false } });
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
    if (a === 'shop-add') return F.shops.add();
    if (a === 'shop-ok') return F.sb.q('shops', 'id=eq.' + id, { method: 'PATCH', body: { status: 'approved' } }).then(() => { F.shops.resetComm(); F.toast('تم القبول', 'ok'); render(); }).catch((err) => F.toast(F.errMsg(err), 'err'));
    if (a === 'shop-del') return F.sb.q('shops', 'id=eq.' + id, { method: 'DELETE' }).then(() => { F.shops.resetComm(); F.toast('تم', 'ok'); render(); }).catch((err) => F.toast(F.errMsg(err), 'err'));
    if (a === 'sub' && c) return subModal(c);
    if (a === 'info') { const cc = c || cache.cranes.find((x) => x.id === id); if (cc) return infoModal(cc); return F.sb.q('cranes', 'select=*&id=eq.' + id).then((r) => r && r[0] && infoModal(r[0])); }
    if (a === 'mt-toggle') return setting('maintenance', { on: t.dataset.on !== '1', msg: F.$('#mt-msg').value.trim() || 'التطبيق تحت الصيانة، نرجع لك بعد قليل.' });
    if (a === 'an-save') return setting('announcement', { on: t.dataset.on === '1', msg: F.$('#an-msg').value.trim() });
    if (a === 'list' && c) return patch(id, { listed: !c.listed });
    if (a === 'verify' && c) return patch(id, { verified: !c.verified });
    if (a === 'del') return confirmBox('حذف الكرين؟', F.esc(c ? c.name : ''), 'احذف', async () => {
      try { await F.sb.q('cranes', 'id=eq.' + id, { method: 'DELETE' }); F.toast('تم الحذف', 'ok'); } catch (err) { F.toast(F.errMsg(err), 'err'); }
      render();
    });
    if (a === 'doc-view') return F.sb.signedUrl('driver-docs', t.dataset.p).then((u) => { const m = F.modal('<img src="' + F.esc(u) + '" alt="" style="width:100%;border-radius:12px"><button class="btn block mt" id="dv-x">إغلاق</button>'); F.$('#dv-x', m.el).onclick = m.close; }).catch((err) => F.toast(F.errMsg(err), 'err'));
    if (a === 'doc-ok') return F.sb.q('driver_documents', 'id=eq.' + id, { method: 'PATCH', body: { status: 'approved' } }).then(() => { F.toast('تم القبول', 'ok'); render(); }).catch((err) => F.toast(F.errMsg(err), 'err'));
    if (a === 'doc-no') { const why = prompt('سبب الرفض (يظهر للسائق):') || 'الصورة غير واضحة'; return F.sb.q('driver_documents', 'id=eq.' + id, { method: 'PATCH', body: { status: 'rejected', note: why } }).then(() => { F.toast('تم الرفض'); render(); }).catch((err) => F.toast(F.errMsg(err), 'err')); }
    if (a === 'verify-crane') return patch(id, { verified: true });
    if (a === 'rp') return F.sb.q('reports', 'id=eq.' + id, { method: 'PATCH', body: { status: t.dataset.s } }).then(render).catch((err) => F.toast(F.errMsg(err), 'err'));
  }

  F.admin = {
    init: function () { F.$('#v-admin').addEventListener('click', onClick); },
    // يرجّع true إذا مسموح يعرض الصفحة
    async show(md) {
      if (md && md !== mode) { mode = md; tab = TABSETS[mode][0][0]; }
      if (!F.isAdmin()) { F.toast('هذي الصفحة للمدير فقط', 'err'); return false; }
      render();
      return true;
    }
  };
})();

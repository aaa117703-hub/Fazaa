/* سند جايك — لوحة الإدارة (حقيقية: الصلاحية من جدول user_roles + RLS بقاعدة البيانات) */
(function () {
  'use strict';
  const F = window.F;
  let tab = 'subreq', mode = 'drivers', govFilter = '', userQ = '', userF = 'all', usersCache = [];
  let cache = { cranes: [], phones: {} };

  const TABSETS = {
    drivers: [['subreq', 'طلبات الاشتراك'], ['subs', 'المشتركين'], ['cranes', 'كل السواق'], ['docs', 'الوثائق']],
    app: [['users', 'المستخدمين'], ['control', 'التحكم'], ['shops', 'المحلات'], ['overview', 'نظرة عامة'], ['requests', 'الطلبات'], ['reports', 'البلاغات'], ['errors', 'الأخطاء'], ['alog', 'السجل'], ['health', 'فحص الاتصال']]
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
    const [st, rep] = await Promise.all([F.sb.rpc('admin_stats'), F.sb.count('reports', 'status=eq.new')]);
    const price = (id) => (F.tierOf(id) || {}).price || 0;
    let monthly = 0, total = 0;
    (st.subs || []).forEach((x) => { const p = price(x.tier); if (x.period === 'yearly') { monthly += x.n * p * 10 / 12; total += x.n * p * 10; } else { monthly += x.n * p; total += x.n * p; } });
    const days = st.daily || [], mx = Math.max(1, ...days.map((d) => d.n));
    const chart = '<div class="bars">' + days.map((d) => '<div class="bar" title="' + d.d + ': ' + d.n + '"><i style="height:' + Math.round(d.n / mx * 100) + '%"></i><span>' + d.d.slice(3) + '</span></div>').join('') + '</div>';
    const gmax = Math.max(1, ...(st.by_gov || []).map((g) => g.n));
    return (await extraStats()) + '<div class="stats">' + stat(st.today, 'طلبات اليوم') + stat(st.week, 'آخر 7 أيام') + stat(st.month, 'آخر 30 يوم') + '</div>' +
      '<div class="stats mt">' + stat(st.drivers, 'سواق مسجلين') + stat(st.online, 'متاح الحين') + stat(st.users, 'مستخدمين') + '</div>' +
      '<div class="stats mt">' + stat(F.money(Math.round(monthly)), 'إيراد شهري تقريبي') + stat(F.money(Math.round(total)), 'قيمة الاشتراكات الفعّالة') + stat(st.avg_rating != null ? '★ ' + st.avg_rating : '—', 'متوسط التقييم') + '</div>' +
      '<div class="stats mt">' + stat(st.completed_month, 'طلبات مكتملة (30 يوم)') + stat(rep, 'بلاغات جديدة') + stat(st.month ? Math.round(st.completed_month / st.month * 100) + '%' : '—', 'نسبة الإنجاز') + '</div>' +
      '<div class="card mt"><h2>الطلبات آخر 14 يوم</h2>' + chart + '</div>' +
      '<div class="card mt"><h2>السواق حسب المحافظة</h2>' + ((st.by_gov || []).map((g) => '<div class="hbar"><span>' + F.esc(g.g) + '</span><div><i style="width:' + Math.round(g.n / gmax * 100) + '%"></i></div><b>' + g.n + '</b></div>').join('') || '<p class="muted small">ما كو بيانات.</p>') + '</div>';
  }


  /* ---------- المستخدمين / طلبات الاشتراك / الأخطاء / السجل ---------- */
  const wa = (ph, msg) => 'https://wa.me/964' + String(ph || '').replace(/^0/, '') + (msg ? '?text=' + encodeURIComponent(msg) : '');
  const ago = (s) => { if (!s) return '—'; const d = Math.floor((Date.now() - Date.parse(s)) / DAY); return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : 'قبل ' + d + ' يوم'; };
  async function users() {
    const rows = (await F.sb.rpc('admin_users', { p_search: userQ || null, p_limit: 500 })) || [];
    usersCache = rows;
    const F2 = { all: () => true, drivers: (u) => !!u.crane_id, customers: (u) => !u.crane_id, subs: (u) => u.crane_id && u.tier !== 'bronze' && u.sub_expires_at && Date.parse(u.sub_expires_at) > Date.now(), pending: (u) => u.sub_pending, inactive: (u) => !u.last_sign_in_at || Date.now() - Date.parse(u.last_sign_in_at) > 30 * DAY };
    const L = { all: 'الكل', drivers: 'سواق', customers: 'زبائن', subs: 'مشتركين', pending: 'طلب اشتراك', inactive: 'غير نشط 30 يوم' };
    const list = rows.filter(F2[userF] || F2.all);
    return '<div class="card"><div class="field"><label>بحث (اسم، إيميل، هاتف)</label><div class="row"><input id="ad-uq" class="grow" maxlength="60" value="' + F.esc(userQ) + '"><button class="btn" data-a="u-search">بحث</button></div></div>' +
      '<div class="tabs">' + Object.keys(L).map((k) => '<button class="chip ' + (k === userF ? 'on' : '') + '" data-a="u-filter" data-id="' + k + '">' + L[k] + ' (' + rows.filter(F2[k]).length + ')</button>').join('') + '</div>' +
      '<div class="row between mt-s"><span class="muted small">' + list.length + ' مستخدم</span><button class="btn sm secondary" data-a="u-csv">تصدير Excel</button></div></div>' +
      '<div class="card mt">' + (list.map((u) =>
        '<div class="sub-row"><div><b>' + F.esc(u.full_name || 'بدون اسم') + '</b> ' +
        (u.crane_id ? '<span class="badge ' + (u.verified ? 'green' : 'amber') + '">سائق' + (u.verified ? ' موثق' : '') + '</span> ' : '') +
        (u.crane_id && u.tier !== 'bronze' ? '<span class="badge amber">' + F.esc((F.tierOf(u.tier) || {}).name || u.tier) + '</span> ' : '') +
        (u.sub_pending ? '<span class="badge red">طلب اشتراك</span>' : '') +
        '<div class="muted small ltr">' + F.esc(u.email || '') + '</div>' +
        '<div class="muted small">' + F.esc([u.governorate, u.car].filter(Boolean).join(' · ') || '—') + '</div>' +
        '<div class="muted small">سجّل ' + dshort(u.created_at) + ' · آخر دخول ' + ago(u.last_sign_in_at) + ' · طلبات ' + u.requests_n + ' · اتصالات ' + u.calls_n + '</div></div>' +
        '<div class="sub-side">' + (u.phone ? '<a class="btn sm secondary ltr" target="_blank" rel="noopener" href="' + wa(u.phone) + '">واتساب ' + F.esc(u.phone) + '</a>' : '<span class="muted small">بدون رقم</span>') + '</div></div>').join('') || '<p class="muted small">ما كو نتائج.</p>') + '</div>';
  }
  function csvUsers() {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['الاسم', 'الإيميل', 'الهاتف', 'المحافظة', 'السيارة', 'سائق', 'الباقة', 'ينتهي', 'تاريخ التسجيل', 'آخر دخول', 'الطلبات', 'الاتصالات'];
    const lines = usersCache.map((u) => [u.full_name, u.email, u.phone, u.governorate, u.car, u.crane_id ? 'نعم' : 'لا', u.crane_id ? u.tier : '', u.sub_expires_at || '', u.created_at, u.last_sign_in_at || '', u.requests_n, u.calls_n].map(q).join(','));
    const blob = new Blob(['﻿' + [head.map(q).join(',')].concat(lines).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sanad-users.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  async function subreq() {
    const [rows, ph] = await Promise.all([F.sb.q('subscription_requests', 'select=id,user_id,crane_id,tier,period,status,note,created_at,cranes(name,governorate)&order=created_at.desc&limit=200'), F.sb.q('crane_contacts', 'select=crane_id,phone&limit=1000')]);
    const phones = {}; (ph || []).forEach((x) => { phones[x.crane_id] = x.phone; });
    const line = (r) => {
      const t = (F.tierOf(r.tier) || {}), p = phones[r.crane_id];
      return '<div class="sub-row"><div><b>' + F.esc(r.cranes ? r.cranes.name : '—') + '</b> <span class="badge amber">' + F.esc(t.name || r.tier) + ' · ' + (r.period === 'yearly' ? 'سنوي' : 'شهري') + '</span>' +
        '<div class="muted small">' + F.esc(r.cranes && r.cranes.governorate || '') + ' · ' + dshort(r.created_at) + ' · ' + ({ pending: 'بانتظار', approved: 'مفعّل', rejected: 'مرفوض' }[r.status]) + '</div></div>' +
        '<div class="sub-side">' + (p ? '<a class="btn sm secondary" target="_blank" rel="noopener" href="' + wa(p, 'مرحباً، بخصوص طلب اشتراكك بعضوية «' + (t.name || '') + '» بسند جايك') + '">واتساب</a>' : '') +
        (r.status === 'pending' ? '<button class="btn sm green" data-a="sr-ok" data-id="' + r.id + '">تفعيل</button><button class="btn sm danger" data-a="sr-no" data-id="' + r.id + '">رفض</button>' : '') + '</div></div>';
    };
    const pend = (rows || []).filter((r) => r.status === 'pending'), done = (rows || []).filter((r) => r.status !== 'pending');
    return '<div class="card"><h2>بانتظار القرار (' + pend.length + ')</h2><p class="muted small">يوصل الطلب لما السائق يضغط «اطلب عبر واتساب». اتفق وياه بالواتساب، وبعد الدفع اضغط «تفعيل».</p>' + (pend.map(line).join('') || '<p class="muted small">ما كو طلبات.</p>') + '</div>' +
      '<div class="card mt"><h2>السجل (' + done.length + ')</h2>' + (done.map(line).join('') || '<p class="muted small">فارغ.</p>') + '</div>';
  }
  async function errorsTab() {
    const rows = (await F.sb.q('error_log', 'select=id,platform,msg,ctx,created_at,user_id&order=created_at.desc&limit=100')) || [];
    const by = {}; rows.forEach((r) => { (by[r.msg] = by[r.msg] || { n: 0, r: r }).n++; });
    const top = Object.values(by).sort((a, b) => b.n - a.n).slice(0, 8);
    return '<div class="card"><div class="row between"><h2 style="margin:0">أخطاء التطبيق (' + rows.length + ')</h2>' + (rows.length ? '<button class="btn sm danger" data-a="err-clear">مسح الكل</button>' : '') + '</div>' +
      '<p class="muted small">تنرسل تلقائياً من الموقع والتطبيق لما يصير خطأ عند المستخدم.</p>' +
      (top.length ? '<h3 class="mt-s">الأكثر تكراراً</h3>' + top.map((x) => '<div class="sub-row"><div class="small ltr">' + F.esc(x.r.msg) + '</div><div class="sub-side"><b>×' + x.n + '</b></div></div>').join('') : '') + '</div>' +
      '<div class="card mt">' + (rows.map((r) => '<div class="sub-row"><div><div class="small ltr">' + F.esc(r.msg) + '</div>' + (r.ctx ? '<div class="muted small ltr">' + F.esc(r.ctx) + '</div>' : '') + '</div><div class="sub-side muted small">' + F.esc(r.platform || '') + '<br>' + ago(r.created_at) + '</div></div>').join('') || '<p class="muted small">ما كو أخطاء 🎉</p>') + '</div>';
  }
  async function alogTab() {
    const rows = (await F.sb.q('admin_log', 'select=id,action,target,detail,created_at&order=created_at.desc&limit=100')) || [];
    const AL = { sub_approve: 'تفعيل اشتراك', sub_reject: 'رفض اشتراك' };
    return '<div class="card"><h2>سجل إجراءات الإدارة</h2>' + (rows.map((r) => '<div class="sub-row"><div><b>' + F.esc(AL[r.action] || r.action) + '</b><div class="muted small">' + F.esc(r.detail || '') + '</div></div><div class="sub-side muted small">' + dshort(r.created_at) + '</div></div>').join('') || '<p class="muted small">ما كو إجراءات بعد.</p>') + '</div>';
  }
  async function extraStats() {
    try {
      const o = await F.sb.rpc('admin_overview');
      return '<div class="stats">' + stat(o.users_7d, 'مستخدمين جدد (7 أيام)') + stat(o.active_7d, 'نشطين (7 أيام)') + stat(o.sub_pending, 'طلبات اشتراك') + '</div>' +
        '<div class="stats mt">' + stat(o.expiring_7d, 'اشتراكات تنتهي خلال أسبوع') + stat(o.req_unanswered_7d, 'طلبات بدون قبول (7 أيام)') + stat(o.errors_24h, 'أخطاء آخر 24 ساعة') + '</div>' +
        '<div class="stats mt">' + stat(o.docs_pending, 'وثائق بانتظار') + stat(o.shops_pending, 'محلات بانتظار') + stat(o.reports_new, 'بلاغات جديدة') + '</div>' +
        '<div class="stats mt">' + stat(o.tier_silver, 'مشتركين فضي') + stat(o.tier_gold, 'مشتركين ذهبي') + stat(o.tier_diamond, 'مشتركين شركات') + '</div><div class="mt"></div>';
    } catch (e) { return ''; }
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
    const rows = await F.sb.q('driver_documents', 'select=id,kind,path,status,note,created_at,crane_id,cranes(name,verified,governorate)&purged_at=is.null&order=created_at.asc&limit=300');
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
        '<div class="row mt-s"><button class="btn sm secondary" data-a="info" data-id="' + g.id + '">معلومات السائق</button><button class="btn sm ' + (g.c && g.c.verified ? 'green' : '') + '" data-a="dfile" data-id="' + g.id + '">' + (g.c && g.c.verified ? 'موثق ✓ — الملف' : 'ملف السائق والتوثيق') + '</button></div></div>').join('') || '<p class="muted">ما كو وثائق مرفوعة بعد.</p>') + '</div>';
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
    const m = g('maintenance'), n = g('announcement'), sp = g('support'), av = g('auto_verify'), dm = g('show_demo');
    return '<div class="card"><h2>رقم الدعم الفني (واتساب)</h2><p class="muted small">يظهر زر «تواصل مع الدعم» للمستخدمين.</p><div class="field"><input id="sp-phone" class="ltr" inputmode="tel" maxlength="16" placeholder="07701234567" value="' + F.esc(sp.phone || '') + '"></div><button class="btn block" data-a="sp-save">حفظ</button></div>' +
      '<div class="card mt"><h2>قفل التطبيق (صيانة)</h2><p class="muted small">عند التفعيل يظهر للزبائن والسواق شاشة صيانة ولا يدخلون. أنت (المدير) تبقى تدخل.</p>' +
      '<div class="field"><label>رسالة الصيانة</label><input id="mt-msg" maxlength="140" value="' + F.esc(m.msg || '') + '"></div>' +
      '<button class="btn block ' + (m.on ? 'danger' : '') + '" data-a="mt-toggle" data-on="' + (m.on ? 1 : 0) + '">' + (m.on ? 'التطبيق مقفول — اضغط للفتح' : 'اقفل التطبيق الآن') + '</button></div>' +
      '<div class="card mt"><h2>إعلان لكل المستخدمين</h2><p class="muted small">شريط يظهر أعلى التطبيق.</p>' +
      '<div class="field"><label>نص الإعلان</label><input id="an-msg" maxlength="160" value="' + F.esc(n.msg || '') + '"></div>' +
      '<div class="row"><button class="btn grow" data-a="an-save" data-on="1">نشر الإعلان</button><button class="btn secondary grow" data-a="an-save" data-on="0">إخفاء</button></div>' +
      '<p class="muted small mt-s">الحالة: ' + (n.on ? 'ظاهر' : 'مخفي') + '</p></div>' +
      '<div class="card mt"><h2>التوثيق التلقائي</h2><p class="muted small">إذا انفتح: السائق اللي وثائقه تطابق بياناته (وما عنده تكرار) يتوثق مباشرة وتنحذف صوره. إذا مطفي: تظهر «مطابق» وتضغط توثيق بنفسك. أنصح تبقيه مطفي أول أسبوعين.</p>' +
      '<button class="btn block ' + (av.on ? 'danger' : '') + '" data-a="set-auto" data-on="' + (av.on ? 1 : 0) + '">' + (av.on ? 'إطفاء التوثيق التلقائي' : 'تشغيل التوثيق التلقائي') + '</button></div>' +
      '<div class="card mt"><h2>الكرينات التجريبية</h2><p class="muted small">' + (dm.on === false ? 'مخفية عن الناس وتظهر لك فقط.' : 'ظاهرة للجميع حالياً (للتجربة).') + ' اطفيها قبل الإطلاق الحقيقي.</p>' +
      '<button class="btn block ' + (dm.on === false ? '' : 'danger') + '" data-a="set-demo" data-on="' + (dm.on === false ? 0 : 1) + '">' + (dm.on === false ? 'إظهار التجريبية' : 'إخفاء التجريبية عن الناس') + '</button></div>';
  }

  /* ملف السائق: المكتوب مقابل المقروء من الوثائق، التكرار، الصور، وقرار التوثيق */
  const CHK_T = { match: ['green', 'مطابق'], mismatch: ['red', 'غير مطابق'], unreadable: ['amber', 'صور غير واضحة'], pending: ['amber', 'لم يُفحص'], error: ['amber', 'تعذّر الفحص'] };
  function cmpRow(label, f) {
    f = f || {};
    return '<div class="dfc"><div class="row between"><b>' + label + '</b><span class="badge ' + (f.ok === true ? 'green' : f.ok === false ? 'red' : 'amber') + '">' + (f.ok === true ? 'يطابق' : f.ok === false ? 'يختلف' : 'غير محسوم') + '</span></div>' +
      '<div class="muted small">المكتوب: ' + F.esc(f.typed || '—') + '</div><div class="muted small">بالوثيقة: ' + F.esc(f.read || '—') + '</div></div>';
  }
  async function driverFile(id) {
    let c, ck, dc, ph, idn, dups;
    try {
      const r = await Promise.all([
        F.sb.q('cranes', 'select=*&id=eq.' + id), F.sb.q('doc_checks', 'select=status,message,details,auto_applied&crane_id=eq.' + id).catch(() => []),
        F.sb.q('driver_documents', 'select=id,kind,path,status&crane_id=eq.' + id + '&purged_at=is.null&order=kind'),
        F.sb.q('crane_contacts', 'select=phone&crane_id=eq.' + id).catch(() => []), F.sb.q('crane_identity', 'select=doc_name,doc_plate&crane_id=eq.' + id).catch(() => []),
        F.sb.rpc('admin_dups', { p_crane: id }).catch(() => [])
      ]);
      c = r[0] && r[0][0]; ck = r[1] && r[1][0]; dc = r[2] || []; ph = r[3] && r[3][0]; idn = r[4] && r[4][0]; dups = Array.isArray(r[5]) ? r[5] : [];
    } catch (e) { return F.toast(F.errMsg(e), 'err'); }
    if (!c) return F.toast('الكرين غير موجود', 'err');
    const f = ck && ck.details && ck.details.fields, st = CHK_T[ck ? ck.status : 'pending'] || CHK_T.pending;
    const m = F.modal('<h2>' + F.esc(c.name) + '</h2>' +
      '<p><span class="badge ' + (c.verified ? 'green' : 'amber') + '">' + (c.verified ? 'موثّق' : 'غير موثّق') + '</span>' + (c.suspended ? ' <span class="badge red">موقوف' + (c.suspend_reason ? ': ' + F.esc(c.suspend_reason) : '') + '</span>' : '') + (c.verified_until ? ' <span class="muted small">لحد ' + F.esc(c.verified_until) + '</span>' : '') + '</p>' +
      '<div class="card"><b>البيانات</b><div class="muted small">الاسم الثلاثي: ' + F.esc(idn && idn.doc_name || '—') + '</div><div class="muted small">رقم اللوحة: ' + F.esc(idn && idn.doc_plate || '—') + '</div><div class="muted small">السيارة: ' + F.esc([c.crane_make, c.crane_model].filter(Boolean).join(' ') || '—') + ' · ' + F.esc(c.type || '') + '</div><div class="muted small">المحافظة: ' + F.esc(c.governorate || '—') + '</div><div class="muted small ltr">الهاتف: ' + F.esc(ph && ph.phone || '—') + '</div></div>' +
      (dups.length ? '<div class="warn mt-s"><b>تنبيه: تكرار محتمل</b>' + dups.map((d) => '<div class="small">' + F.esc(d.name) + ' — ' + F.esc((d.why || []).join('، ')) + '</div>').join('') + '</div>' : '') +
      '<div class="card mt-s"><div class="row between"><b>مطابقة الوثائق</b><span class="badge ' + st[0] + '">' + st[1] + (ck && ck.auto_applied ? ' (تلقائي)' : '') + '</span></div>' +
        (ck && ck.message ? '<div class="muted small">' + F.esc(ck.message) + '</div>' : '') +
        (f ? cmpRow('الاسم', f.name) + cmpRow('رقم اللوحة', f.plate) + cmpRow('السيارة', f.car) + cmpRow('المحافظة', f.governorate) + (f.owner_differs === true ? '<div class="muted small">ملاحظة: اسم مالك السنوية يختلف عن اسم السائق.</div>' : '') : '') +
        '<button class="btn sm secondary mt-s" id="df-scan">' + (dc.length ? 'أعد الفحص' : 'فحص') + '</button></div>' +
      '<div class="card mt-s"><b>الصور (' + dc.length + ')</b>' + (dc.length ? dc.map((d) => '<div class="row between" style="padding:6px 0"><span>' + (DK[d.kind] || d.kind) + '</span><button class="btn sm secondary" data-p="' + F.esc(d.path) + '">عرض</button></div>').join('') : '<div class="muted small">ما كو صور (محذوفة بعد التوثيق أو ما انرفعت).</div>') + '</div>' +
      '<div class="card mt-s"><b>القرار</b><div class="field"><input id="df-why" maxlength="200" placeholder="سبب الرفض أو الإيقاف (يوصل للسائق)"></div><div class="row wrap">' +
        (c.verified ? '<button class="btn sm secondary grow" id="df-no">إلغاء التوثيق</button>' : '<button class="btn sm grow" id="df-ok">وثّق السائق</button><button class="btn sm danger grow" id="df-no">ارفض</button>') +
      '</div><button class="btn sm block mt-s ' + (c.suspended ? '' : 'danger') + '" id="df-sus">' + (c.suspended ? 'رفع الإيقاف' : 'إيقاف السائق (يختفي من الخريطة)') + '</button></div>' +
      '<button class="btn block mt" id="df-x">إغلاق</button>');
    const done = (msg) => { F.toast(msg, 'ok'); m.close(); render(); };
    const decide = async (ok) => {
      const why = F.$('#df-why', m.el).value.trim();
      try { const r = await F.sb.fn('verify-docs', { action: 'finalize', crane_id: id, ok: ok, reason: why || undefined, until: ok && ck && ck.details ? ck.details.until : undefined }); if (r && r.error) throw new Error(r.error); done(ok ? 'تم التوثيق وانحذفت الصور' : 'تم. وصل السبب للسائق'); } catch (e) { F.toast(F.errMsg(e), 'err'); }
    };
    F.$('#df-x', m.el).onclick = m.close;
    F.$('#df-scan', m.el).onclick = async () => { try { const r = await F.sb.fn('verify-docs', { action: 'scan', crane_id: id }); F.toast(r && r.message || 'تم الفحص', 'ok'); m.close(); driverFile(id); } catch (e) { F.toast(F.errMsg(e), 'err'); } };
    const okb = F.$('#df-ok', m.el); if (okb) okb.onclick = () => { if (dups.length || !ck || ck.status !== 'match') { const o = F.$('#df-ok', m.el); if (o.dataset.sure !== '1') { o.dataset.sure = '1'; o.textContent = (dups.length ? 'فيه تكرار' : 'مو «مطابق»') + ' — اضغط مرة ثانية للتأكيد'; return; } } decide(true); };
    F.$('#df-no', m.el).onclick = () => decide(false);
    F.$('#df-sus', m.el).onclick = async () => {
      const on = !c.suspended, why = F.$('#df-why', m.el).value.trim();
      try {
        await F.sb.q('cranes', 'id=eq.' + id, { method: 'PATCH', body: { suspended: on, suspended_auto: false, suspend_reason: on ? (why || 'إيقاف من الإدارة') : null } });
        F.sb.rpc('admin_log_add', { p_action: on ? 'driver_suspend' : 'driver_unsuspend', p_target: id, p_detail: why || null }).catch(() => {});
        done(on ? 'تم إيقاف السائق' : 'تم رفع الإيقاف');
      } catch (e) { F.toast(F.errMsg(e), 'err'); }
    };
    m.el.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => F.sb.signedUrl('driver-docs', b.dataset.p).then((u) => { const mm = F.modal('<img src="' + F.esc(u) + '" alt="" style="width:100%;border-radius:12px"><button class="btn block mt" id="dv-x">إغلاق</button>'); F.$('#dv-x', mm.el).onclick = mm.close; }).catch((err) => F.toast(F.errMsg(err), 'err')); });
  }

  const SK = { car_repair: 'تصليح سيارات', tyres: 'إطارات وبنشر', car_parts: 'قطع غيار', mechanic: 'ميكانيكي', car_electrics: 'كهرباء سيارات', oil_change: 'تبديل زيوت', fuel: 'محطة وقود', restaurant: 'مطعم على الطريق الدولي', rest_area: 'استراحة على الطريق الدولي' };
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
    try { body = await ({ users: users, subreq: subreq, errors: errorsTab, alog: alogTab, overview: overview, shops: shopsTab, subs: subs, control: control, cranes: cranes, requests: requests, docs: docsTab, reports: reports, health: health }[tab])(); }
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
    // ما أدخله السائق بقسم الوثائق: يُعبّأ تلقائياً إذا حقول الإدارة فارغة، والمدير يراجعه ويعتمده
    F.sb.q('crane_identity', 'select=doc_name,doc_plate&crane_id=eq.' + c.id).then((r) => {
      const d = r && r[0]; if (!d) return;
      const o = F.$('#in-owner', m.el), p = F.$('#in-plate', m.el);
      if (o && !o.value && d.doc_name) o.value = d.doc_name;
      if (p && !p.value && d.doc_plate) p.value = d.doc_plate;
      const h = F.$('h2', m.el); if (h) h.insertAdjacentHTML('afterend', '<p class="muted small">بيانات السائق من قسم الوثائق: ' + F.esc(d.doc_name || '—') + ' · ' + F.esc(d.doc_plate || '—') + '</p>');
    }).catch(() => {});
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
    if (a === 'u-search') { userQ = (F.$('#ad-uq').value || '').trim(); return render(); }
    if (a === 'u-filter') { userF = id; return render(); }
    if (a === 'u-csv') return csvUsers();
    if (a === 'err-clear') return confirmBox('مسح الأخطاء', 'تنمسح كل الأخطاء المسجلة.', 'امسح', () => F.sb.q('error_log', 'id=gt.0', { method: 'DELETE' }).then(() => { F.toast('تم', 'ok'); render(); }).catch((err) => F.toast(F.errMsg(err), 'err')));
    if (a === 'sr-ok') { const m = F.modal('<h2>تفعيل الاشتراك</h2><div class="field"><label>المدة (أشهر)</label><input id="sr-m" class="ltr" inputmode="numeric" value="1" maxlength="2"></div><div class="row mt"><button class="btn grow" id="sr-y">تفعيل</button><button class="btn secondary" id="sr-n">رجوع</button></div>'); F.$('#sr-n', m.el).onclick = m.close; F.$('#sr-y', m.el).onclick = () => { const mo = Math.max(1, Math.min(36, parseInt(F.$('#sr-m', m.el).value, 10) || 1)); m.close(); F.sb.rpc('decide_subscription', { p_id: id, p_approve: true, p_months: mo }).then(() => { F.toast('تم التفعيل', 'ok'); render(); }).catch((err) => F.toast(F.errMsg(err), 'err')); }; return; }
    if (a === 'sr-no') return F.sb.rpc('decide_subscription', { p_id: id, p_approve: false }).then(() => { F.toast('تم الرفض'); render(); }).catch((err) => F.toast(F.errMsg(err), 'err'));
    if (a === 'add') return addModal();
    if (a === 'sp-save') { const ph = F.cleanPhone(F.$('#sp-phone').value); if (ph && !F.validPhone(ph)) return F.toast('الرقم لازم 11 رقم ويبدأ بـ 07.', 'err'); return setting('support', { phone: ph || '' }); }
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
    if (a === 'verify-crane' || a === 'dfile') return driverFile(id);
    if (a === 'set-auto') return setting('auto_verify', { on: t.dataset.on !== '1' });
    if (a === 'set-demo') return setting('show_demo', { on: t.dataset.on !== '1' });
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

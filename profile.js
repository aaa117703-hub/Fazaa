/* سند جايك — الحساب: بياناتي، سجل اتصالاتي، الخصوصية، التصدير، الحذف */
(function () {
  'use strict';
  const F = window.F;

  async function render() {
    const el = F.$('#v-profile');
    const u = F.user();
    if (!u) {
      el.innerHTML = '<h1>' + F.icon('user') + ' حسابي</h1><div class="card"><p class="muted">' +
        (F.isRealAdmin() ? 'أنت تعاين التطبيق كزائر.' : 'أنت تتصفح كزائر. سجّل دخول حتى ترسل طلبات وتتصل بالكرينات.') +
        '</p><button class="btn block" id="p-login">دخول / حساب جديد</button></div>' +
        '<div class="row wrap mt"><button class="btn ghost" id="p-settings">' + F.icon('sliders') + ' الإعدادات</button></div>';
      F.$('#p-login', el).onclick = () => F.auth.open();
      F.$('#p-settings', el).onclick = () => { location.hash = '#settings'; };
      return;
    }
    el.innerHTML =
      '<h1>' + F.icon('user') + ' حسابي</h1>' +
      '<div class="card"><div class="row"><div class="grow"><h2 style="margin:0">' + F.esc(u.name || 'بدون اسم') + (F.isRealAdmin() ? ' <span class="badge amber">مدير</span>' : '') + '</h2>' +
        '<div class="muted small" style="direction:ltr;text-align:right">' + F.esc(u.phone) + '</div>' +
        '<div class="muted small" style="direction:ltr;text-align:right">' + F.esc(u.email || '') + '</div>' +
        '<div class="muted small">' + F.icon('car') + ' ' + F.esc(u.car) + '</div></div>' +
        '<button class="btn sm secondary" id="p-edit">تعديل</button></div></div>' +
      '<div class="card"><h2>سجل اتصالاتي بالكرينات</h2><div id="p-calls" class="muted small">جاري التحميل…</div></div>' +
      '<div class="card"><h2>بياناتي وخصوصيتي</h2><div class="stack">' +
        '<button class="btn secondary" id="p-priv">' + F.icon('doc') + ' سياسة الخصوصية</button>' +
        '<button class="btn secondary" id="p-export">' + F.icon('download') + ' تنزيل بياناتي</button>' +
        '<button class="btn danger" id="p-delete">' + F.icon('trash') + ' حذف حسابي وكل بياناتي</button></div></div>' +
      '<div class="row wrap mt"><button class="btn ghost" id="p-settings">' + F.icon('sliders') + ' الإعدادات</button>' +
        '<button class="btn ghost" id="p-logout">تسجيل خروج</button>' +
        (F.isAdmin() ? '<button class="btn ghost" id="p-admin">' + F.icon('lock') + ' لوحة الإدارة</button>' : '') + '</div>' +
      '<p class="muted small mt center">سند جايك · النسخة التجريبية 2.0</p>';

    F.$('#p-edit', el).onclick = () => editModal(u);
    F.$('#p-priv', el).onclick = F.showPrivacy;
    F.$('#p-export', el).onclick = exportMine;
    F.$('#p-delete', el).onclick = deleteMine;
    F.$('#p-logout', el).onclick = async () => { if (F.driver) F.driver.stop(); await F.sb.signOut(); location.hash = ''; location.reload(); };
    const ad = F.$('#p-admin', el); if (ad) ad.onclick = () => { location.hash = '#admin'; };
    F.$('#p-settings', el).onclick = () => { location.hash = '#settings'; };

    try {
      const rows = await F.sb.q('calls', 'select=created_at,cranes(name)&user_id=eq.' + u.id + '&order=created_at.desc&limit=10');
      F.$('#p-calls', el).innerHTML = rows && rows.length
        ? '<ul class="list">' + rows.map((e) => '<li><span>' + F.esc(e.cranes ? e.cranes.name : '—') + '</span><span class="muted">' + F.fmtDate(Date.parse(e.created_at)) + '</span></li>').join('') + '</ul>'
        : 'ما اتصلت بأي كرين بعد.';
    } catch (e) { const n = F.$('#p-calls', el); if (n) n.textContent = 'تعذّر التحميل.'; }
  }

  function editModal(u) {
    const m = F.modal(
      '<h2>تعديل بياناتي</h2><form id="pe-form" novalidate>' +
      '<div class="field"><label>الاسم الثلاثي</label><input id="pe-name" value="' + F.esc(u.name) + '"><div class="err" id="pe-en"></div></div>' +
      '<div class="field"><label>رقم الهاتف</label><input id="pe-phone" class="ltr" inputmode="tel" maxlength="16" value="' + F.esc(u.phone) + '"><div class="err" id="pe-ep"></div></div>' +
      '<div class="field"><label>نوع السيارة</label><input id="pe-car" value="' + F.esc(u.car) + '"><div class="err" id="pe-ec"></div></div>' +
      '<div class="row"><button class="btn grow" type="submit">حفظ</button><button class="btn secondary" type="button" id="pe-cancel">إلغاء</button></div></form>');
    F.$('#pe-cancel', m.el).onclick = m.close;
    F.$('#pe-form', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const name = F.$('#pe-name', m.el).value.trim().replace(/\s+/g, ' ');
      const phone = F.cleanPhone(F.$('#pe-phone', m.el).value);
      const car = F.$('#pe-car', m.el).value.trim();
      let ok = true;
      F.$('#pe-en', m.el).textContent = name.split(' ').length >= 3 ? '' : (ok = false, 'اكتب الاسم الثلاثي.');
      F.$('#pe-ep', m.el).textContent = F.validPhone(phone) ? '' : (ok = false, 'الرقم لازم 11 رقم ويبدأ بـ 07.');
      F.$('#pe-ec', m.el).textContent = car.length >= 2 ? '' : (ok = false, 'اكتب نوع السيارة.');
      if (!ok) return;
      try { await F.sb.saveProfile({ full_name: name, phone: phone, car: car }); m.close(); F.toast('تم الحفظ', 'ok'); render(); }
      catch (ex) { F.toast(F.errMsg(ex), 'err'); }
    };
  }

  async function exportMine() {
    try {
      const u = F.user();
      const [calls, reqs, cr] = await Promise.all([
        F.sb.q('calls', 'select=*&user_id=eq.' + u.id), F.sb.q('requests', 'select=*&customer_id=eq.' + u.id),
        F.sb.q('cranes', 'select=*&owner_id=eq.' + u.id)
      ]);
      F.download('sanad-jaik-my-data.json', JSON.stringify({ exportedAt: new Date().toISOString(), user: u, driverListing: cr, myCalls: calls, myRequests: reqs }, null, 2));
      F.toast('تم تنزيل بياناتك', 'ok');
    } catch (e) { F.toast(F.errMsg(e), 'err'); }
  }

  function deleteMine() {
    const m = F.modal(
      '<h2>حذف حسابك نهائياً؟</h2><p class="muted">راح نحذف حسابك وبياناتك وطلباتك وتسجيلك كسائق (إن وجد) من الخادم. ما يمكن التراجع.</p>' +
      '<div class="row mt"><button class="btn danger grow" id="pd-yes">نعم، احذف كل شي</button><button class="btn secondary grow" id="pd-no">رجوع</button></div>');
    F.$('#pd-no', m.el).onclick = m.close;
    F.$('#pd-yes', m.el).onclick = async () => {
      try {
        await F.sb.rpc('delete_my_account');
        if (F.driver) F.driver.stop();
        await F.sb.signOut().catch(() => {});
        [F.K.loc, F.K.consent].forEach(F.del);
        m.close(); location.hash = ''; location.reload();
      } catch (e) { F.toast(F.errMsg(e), 'err'); }
    };
  }

  F.profile = { show: render };
})();

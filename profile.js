/* سند جايك — الحساب: بياناتي، سجل اتصالاتي، الخصوصية، التصدير، الحذف */
(function () {
  'use strict';
  const F = window.F;

  let avaV = 0;
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
      (F.isAdmin() ? '<div class="card admin-box"><h2>' + F.icon('lock') + ' لوحة المدير</h2><div class="stack"><a class="btn block" href="#admin-drivers">' + F.icon('wheel') + ' إدارة السواق</a><a class="btn block secondary" href="#admin-app">' + F.icon('sliders') + ' إدارة التطبيق</a></div></div>' : '') +
      '<div class="card"><div class="row">' +
        '<button class="pf-ava" id="p-ava" type="button" aria-label="تغيير الصورة">' + (u.avatar ? '<img src="' + F.esc(F.sb.avatarUrl(u.avatar, avaV)) + '" alt="">' : F.esc((u.name || '؟').trim().charAt(0))) + '<span class="pf-cam">' + F.icon('camera') + '</span></button>' +
        '<div class="grow"><h2 style="margin:0">' + F.esc(u.name || 'بدون اسم') + (F.isRealAdmin() ? ' <span class="badge amber">مدير</span>' : '') + '</h2>' +
        '<div class="muted small">' + F.icon('pin') + ' ' + F.esc(u.gov || 'المحافظة غير محددة') + '</div>' +
        '<div class="muted small" style="direction:ltr;text-align:right">' + F.esc(u.phone) + '</div>' +
        '<div class="muted small" style="direction:ltr;text-align:right">' + F.esc(u.email || '') + '</div>' +
        '<div class="muted small">' + F.icon('car') + ' ' + F.esc(u.car) + '</div></div>' +
        '<button class="btn sm secondary" id="p-edit">تعديل</button></div></div>' +
      '<div class="card"><div class="stats" id="p-stats"><div class="stat"><b>—</b><span>طلباتي</span></div><div class="stat"><b>—</b><span>اتصالاتي</span></div><div class="stat"><b>' + (u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-IQ-u-nu-latn', { month: 'short', year: 'numeric' }) : '—') + '</b><span>تاريخ الانضمام</span></div></div></div>' +
      '<div class="card" id="p-driver"></div>' +
      '<div class="card"><h2>سجل اتصالاتي بالكرينات</h2><div id="p-calls" class="muted small">جاري التحميل…</div></div>' +
      '<div class="card"><h2>بياناتي وخصوصيتي</h2><div class="stack">' +
        '<button class="btn green" id="p-support">' + F.icon('share') + ' تواصل مع الدعم (واتساب)</button>' +
        '<button class="btn secondary" id="p-priv">' + F.icon('doc') + ' سياسة الخصوصية</button>' +
        '<button class="btn secondary" id="p-export">' + F.icon('download') + ' تنزيل بياناتي</button>' +
        '<button class="btn danger" id="p-delete">' + F.icon('trash') + ' حذف حسابي وكل بياناتي</button></div></div>' +
      '<div class="row wrap mt"><button class="btn ghost" id="p-settings">' + F.icon('sliders') + ' الإعدادات</button>' +
        '<button class="btn ghost" id="p-logout">تسجيل خروج</button>' +
        '' + '</div>' +
      '<p class="muted small mt center">سند جايك · النسخة التجريبية 2.0</p>';

    F.$('#p-edit', el).onclick = () => editModal(u);
    F.$('#p-priv', el).onclick = F.showPrivacy;
    F.$('#p-support', el).onclick = () => F.contact.support();
    F.$('#p-export', el).onclick = exportMine;
    F.$('#p-delete', el).onclick = deleteMine;
    F.$('#p-logout', el).onclick = async () => { if (F.driver) F.driver.stop(); await F.sb.signOut(); location.hash = ''; location.reload(); };
    F.$('#p-ava', el).onclick = pickAvatar;
    F.$('#p-settings', el).onclick = () => { location.hash = '#settings'; };

    try {
      const [nr, nc, cr] = await Promise.all([F.sb.count('requests', 'customer_id=eq.' + u.id), F.sb.count('calls', 'user_id=eq.' + u.id), F.sb.q('cranes', 'select=name,type,governorate,listed,tier,sub_expires_at&owner_id=eq.' + u.id + '&limit=1')]);
      const bs = F.$$('#p-stats b', el); if (bs[0]) { bs[0].textContent = nr; bs[1].textContent = nc; }
      const c = cr && cr[0], dv = F.$('#p-driver', el);
      if (c) { const av = F.$('#p-ava', el); if (av) av.className = 'pf-ava' + (c.verified ? ' ver' : ''); }
      if (dv) {
        dv.innerHTML = c
          ? '<h2>' + F.icon('crane') + ' أنت سائق</h2><div class="row between"><div>' + F.esc(c.name) + '<div class="muted small">' + F.esc(c.type) + ' · ' + F.esc(c.governorate || '') + ' · ' + (c.listed ? 'ظاهر للزبائن' : 'قيد المراجعة') + '</div></div><a class="btn sm" href="#driver">لوحة السائق</a></div>'
          : '<h2>' + F.icon('crane') + ' عندك كرين أو سيارة سحب؟</h2><p class="muted small">سجّلها واختر محافظتك حتى يوصلك الزبائن القريبين.</p><a class="btn block" href="#driver">سجّل كسائق</a>';
      }
    } catch (e) {}
    try {
      const rows = await F.sb.q('calls', 'select=created_at,cranes(name)&user_id=eq.' + u.id + '&order=created_at.desc&limit=10');
      F.$('#p-calls', el).innerHTML = rows && rows.length
        ? '<ul class="list">' + rows.map((e) => '<li><span>' + F.esc(e.cranes ? e.cranes.name : '—') + '</span><span class="muted">' + F.fmtDate(Date.parse(e.created_at)) + '</span></li>').join('') + '</ul>'
        : 'ما اتصلت بأي كرين بعد.';
    } catch (e) { const n = F.$('#p-calls', el); if (n) n.textContent = 'تعذّر التحميل.'; }
  }

  // قصّ الصورة مربعة وتصغيرها قبل الرفع
  function squareShrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const side = Math.min(img.width, img.height), S = 480;
        const c = document.createElement('canvas'); c.width = S; c.height = S;
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('الصورة غير صالحة.'))), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('الصورة غير صالحة.')); };
      img.src = url;
    });
  }
  function pickAvatar() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        F.toast('جاري رفع الصورة…');
        const u = F.user(), blob = await squareShrink(f), path = u.id + '/avatar.jpg';
        await F.sb.upload('avatars', path, blob, true);
        await F.sb.saveProfile({ avatar_path: path });
        avaV = Date.now();
        F.toast('تم تغيير الصورة', 'ok'); render();
      } catch (e) { F.toast(F.errMsg(e), 'err'); }
    };
    inp.click();
  }

  function editModal(u) {
    const carPk = F.picker({ id: 'pe-car', data: F.CARS, makeLabel: 'شركة سيارتك', modelLabel: 'نوع السيارة', year: true, value: F.parseCar(u.car) });
    const m = F.modal(
      '<h2>تعديل بياناتي</h2><form id="pe-form" novalidate>' +
      '<div class="field"><label>الاسم الثلاثي</label><input id="pe-name" value="' + F.esc(u.name) + '"><div class="err" id="pe-en"></div></div>' +
      '<div class="field"><label>رقم الهاتف</label><input id="pe-phone" class="ltr" inputmode="tel" maxlength="16" value="' + F.esc(u.phone) + '"><div class="err" id="pe-ep"></div></div>' +
      '<div class="field"><label>المحافظة</label><select id="pe-gov"><option value="">اختر المحافظة</option>' + F.GOVS.map((g) => '<option' + (g.name === u.gov ? ' selected' : '') + '>' + g.name + '</option>').join('') + '</select><div class="err" id="pe-eg"></div></div>' +
      carPk.html +
      '<div class="row"><button class="btn grow" type="submit">حفظ</button><button class="btn secondary" type="button" id="pe-cancel">إلغاء</button></div></form>');
    carPk.wire(m.el);
    F.$('#pe-cancel', m.el).onclick = m.close;
    F.$('#pe-form', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const name = F.$('#pe-name', m.el).value.trim().replace(/\s+/g, ' ');
      const phone = F.cleanPhone(F.$('#pe-phone', m.el).value);
      const cv = carPk.get(m.el), car = cv.text;
      const gov = F.$('#pe-gov', m.el).value;
      let ok = true;
      F.$('#pe-eg', m.el).textContent = gov ? '' : (ok = false, 'اختر المحافظة.');
      F.$('#pe-en', m.el).textContent = name.split(' ').length >= 3 ? '' : (ok = false, 'اكتب الاسم الثلاثي.');
      F.$('#pe-ep', m.el).textContent = F.validPhone(phone) ? '' : (ok = false, 'الرقم لازم 11 رقم ويبدأ بـ 07.');
      if (!cv.ok) ok = false;
      if (!ok) return;
      try { await F.sb.saveProfile({ full_name: name, phone: phone, car: car, governorate: gov }); m.close(); F.toast('تم الحفظ', 'ok'); render(); }
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

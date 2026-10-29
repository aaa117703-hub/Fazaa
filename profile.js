/* فزعة — الحساب: بياناتي، سجل اتصالاتي، الخصوصية، التصدير، الحذف */
(function () {
  'use strict';
  const F = window.F;

  function render() {
    const el = F.$('#v-profile');
    const u = F.user();
    if (!u) return;
    const mine = F.events().filter((e) => e.type === 'call' && e.by && e.by.phone === u.phone);

    el.innerHTML =
      '<h1>' + F.icon('user') + ' حسابي</h1>' +
      '<div class="card">' +
        '<div class="row"><div class="grow"><h2 style="margin:0">' + F.esc(u.name) + '</h2>' +
          '<div class="muted small" style="direction:ltr;text-align:right">' + F.esc(u.phone) + '</div>' +
          '<div class="muted small">' + F.icon('car') + ' ' + F.esc(u.car) + '</div></div>' +
          '<button class="btn sm secondary" id="p-edit">تعديل</button></div>' +
      '</div>' +

      '<div class="card"><h2>سجل اتصالاتي بالكرينات</h2>' +
        (mine.length
          ? '<ul class="list">' + mine.slice(-10).reverse().map((e) =>
              '<li><span>' + F.esc(e.craneName) + '</span><span class="muted">' + F.fmtDate(e.at) + '</span></li>').join('') + '</ul>'
          : '<div class="muted small">ما اتصلت بأي كرين بعد.</div>') +
      '</div>' +

      '<div class="card"><h2>بياناتي وخصوصيتي</h2>' +
        '<div class="stack">' +
          '<button class="btn secondary" id="p-priv">' + F.icon('doc') + ' سياسة الخصوصية</button>' +
          '<button class="btn secondary" id="p-export">' + F.icon('download') + ' تنزيل بياناتي</button>' +
          '<button class="btn danger" id="p-delete">' + F.icon('trash') + ' حذف حسابي وكل بياناتي</button>' +
        '</div>' +
      '</div>' +

      '<div class="row wrap mt">' +
        '<button class="btn ghost" id="p-logout">تسجيل خروج</button>' +
        '<button class="btn ghost" id="p-admin">' + F.icon('lock') + ' لوحة الإدارة</button>' +
      '</div>' +
      '<p class="muted small mt center">فزعة · النسخة التجريبية 1.0</p>';

    F.$('#p-edit', el).onclick = () => editModal(u);
    F.$('#p-priv', el).onclick = F.showPrivacy;
    F.$('#p-export', el).onclick = exportMine;
    F.$('#p-delete', el).onclick = deleteMine;
    F.$('#p-logout', el).onclick = () => {
      if (F.driver) F.driver.stop();
      F.set(F.K.session, false);
      location.hash = '';
      location.reload();
    };
    F.$('#p-admin', el).onclick = () => { location.hash = '#admin'; };
  }

  function editModal(u) {
    const m = F.modal(
      '<h2>تعديل بياناتي</h2><form id="pe-form" novalidate>' +
      '<div class="field"><label>الاسم الثلاثي</label><input id="pe-name" value="' + F.esc(u.name) + '"><div class="err" id="pe-en"></div></div>' +
      '<div class="field"><label>نوع السيارة</label><input id="pe-car" value="' + F.esc(u.car) + '"><div class="err" id="pe-ec"></div></div>' +
      '<p class="muted small">رقم الهاتف ما يتغيّر من هنا. إذا تريد رقم جديد، احذف حسابك وسجّل من جديد.</p>' +
      '<div class="row"><button class="btn grow" type="submit">حفظ</button><button class="btn secondary" type="button" id="pe-cancel">إلغاء</button></div></form>'
    );
    F.$('#pe-cancel', m.el).onclick = m.close;
    F.$('#pe-form', m.el).onsubmit = (e) => {
      e.preventDefault();
      const name = F.$('#pe-name', m.el).value.trim().replace(/\s+/g, ' ');
      const car = F.$('#pe-car', m.el).value.trim();
      let ok = true;
      F.$('#pe-en', m.el).textContent = name.split(' ').length >= 3 ? '' : (ok = false, 'اكتب الاسم الثلاثي.');
      F.$('#pe-ec', m.el).textContent = car.length >= 2 ? '' : (ok = false, 'اكتب نوع السيارة.');
      if (!ok) return;
      F.setUser(Object.assign({}, u, { name: name, car: car }));
      m.close();
      F.toast('تم الحفظ', 'ok');
      render();
    };
  }

  function exportMine() {
    const u = F.user();
    const c = F.myCrane();
    const data = {
      exportedAt: new Date().toISOString(),
      user: u,
      driverListing: c,
      myCalls: F.events().filter((e) => (e.by && e.by.phone === u.phone) || (c && e.craneId === c.id))
    };
    F.download('fazaa-my-data.json', JSON.stringify(data, null, 2));
    F.toast('تم تنزيل بياناتك', 'ok');
  }

  function deleteMine() {
    const m = F.modal(
      '<h2>حذف حسابك نهائياً؟</h2>' +
      '<p class="muted">راح نحذف بياناتك وسجل اتصالاتك وتسجيلك كسائق (إن وجد) من هذا الجهاز. ما يمكن التراجع.</p>' +
      '<div class="row mt"><button class="btn danger grow" id="pd-yes">نعم، احذف كل شي</button><button class="btn secondary grow" id="pd-no">رجوع</button></div>'
    );
    F.$('#pd-no', m.el).onclick = m.close;
    F.$('#pd-yes', m.el).onclick = () => {
      const u = F.user();
      const c = F.myCrane();
      if (F.driver) F.driver.stop();
      if (c) F.saveCranes(F.cranes().filter((x) => x.id !== c.id));
      F.set(F.K.events, F.events().filter((e) => !((e.by && e.by.phone === u.phone) || (c && e.craneId === c.id))));
      [F.K.user, F.K.session, F.K.consent, F.K.loc].forEach(F.del);
      m.close();
      location.hash = '';
      location.reload();
    };
  }

  F.profile = { show: render };
})();

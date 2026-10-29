/* فزعة — لوحة الإدارة
 * تنبيه: الـ PIN هنا مجرد قفل خفيف على نفس الجهاز، وليس أماناً حقيقياً،
 * لأن كل البيانات بالمتصفح. الأمان الحقيقي يجي مع Supabase (المرحلة 3).
 */
(function () {
  'use strict';
  const F = window.F;
  const SS = 'fazaa_admin_ok';
  let tab = 'overview';

  async function hash(s) {
    try {
      if (window.crypto && crypto.subtle) {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fazaa:' + s));
        return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    return 'p:' + btoa(unescape(encodeURIComponent('fazaa:' + s)));
  }
  const authed = () => { try { return sessionStorage.getItem(SS) === '1'; } catch (e) { return false; } };
  const setAuthed = () => { try { sessionStorage.setItem(SS, '1'); } catch (e) {} };

  function gate() {
    return new Promise((resolve) => {
      const saved = F.get(F.K.pin, null);
      let settled = false;
      const m = F.modal(
        '<h2>' + (saved ? 'لوحة الإدارة' : 'أنشئ رمز الإدارة (PIN)') + '</h2>' +
        '<p class="muted small">' + (saved ? 'اكتب الرمز للدخول.' : 'اختر رمز من 4 أرقام أو أكثر. تحتاجه كل مرة تدخل اللوحة.') + '</p>' +
        '<div class="field"><input id="g-pin" type="password" inputmode="numeric" autocomplete="off" class="ltr" maxlength="12" placeholder="••••"><div class="err" id="g-err"></div></div>' +
        '<div class="row"><button class="btn grow" id="g-ok">' + (saved ? 'دخول' : 'حفظ ودخول') + '</button><button class="btn secondary" id="g-no">إلغاء</button></div>',
        { onClose: () => { if (!settled) { settled = true; resolve(false); } } }
      );
      const input = F.$('#g-pin', m.el);
      setTimeout(() => input.focus(), 50);
      const submit = async () => {
        const pin = F.digits(input.value).trim();
        if (!/^\d{4,12}$/.test(pin)) { F.$('#g-err', m.el).textContent = 'الرمز أرقام فقط، من 4 إلى 12.'; return; }
        const h = await hash(pin);
        if (!saved) F.set(F.K.pin, h);
        else if (saved !== h) { F.$('#g-err', m.el).textContent = 'الرمز غلط.'; return; }
        setAuthed();
        settled = true;
        m.close();
        resolve(true);
      };
      F.$('#g-ok', m.el).onclick = submit;
      input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
      F.$('#g-no', m.el).onclick = m.close;
    });
  }

  /* ---------- التبويبات ---------- */
  const TABS = [['overview', 'نظرة عامة'], ['cranes', 'الكرينات'], ['activity', 'النشاط'], ['data', 'البيانات']];

  function overview() {
    const cr = F.cranes(), ev = F.events().filter((e) => e.type === 'call');
    const real = cr.filter((c) => !c.demo);
    return (
      '<div class="stats">' +
        stat(cr.length, 'كل الكرينات') + stat(cr.filter((c) => c.status === 'available').length, 'متاح الحين') +
        stat(real.length, 'حقيقي (غير تجريبي)') +
      '</div><div class="stats mt">' +
        stat(ev.length, 'كل الاتصالات') + stat(ev.filter((e) => F.isToday(e.at)).length, 'اتصالات اليوم') +
        stat(ev.filter((e) => !e.demo).length, 'اتصالات بكرينات حقيقية') +
      '</div>' +
      '<div class="card mt"><h2>معيار الانتقال للمرحلة 2</h2>' +
        '<p class="muted small">حسب الوثيقة: 20+ اتصال حقيقي خلال أسبوعين. هذي الأرقام من هذا الجهاز فقط، فسجّل الاتصالات الميدانية أيضاً بدفتر الملاحظات.</p></div>'
    );
  }
  const stat = (n, l) => '<div class="stat"><b>' + n + '</b><span>' + l + '</span></div>';

  function cranes() {
    const rows = F.cranes().map((c) =>
      '<tr>' +
        '<td>' + F.esc(c.name) + (c.demo ? ' <span class="badge">تجريبي</span>' : '') + '</td>' +
        '<td>' + F.esc(c.type) + '</td>' +
        '<td><span class="dot ' + (c.status === 'available' ? 'green' : 'red') + '"></span>' + (c.status === 'available' ? 'متاح' : 'مشغول') + '</td>' +
        '<td style="direction:ltr">' + F.esc(c.phone || '—') + '</td>' +
        '<td>' + F.esc((F.PACKAGES.find((p) => p.id === c.package) || {}).name || '—') + '</td>' +
        '<td>' + F.ago(c.updatedAt) + '</td>' +
        '<td><div class="row">' +
          '<button class="btn sm secondary" data-a="toggle" data-id="' + F.esc(c.id) + '">' + (c.status === 'available' ? 'مشغول' : 'متاح') + '</button>' +
          '<button class="btn sm ' + (c.verified ? 'green' : 'secondary') + '" data-a="verify" data-id="' + F.esc(c.id) + '">' + (c.verified ? F.icon('check') + ' موثق' : 'وثّق') + '</button>' +
          '<button class="btn sm danger" data-a="del" data-id="' + F.esc(c.id) + '">حذف</button>' +
        '</div></td></tr>').join('');
    return (
      '<div class="card"><div class="row between"><h2 style="margin:0">الكرينات (' + F.cranes().length + ')</h2>' +
        '<button class="btn sm" data-a="add">+ إضافة كرين</button></div>' +
        '<p class="muted small mt-s">«وثّق» تفعّلها فقط بعد ما تشوف السائق وهويته وكرينه بنفسك.</p>' +
        '<div class="table-wrap mt-s"><table><thead><tr><th>الاسم</th><th>النوع</th><th>الحالة</th><th>الهاتف</th><th>الباقة</th><th>التحديث</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="muted">لا يوجد كرينات.</td></tr>') + '</tbody></table></div></div>'
    );
  }

  function activity() {
    const ev = F.events().slice(-50).reverse();
    return '<div class="card"><h2>آخر 50 حدث</h2><div class="table-wrap"><table><thead><tr><th>الوقت</th><th>النوع</th><th>الكرين</th><th>الزبون</th></tr></thead><tbody>' +
      (ev.map((e) => '<tr><td>' + F.fmtDate(e.at) + '</td><td>' + (e.type === 'call' ? 'اتصال' : F.esc(e.type)) + '</td><td>' +
        F.esc(e.craneName || '—') + (e.demo ? ' <span class="badge">تجريبي</span>' : '') + '</td><td>' +
        F.esc((e.by && e.by.name) || '—') + '</td></tr>').join('') || '<tr><td colspan="4" class="muted">ما كو نشاط بعد.</td></tr>') +
      '</tbody></table></div></div>';
  }

  function data() {
    return (
      '<div class="card"><h2>البيانات</h2><div class="stack">' +
        '<button class="btn secondary" data-a="export">' + F.icon('download') + ' تصدير كل البيانات (JSON)</button>' +
        '<button class="btn secondary" data-a="export-csv">' + F.icon('download') + ' تصدير سجل الاتصالات (CSV)</button>' +
        '<button class="btn secondary" data-a="rm-demo">حذف الكرينات التجريبية</button>' +
        '<button class="btn secondary" data-a="pin">تغيير رمز الإدارة</button>' +
        '<button class="btn danger" data-a="reset">تصفير كل شي على هذا الجهاز</button>' +
      '</div>' +
      '<p class="muted small mt-s">التصدير الدوري مهم لأن البيانات على الجهاز فقط (خطر فقدان البيانات بالوثيقة).</p></div>'
    );
  }

  function render() {
    const el = F.$('#v-admin');
    const body = { overview: overview, cranes: cranes, activity: activity, data: data }[tab]();
    el.innerHTML =
      '<h1>' + F.icon('lock') + ' لوحة الإدارة</h1>' +
      '<div class="warn">القفل هنا خفيف ومحلي: أي شخص يستخدم نفس الجهاز ويعرف المتصفح يكدر يوصل للبيانات. الأمان الحقيقي مع Supabase لاحقاً.</div>' +
      '<div class="tabs">' + TABS.map((t) => '<button class="chip ' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      body;
  }

  function addModal() {
    let loc = { lat: F.CENTER.lat, lng: F.CENTER.lng };
    const m = F.modal(
      '<h2>إضافة كرين</h2><form id="ad-form" novalidate>' +
      '<div class="field"><label>الاسم</label><input id="ad-name" maxlength="40"></div>' +
      '<div class="field"><label>النوع</label><select id="ad-type">' + F.TYPES.map((t) => '<option>' + t + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>رقم الهاتف</label><input id="ad-phone" class="ltr" inputmode="tel" maxlength="16"><div class="err" id="ad-err"></div></div>' +
      '<div class="field"><label>الموقع</label><button type="button" class="btn secondary" id="ad-loc">' + F.icon('pin') + ' حدد على الخريطة (الحالي: مركز الناصرية)</button></div>' +
      '<div class="row"><button class="btn grow" type="submit">إضافة</button><button class="btn secondary" type="button" id="ad-cancel">إلغاء</button></div></form>'
    );
    F.$('#ad-cancel', m.el).onclick = m.close;
    F.$('#ad-loc', m.el).onclick = async () => {
      const p = await F.pickLocation(loc);
      if (p) { loc = p; F.$('#ad-loc', m.el).innerHTML = F.icon('check-circle') + ' تم تحديد الموقع'; }
    };
    F.$('#ad-form', m.el).onsubmit = (e) => {
      e.preventDefault();
      const name = F.$('#ad-name', m.el).value.trim();
      const phone = F.cleanPhone(F.$('#ad-phone', m.el).value);
      if (name.length < 3) { F.$('#ad-err', m.el).textContent = 'اكتب اسم الكرين.'; return; }
      if (!F.validPhone(phone)) { F.$('#ad-err', m.el).textContent = 'الرقم لازم 11 رقم ويبدأ بـ 07.'; return; }
      const arr = F.cranes();
      arr.push({
        id: F.uid(), name: name, type: F.$('#ad-type', m.el).value, phone: phone, ownerPhone: '',
        lat: loc.lat, lng: loc.lng, status: 'busy', package: 'free', verified: false, rating: null,
        demo: false, createdAt: Date.now(), updatedAt: Date.now()
      });
      F.saveCranes(arr);
      m.close();
      F.toast('تمت الإضافة', 'ok');
      render();
    };
  }

  function confirmBox(title, text, yesLabel, onYes) {
    const m = F.modal('<h2>' + title + '</h2><p class="muted">' + text + '</p>' +
      '<div class="row mt"><button class="btn danger grow" id="cf-yes">' + yesLabel + '</button><button class="btn secondary grow" id="cf-no">رجوع</button></div>');
    F.$('#cf-no', m.el).onclick = m.close;
    F.$('#cf-yes', m.el).onclick = () => { m.close(); onYes(); };
  }

  function changePin() {
    const m = F.modal('<h2>تغيير الرمز</h2><div class="field"><input id="np" type="password" inputmode="numeric" class="ltr" maxlength="12" placeholder="الرمز الجديد"><div class="err" id="np-e"></div></div>' +
      '<div class="row"><button class="btn grow" id="np-ok">حفظ</button><button class="btn secondary" id="np-no">إلغاء</button></div>');
    F.$('#np-no', m.el).onclick = m.close;
    F.$('#np-ok', m.el).onclick = async () => {
      const pin = F.digits(F.$('#np', m.el).value).trim();
      if (!/^\d{4,12}$/.test(pin)) { F.$('#np-e', m.el).textContent = 'أرقام فقط، من 4 إلى 12.'; return; }
      F.set(F.K.pin, await hash(pin));
      m.close();
      F.toast('تم تغيير الرمز', 'ok');
    };
  }

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // منع حقن الصيغ بالإكسل
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function onClick(e) {
    const t = e.target.closest('[data-tab],[data-a]');
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
    const a = t.dataset.a, id = t.dataset.id;
    if (a === 'add') return addModal();
    if (a === 'toggle') {
      const c = F.cranes().find((x) => x.id === id);
      if (c) F.updateCrane(id, { status: c.status === 'available' ? 'busy' : 'available', updatedAt: Date.now() });
      return render();
    }
    if (a === 'verify') {
      const c = F.cranes().find((x) => x.id === id);
      if (c) F.updateCrane(id, { verified: !c.verified });
      return render();
    }
    if (a === 'del') {
      const c = F.cranes().find((x) => x.id === id);
      return confirmBox('حذف الكرين؟', F.esc(c ? c.name : ''), 'احذف', () => {
        F.saveCranes(F.cranes().filter((x) => x.id !== id));
        render();
      });
    }
    if (a === 'export') {
      return F.download('fazaa-backup-' + new Date().toISOString().slice(0, 10) + '.json',
        JSON.stringify({ cranes: F.cranes(), events: F.events(), exportedAt: new Date().toISOString() }, null, 2));
    }
    if (a === 'export-csv') {
      const rows = [['الوقت', 'النوع', 'الكرين', 'اسم الزبون', 'هاتف الزبون', 'تجريبي']].concat(
        F.events().map((x) => [new Date(x.at).toISOString(), x.type, x.craneName, x.by && x.by.name, x.by && x.by.phone, x.demo ? 'نعم' : 'لا']));
      return F.download('fazaa-events.csv', '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
    }
    if (a === 'rm-demo') return confirmBox('حذف التجريبي؟', 'راح تنحذف الكرينات التجريبية وسجل اتصالاتها.', 'احذف', () => { F.removeDemo(); F.toast('تم', 'ok'); render(); });
    if (a === 'pin') return changePin();
    if (a === 'reset') {
      return confirmBox('تصفير كل شي؟', 'راح تنحذف كل البيانات على هذا الجهاز: الكرينات، السجل، حسابك. لا يمكن التراجع. نزّل نسخة احتياطية أول.', 'صفّر', () => {
        Object.values(F.K).forEach(F.del);
        try { sessionStorage.removeItem(SS); } catch (err) {}
        location.hash = '';
        location.reload();
      });
    }
  }

  F.admin = {
    init: function () { F.$('#v-admin').addEventListener('click', onClick); },
    // يرجّع true إذا مسموح يعرض الصفحة
    async show() {
      if (!authed()) {
        const ok = await gate();
        if (!ok) return false;
      }
      render();
      return true;
    }
  };
})();

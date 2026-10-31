/* سند جايك — الدخول: إيميل + كلمة مرور، أو تصفّح كزائر */
(function () {
  'use strict';
  const F = window.F;

  F.privacyText = function () {
    return (
      '<p><b>شنو نجمع؟</b> اسمك، رقم هاتفك، إيميلك، نوع سيارتك، وموقعك (بس لما ترسل طلب أو تكون سائق «متاح»).</p>' +
      '<p><b>ليش؟</b> حتى نعرض لك أقرب كرين ونوصّل طلبك للسائقين القريبين.</p>' +
      '<p><b>وين تنحفظ؟</b> على خادم آمن (Supabase) ومحمي بقواعد وصول: كل مستخدم يشوف بياناته فقط.</p>' +
      '<p><b>من يشوف رقمك؟</b> السائق اللي يقبل طلبك فقط. وأرقام الكرينات تظهر للمسجّلين فقط.</p>' +
      '<p><b>حقك:</b> تكدر تنزّل بياناتك أو تحذف حسابك وكل بياناتك بأي وقت من «حسابي».</p>' +
      '<p><b>ما نبيع بياناتك</b> لأي جهة.</p>'
    );
  };

  F.showPrivacy = function () {
    const m = F.modal('<h2>سياسة الخصوصية</h2>' + F.privacyText() +
      '<button class="btn block mt" id="pv-ok">تمام</button>');
    F.$('#pv-ok', m.el).onclick = m.close;
  };

  let mode = 'in';

  F.auth = {
    // يعرض شاشة الدخول (ويخفي التطبيق)
    open: function () { F.$('#app').hidden = true; F.auth.render(); },

    render: function () {
      const root = F.$('#auth');
      root.hidden = false;
      const up = mode === 'up';
      root.innerHTML =
        '<div class="auth-box">' +
          '<div class="auth-hero">' +
            '<img src="logo.svg" width="84" height="84" alt="">' +
            '<h1>سند جايك</h1>' +
            '<p>سندك بضغطة — أقرب كرين لسيارتك</p>' +
          '</div>' +
          '<form class="card" id="auth-form" novalidate>' +
            '<div class="seg" role="tablist" style="margin-bottom:14px">' +
              '<button type="button" class="' + (!up ? 'on' : '') + '" data-m="in">دخول</button>' +
              '<button type="button" class="' + (up ? 'on' : '') + '" data-m="up">حساب جديد</button>' +
            '</div>' +
            (up ?
              '<div class="field"><label for="a-name">الاسم الثلاثي</label>' +
                '<input id="a-name" autocomplete="name" placeholder="مثال: علي حسين كاظم"><div class="err" id="e-name"></div></div>' +
              '<div class="field"><label for="a-phone">رقم الهاتف</label>' +
                '<input id="a-phone" class="ltr" inputmode="tel" autocomplete="tel" placeholder="07701234567" maxlength="16">' +
                '<div class="err" id="e-phone"></div></div>' +
              '<div class="field"><label for="a-car">نوع السيارة</label>' +
                '<input id="a-car" placeholder="مثال: كيا سيراتو 2018"><div class="err" id="e-car"></div></div>' : '') +
            '<div class="field"><label for="a-email">الإيميل</label>' +
              '<input id="a-email" class="ltr" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com"><div class="err" id="e-email"></div></div>' +
            '<div class="field"><label for="a-pass">كلمة المرور</label>' +
              '<input id="a-pass" class="ltr" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="8 خانات أو أكثر"><div class="err" id="e-pass"></div></div>' +
            (up ?
              '<label class="check"><input type="checkbox" id="a-consent">' +
                '<span>أوافق على استخدام موقعي ورقمي لعرض أقرب كرين، وقرأت <a href="#" id="a-priv">سياسة الخصوصية</a>.</span></label>' +
              '<div class="err" id="e-consent" style="margin:-8px 0 10px"></div>' : '') +
            '<div class="err" id="e-form" style="margin-bottom:8px"></div>' +
            '<button class="btn big block" type="submit" id="a-go">' + (up ? 'إنشاء الحساب' : 'دخول') + '</button>' +
          '</form>' +
          '<button class="btn secondary block mt" id="a-guest" type="button">تصفّح كزائر</button>' +
          '<p class="muted small center mt">الزائر يشوف الكرينات، لكن الاتصال وإرسال الطلب يحتاجون حساب.</p>' +
        '</div>';

      F.$$('[data-m]', root).forEach((b) => { b.onclick = () => { mode = b.dataset.m; F.auth.render(); }; });
      const pv = F.$('#a-priv'); if (pv) pv.onclick = (e) => { e.preventDefault(); F.showPrivacy(); };
      F.$('#auth-form').onsubmit = (e) => { e.preventDefault(); F.auth.submit(); };
      F.$('#a-guest').onclick = () => { F.enterAsGuest(); F.$('#auth').hidden = true; F.showApp(); };
    },

    submit: async function () {
      const up = mode === 'up';
      let ok = true;
      const err = (id, msg) => { const n = F.$('#' + id); if (n) n.textContent = msg; if (msg) ok = false; };
      const email = F.$('#a-email').value.trim().toLowerCase();
      const pass = F.$('#a-pass').value;
      F.$('#e-form').textContent = '';

      err('e-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'اكتب إيميل صحيح.');
      err('e-pass', pass.length >= (up ? 8 : 1) ? '' : 'كلمة المرور 8 خانات أو أكثر.');
      let name, phone, car;
      if (up) {
        name = F.$('#a-name').value.trim().replace(/\s+/g, ' ');
        phone = F.cleanPhone(F.$('#a-phone').value);
        car = F.$('#a-car').value.trim();
        err('e-name', name.split(' ').length >= 3 ? '' : 'اكتب الاسم الثلاثي (ثلاث كلمات).');
        err('e-phone', F.validPhone(phone) ? '' : 'الرقم لازم 11 رقم ويبدأ بـ 07.');
        err('e-car', car.length >= 2 ? '' : 'اكتب نوع السيارة.');
        err('e-consent', F.$('#a-consent').checked ? '' : 'لازم توافق حتى نكمّل.');
      }
      if (!ok) return;

      const btn = F.$('#a-go');
      btn.disabled = true;
      try {
        if (up) {
          const r = await F.sb.signUp({ email: email, password: pass, name: name, phone: phone, car: car });
          if (r.needsConfirm) {
            F.$('#e-form').innerHTML = '<span style="color:var(--green,#10B981)">أرسلنا رابط تأكيد لبريدك. افتحه ثم ارجع وسجّل دخول.</span>';
            mode = 'in';
            btn.disabled = false;
            return;
          }
        } else {
          await F.sb.signIn(email, pass);
        }
        F.$('#auth').hidden = true;
        F.showApp();
        const u = F.user();
        F.toast('هلا ' + (u && u.name ? F.firstName(u.name) : '') + '، أهلاً بيك بسند جايك' + (F.isRealAdmin() ? ' (مدير)' : ''), 'ok');
      } catch (e) {
        F.$('#e-form').textContent = F.errMsg(e);
        btn.disabled = false;
      }
    }
  };
})();

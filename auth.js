/* سند جايك — تسجيل الدخول: الاسم الثلاثي + رقم الهاتف + نوع السيارة */
(function () {
  'use strict';
  const F = window.F;

  F.privacyText = function () {
    return (
      '<p><b>شنو نجمع؟</b> اسمك، رقم هاتفك، نوع سيارتك، وموقعك (بس لما تطلبه أنت أو تكون سائق «متاح»).</p>' +
      '<p><b>ليش؟</b> حتى نعرض لك أقرب كرين، ونسجّل اتصالاتك بالكرينات.</p>' +
      '<p><b>وين تنحفظ؟</b> حالياً على جهازك فقط، ما تنرسل لأي سيرفر.</p>' +
      '<p><b>حقك:</b> تكدر تنزّل بياناتك أو تحذف حسابك وكل بياناتك بأي وقت من «حسابي».</p>' +
      '<p><b>ما نبيع بياناتك</b> لأي جهة.</p>'
    );
  };

  F.showPrivacy = function () {
    const m = F.modal('<h2>سياسة الخصوصية</h2>' + F.privacyText() +
      '<button class="btn block mt" id="pv-ok">تمام</button>');
    F.$('#pv-ok', m.el).onclick = m.close;
  };

  F.auth = {
    render: function () {
      const root = F.$('#auth');
      const saved = F.user() || {};
      root.hidden = false;
      root.innerHTML =
        '<div class="auth-box">' +
          '<div class="auth-hero">' +
            '<img src="logo.svg" width="84" height="84" alt="">' +
            '<h1>سند جايك</h1>' +
            '<p>سندك بضغطة — أقرب كرين لسيارتك</p>' +
          '</div>' +
          '<form class="card" id="auth-form" novalidate>' +
            '<div class="field"><label for="a-name">الاسم الثلاثي</label>' +
              '<input id="a-name" autocomplete="name" placeholder="مثال: علي حسين كاظم" value="' + F.esc(saved.name || '') + '">' +
              '<div class="err" id="e-name"></div></div>' +
            '<div class="field"><label for="a-phone">رقم الهاتف</label>' +
              '<input id="a-phone" class="ltr" inputmode="tel" autocomplete="tel" placeholder="07701234567" maxlength="16" value="' + F.esc(saved.phone || '') + '">' +
              '<div class="hint">11 رقم، يبدأ بـ 07</div>' +
              '<div class="err" id="e-phone"></div></div>' +
            '<div class="field"><label for="a-car">نوع السيارة</label>' +
              '<input id="a-car" placeholder="مثال: كيا سيراتو 2018" value="' + F.esc(saved.car || '') + '">' +
              '<div class="err" id="e-car"></div></div>' +
            '<label class="check"><input type="checkbox" id="a-consent">' +
              '<span>أوافق على استخدام موقعي ورقمي لعرض أقرب كرين، وقرأت <a href="#" id="a-priv">سياسة الخصوصية</a>.</span></label>' +
            '<div class="err" id="e-consent" style="margin:-8px 0 10px"></div>' +
            '<button class="btn big block" type="submit">دخول</button>' +
          '</form>' +
          '<p class="muted small center mt">بياناتك تنحفظ على جهازك فقط حالياً.</p>' +
        '</div>';

      F.$('#a-priv').onclick = (e) => { e.preventDefault(); F.showPrivacy(); };
      if (F.get(F.K.consent, false)) F.$('#a-consent').checked = true;
      F.$('#auth-form').onsubmit = (e) => { e.preventDefault(); F.auth.submit(); };
    },

    submit: function () {
      const name = F.$('#a-name').value.trim().replace(/\s+/g, ' ');
      const phone = F.cleanPhone(F.$('#a-phone').value);
      const car = F.$('#a-car').value.trim();
      const consent = F.$('#a-consent').checked;
      let ok = true;
      const err = (id, msg) => { F.$('#' + id).textContent = msg; if (msg) ok = false; };

      err('e-name', name.split(' ').length >= 3 ? '' : 'اكتب الاسم الثلاثي (ثلاث كلمات).');
      err('e-phone', F.validPhone(phone) ? '' : 'الرقم لازم 11 رقم ويبدأ بـ 07.');
      err('e-car', car.length >= 2 ? '' : 'اكتب نوع السيارة.');
      err('e-consent', consent ? '' : 'لازم توافق حتى نكمّل.');
      if (!ok) return;

      const old = F.user();
      const user = {
        name: name, phone: phone, car: car,
        createdAt: old && old.phone === phone ? old.createdAt : Date.now()
      };
      F.setUser(user);
      F.set(F.K.consent, true);
      F.set(F.K.session, true);
      F.$('#auth').hidden = true;
      F.showApp();
      F.toast('هلا ' + F.firstName(name) + '، أهلاً بيك بسند جايك', 'ok');
    }
  };
})();

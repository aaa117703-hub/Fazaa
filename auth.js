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

  // الخطوات: phone → code → profile. والمدير يدخل بالإيميل من رابط صغير.
  let step = 'phone', mode = 'phone', phone = '', channel = 'whatsapp', cooldown = 0, timer = null, busy = false;

  function hero() {
    return '<div class="auth-hero"><img src="logo.svg" width="84" height="84" alt=""><h1>سند جايك</h1>' +
      '<p>سندك بضغطة — أقرب كرين لسيارتك</p></div>';
  }
  const chName = (c) => (c === 'whatsapp' ? 'واتساب' : 'رسالة SMS');

  function tick() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      cooldown = Math.max(0, cooldown - 1);
      const b = F.$('#a-resend');
      if (b) { b.disabled = cooldown > 0; b.textContent = cooldown > 0 ? 'إعادة الإرسال بعد ' + cooldown + ' ث' : 'إعادة إرسال الرمز'; }
      if (!cooldown) { clearInterval(timer); timer = null; }
    }, 1000);
  }

  function formHtml() {
    if (mode === 'email') {
      return '<h2 style="margin-top:0">دخول المدير</h2>' +
        '<div class="field"><label for="a-email">الإيميل</label><input id="a-email" class="ltr" type="email" inputmode="email" autocomplete="email"><div class="err" id="e-email"></div></div>' +
        '<div class="field"><label for="a-pass">كلمة المرور</label><input id="a-pass" class="ltr" type="password" autocomplete="current-password"><div class="err" id="e-pass"></div></div>' +
        '<div class="err" id="e-form" style="margin-bottom:8px"></div><button class="btn big block" type="submit" id="a-go">دخول</button>' +
        '<button class="btn ghost block mt-s" type="button" id="a-back">رجوع للدخول برقم الموبايل</button>';
    }
    if (step === 'phone') {
      return '<h2 style="margin-top:0">أدخل رقم موبايلك</h2><p class="muted small">راح نرسل لك رمز تحقق من 6 أرقام.</p>' +
        '<div class="field"><label for="a-phone">رقم الهاتف</label><input id="a-phone" class="ltr" inputmode="tel" autocomplete="tel" placeholder="07701234567" maxlength="16" value="' + F.esc(phone) + '"><div class="err" id="e-phone"></div></div>' +
        '<div class="field"><label>أرسل الرمز عبر</label><div class="seg" id="a-ch">' +
          ['whatsapp', 'sms'].map((c) => '<button type="button" data-c="' + c + '" class="' + (channel === c ? 'on' : '') + '">' + chName(c) + '</button>').join('') + '</div></div>' +
        '<label class="check"><input type="checkbox" id="a-consent"><span>أوافق على استخدام موقعي ورقمي لعرض أقرب كرين، وقرأت <a href="#" id="a-priv">سياسة الخصوصية</a>.</span></label>' +
        '<div class="err" id="e-consent" style="margin:-8px 0 10px"></div><div class="err" id="e-form" style="margin-bottom:8px"></div>' +
        '<button class="btn big block" type="submit" id="a-go">أرسل الرمز</button>' +
        '<button class="btn ghost block mt-s" type="button" id="a-admin">دخول المدير</button>';
    }
    if (step === 'code') {
      return '<h2 style="margin-top:0">أدخل الرمز</h2><p class="muted small">أرسلناه عبر ' + chName(channel) + ' إلى <b style="direction:ltr;display:inline-block">' + F.esc(phone) + '</b></p>' +
        '<div class="field"><input id="a-code" class="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" style="text-align:center;letter-spacing:8px;font-size:22px"><div class="err" id="e-code"></div></div>' +
        '<div class="err" id="e-form" style="margin-bottom:8px"></div><button class="btn big block" type="submit" id="a-go">تحقق</button>' +
        '<div class="row wrap mt-s"><button class="btn secondary grow" type="button" id="a-resend"' + (cooldown ? ' disabled' : '') + '>' + (cooldown ? 'إعادة الإرسال بعد ' + cooldown + ' ث' : 'إعادة إرسال الرمز') + '</button>' +
        '<button class="btn secondary grow" type="button" id="a-switch">أرسله عبر ' + chName(channel === 'whatsapp' ? 'sms' : 'whatsapp') + '</button></div>' +
        '<button class="btn ghost block mt-s" type="button" id="a-change">تغيير الرقم</button>';
    }
    return '<h2 style="margin-top:0">كمّل بياناتك</h2><p class="muted small">مرة وحدة بس.</p>' +
      '<div class="field"><label for="a-name">الاسم الثلاثي</label><input id="a-name" autocomplete="name" placeholder="مثال: علي حسين كاظم"><div class="err" id="e-name"></div></div>' +
      '<div class="field"><label for="a-gov">المحافظة اللي تسكنها</label><select id="a-gov"><option value="">اختر المحافظة</option>' + F.GOVS.map((g) => '<option>' + g.name + '</option>').join('') + '</select><div class="err" id="e-gov"></div></div>' +
      '<div class="field"><label for="a-car">نوع السيارة</label><input id="a-car" placeholder="مثال: كيا سيراتو 2018"><div class="err" id="e-car"></div></div>' +
      '<div class="err" id="e-form" style="margin-bottom:8px"></div><button class="btn big block" type="submit" id="a-go">ابدأ</button>';
  }

  const errAt = (id, msg) => { const n = F.$('#' + id); if (n) n.textContent = msg || ''; return !msg; };

  async function guarded(fn) {
    if (busy) return;
    busy = true;
    const b = F.$('#a-go'); if (b) b.disabled = true;
    try { await fn(); } catch (e) { const n = F.$('#e-form'); if (n) n.textContent = F.errMsg(e); }
    busy = false;
    const b2 = F.$('#a-go'); if (b2) b2.disabled = false;
  }

  async function send(ch) {
    channel = ch;
    await F.sb.sendOtp(phone, channel);
    step = 'code'; cooldown = 60; tick();
    F.auth.render();
    const c = F.$('#a-code'); if (c) c.focus();
  }

  function done() {
    F.$('#auth').hidden = true;
    F.showApp();
    const u = F.user();
    F.toast('هلا ' + (u && u.name ? F.firstName(u.name) : '') + '، أهلاً بيك بسند جايك' + (F.isRealAdmin() ? ' (مدير)' : ''), 'ok');
  }

  F.auth = {
    // يعرض شاشة الدخول (ويخفي التطبيق)
    // مستخدم مسجّل بدون اسم (قطع الخطوة الأخيرة سابقاً)
    completeProfile: function () { phone = F.authPhone(); step = 'profile'; mode = 'phone'; F.$('#app').hidden = true; F.auth.render(); },
    open: function () { F.$('#app').hidden = true; step = 'phone'; mode = 'phone'; F.auth.render(); },

    render: function () {
      const root = F.$('#auth');
      root.hidden = false;
      root.innerHTML = '<div class="auth-box">' + hero() + '<form class="card" id="auth-form" novalidate>' + formHtml() + '</form>' +
        '<p class="muted small center mt">رقمك يظهر فقط للسائق اللي يقبل طلبك.</p></div>';
      F.$('#auth-form').onsubmit = (e) => { e.preventDefault(); F.auth.submit(); };
      const on = (id, fn) => { const n = F.$('#' + id); if (n) n.onclick = fn; };
      const pv = F.$('#a-priv'); if (pv) pv.onclick = (e) => { e.preventDefault(); F.showPrivacy(); };
      F.$$('#a-ch [data-c]').forEach((b) => { b.onclick = () => { channel = b.dataset.c; F.$$('#a-ch [data-c]').forEach((x) => x.classList.toggle('on', x === b)); }; });
      on('a-admin', () => { mode = 'email'; F.auth.render(); });
      on('a-back', () => { mode = 'phone'; F.auth.render(); });
      on('a-change', () => { step = 'phone'; F.auth.render(); });
      on('a-resend', () => guarded(() => send(channel)));
      on('a-switch', () => guarded(() => send(channel === 'whatsapp' ? 'sms' : 'whatsapp')));
    },

    submit: function () {
      return guarded(async () => {
        errAt('e-form');
        if (mode === 'email') {
          const email = F.$('#a-email').value.trim().toLowerCase(), pass = F.$('#a-pass').value;
          const ok = errAt('e-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'اكتب إيميل صحيح.') & errAt('e-pass', pass ? '' : 'اكتب كلمة المرور.');
          if (!ok) return;
          await F.sb.signIn(email, pass);
          return done();
        }
        if (step === 'phone') {
          phone = F.cleanPhone(F.$('#a-phone').value);
          const ok = errAt('e-phone', F.validPhone(phone) ? '' : 'الرقم لازم 11 رقم ويبدأ بـ 07.') & errAt('e-consent', F.$('#a-consent').checked ? '' : 'لازم توافق حتى نكمّل.');
          if (!ok) return;
          return send(channel);
        }
        if (step === 'code') {
          const code = F.digits(F.$('#a-code').value).trim();
          if (!errAt('e-code', /^\d{6}$/.test(code) ? '' : 'الرمز 6 أرقام.')) return;
          const r = await F.sb.verifyOtp(phone, code);
          if (r.needsProfile) { step = 'profile'; return F.auth.render(); }
          return done();
        }
        // step === 'profile'
        const name = F.$('#a-name').value.trim().replace(/\s+/g, ' '), car = F.$('#a-car').value.trim(), gov = F.$('#a-gov').value;
        const ok = errAt('e-name', name.split(' ').length >= 3 ? '' : 'اكتب الاسم الثلاثي (ثلاث كلمات).') & errAt('e-gov', gov ? '' : 'اختر محافظتك.') & errAt('e-car', car.length >= 2 ? '' : 'اكتب نوع السيارة.');
        if (!ok) return;
        await F.sb.saveProfile({ full_name: name, phone: phone, car: car, governorate: gov });
        done();
      });
    }
  };
})();

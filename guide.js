/* سند جايك — دليل «سيارتي تعطلت» + إرسال الموقع (واتساب / مشاركة / نسخ) */
(function () {
  'use strict';
  const F = window.F;

  const STEPS = [
    ['شغّل الفلاشر', 'شغّل إشارات الخطر (الفلاشر) فوراً حتى يشوفك السواق من بعيد.'],
    ['ابتعد عن السير', 'إذا تكدر، خلّي السيارة جنب الطريق وبعيد عن المنعطفات والمرتفعات. لا توقف بمكان ما يشوفونك منه.'],
    ['اطلع بأمان', 'انزل من الباب البعيد عن السير، وقف بعيد عن السيارة وعن الطريق، خصوصاً على الطرق السريعة.'],
    ['لا تصلّح على الطريق', 'لا تقف بين سيارتك وحركة السير، ولا تحاول تصلّح عطل على طريق سريع.'],
    ['شارك موقعك', 'أرسل موقعك لشخص تثق بيه حتى يعرف وين انت (الزر تحت).'],
    ['اتصل بالكرين', 'اختار الكرين المناسب (سحب، سطحة، ونش…) واسأله عن السعر ووقت الوصول قبل ما يتحرك.'],
    ['انتبه للحرارة', 'إذا السيارة سخنت، لا تفتح غطاء الرادياتير وهو حار — البخار والسائل ممكن يحرقك. انتظر لين تبرد.'],
    ['قبل التسليم', 'صوّر سيارتك من كل الجهات، واتفق على السعر والوجهة قبل التحميل.']
  ];

  function mapsLink(l) {
    return 'https://www.google.com/maps?q=' + l.lat.toFixed(6) + ',' + l.lng.toFixed(6);
  }

  function message(l) {
    const u = F.user() || {};
    return 'أحتاج مساعدة — سيارتي متعطلة.\n' +
      (u.car ? 'السيارة: ' + u.car + '\n' : '') +
      'موقعي: ' + mapsLink(l);
  }

  // يحاول يجيب موقع حديث. يرجّع الموقع أو null إذا ألغى المستخدم.
  async function currentLocation() {
    try {
      const p = await F.getGPS();
      return F.setLoc(p.lat, p.lng, 'gps');
    } catch (e) {
      const cur = F.loc();
      if (cur.source !== 'default') {
        F.toast('تعذّر GPS — راح نستخدم آخر موقع محفوظ (' + F.ago(cur.at) + ')');
        return cur;
      }
      F.toast(F.gpsError(e), 'err');
      const p = await F.pickLocation(cur);
      return p ? F.setLoc(p.lat, p.lng, 'manual') : null;
    }
  }

  async function shareLocation() {
    F.toast('جاري تحديد موقعك…');
    const l = await currentLocation();
    if (!l) return;
    if (F.home && F.home.refresh) F.home.refresh();
    const text = message(l);
    const m = F.modal(
      '<h2>' + F.icon('share') + ' أرسل موقعك</h2>' +
      '<p class="muted small">' + F.locLabel(l) + '</p>' +
      '<div class="card" style="white-space:pre-line;font-size:14px">' + F.esc(text) + '</div>' +
      '<div class="stack mt">' +
        '<a class="btn green block" id="sh-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '">واتساب</a>' +
        (navigator.share ? '<button class="btn secondary block" id="sh-native">مشاركة عبر تطبيق آخر</button>' : '') +
        '<button class="btn secondary block" id="sh-copy">نسخ الرسالة</button>' +
        '<button class="btn ghost block" id="sh-close">إغلاق</button>' +
      '</div>'
    );
    F.$('#sh-close', m.el).onclick = m.close;
    const nat = F.$('#sh-native', m.el);
    if (nat) nat.onclick = () => { navigator.share({ text: text }).catch(() => {}); };
    F.$('#sh-copy', m.el).onclick = async () => {
      try { await navigator.clipboard.writeText(text); F.toast('تم النسخ', 'ok'); }
      catch (e) { F.toast('تعذّر النسخ، انسخ النص يدوياً', 'err'); }
    };
  }

  const SOSK = 'sanad_sos_contact';
  const getC = () => { try { return JSON.parse(localStorage.getItem(SOSK) || 'null'); } catch (e) { return null; } };
  const waNum = (p) => '964' + String(p).replace(/^0/, '');

  // زر الطوارئ: أرقام النجدة + إرسال الموقع لجهة اتصالك بواتساب
  async function sos() {
    const c = getC();
    const m = F.modal(
      '<h2 style="color:var(--danger,#ff5a5a)">' + F.icon('alert') + ' طوارئ</h2>' +
      '<p class="muted small">إذا كو خطر على حياتك أو إصابات، اتصل بالنجدة أول شي.</p>' +
      '<div class="sos-nums">' +
        '<a class="btn danger block" href="tel:104">' + F.icon('phone') + ' الشرطة 104</a>' +
        '<a class="btn danger block" href="tel:122">' + F.icon('phone') + ' الإسعاف 122</a>' +
        '<a class="btn danger block" href="tel:115">' + F.icon('phone') + ' الإطفاء 115</a>' +
      '</div>' +
      '<div class="card mt"><b>جهة الاتصال الخاصة بك</b>' +
        (c ? '<p class="small" style="margin:6px 0">' + F.esc(c.name) + ' · <span style="direction:ltr;display:inline-block">' + F.esc(c.phone) + '</span></p>' +
             '<button class="btn big block" id="sos-send">' + F.icon('share') + ' أرسل موقعي لـ ' + F.esc(c.name) + '</button>' +
             '<button class="btn ghost block mt-s" id="sos-edit">تغيير الجهة</button>'
           : '<p class="muted small">سجّل شخص تثق بيه (أخ، صديق) حتى نرسله موقعك بضغطة وحدة وقت الخطر.</p>' +
             '<div class="field"><input id="sos-name" maxlength="30" placeholder="الاسم (مثال: أخوي)"></div>' +
             '<div class="field"><input id="sos-phone" class="ltr" inputmode="tel" maxlength="16" placeholder="07701234567"><div class="err" id="sos-err"></div></div>' +
             '<button class="btn block" id="sos-save">حفظ</button>') +
      '</div><button class="btn secondary block mt" id="sos-x">إغلاق</button>');
    const $ = (i) => F.$(i, m.el);
    $('#sos-x').onclick = m.close;
    if ($('#sos-edit')) $('#sos-edit').onclick = () => { try { localStorage.removeItem(SOSK); } catch (e) {} m.close(); sos(); };
    if ($('#sos-save')) $('#sos-save').onclick = () => {
      const name = $('#sos-name').value.trim(), ph = F.cleanPhone($('#sos-phone').value);
      if (name.length < 2) { $('#sos-err').textContent = 'اكتب الاسم.'; return; }
      if (!F.validPhone(ph)) { $('#sos-err').textContent = 'الرقم لازم 11 رقم ويبدأ بـ 07.'; return; }
      try { localStorage.setItem(SOSK, JSON.stringify({ name: name, phone: ph })); } catch (e) {}
      m.close(); sos();
    };
    if ($('#sos-send')) $('#sos-send').onclick = async () => {
      const l = await currentLocation();
      if (!l) return;
      const text = 'طوارئ! أحتاج مساعدة فوراً.\nموقعي: ' + mapsLink(l);
      window.open('https://wa.me/' + waNum(c.phone) + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    };
  }

  function show() {
    const m = F.modal(
      '<h2>' + F.icon('shield') + ' سيارتي تعطلت — شنو أسوي؟</h2>' +
      '<p class="muted small">إذا كو خطر فوري أو إصابات، اتصل بجهات الطوارئ أول شي.</p>' +
      '<ol class="gd-steps" id="gd-list">' +
        STEPS.map((s, i) => '<li' + (i > 2 ? ' class="gd-more" hidden' : '') + '><strong>' + s[0] + '</strong><p>' + s[1] + '</p></li>').join('') +
      '</ol>' +
      '<button class="btn secondary block" id="gd-more">باقي الخطوات (' + (STEPS.length - 3) + ')</button>' +
      '<div class="stack mt">' +
        '<button class="btn big block" id="gd-share">' + F.icon('share') + ' أرسل موقعي</button>' +
        '<button class="btn secondary block" id="gd-close">إغلاق</button>' +
      '</div>'
    );
    F.$('#gd-more', m.el).onclick = (e) => { F.$$('.gd-more', m.el).forEach((x) => { x.hidden = false; }); e.currentTarget.remove(); };
    F.$('#gd-close', m.el).onclick = m.close;
    F.$('#gd-share', m.el).onclick = () => { m.close(); shareLocation(); };
  }

  F.guide = { show: show, shareLocation: shareLocation, sos: sos };
})();

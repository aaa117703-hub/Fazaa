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
    ['اتصل بالكرين', 'اختار الكرين المناسب (سحب، سطحة، ونش…) واسأله عن السعر ووقت الوصول <b>قبل</b> ما يتحرك.'],
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

  function show() {
    const m = F.modal(
      '<h2>' + F.icon('shield') + ' سيارتي تعطلت — شنو أسوي؟</h2>' +
      '<p class="muted small">إذا كو خطر فوري أو إصابات، اتصل بجهات الطوارئ أول شي.</p>' +
      '<ol class="steps">' +
        STEPS.map((s) => '<li><b>' + s[0] + '</b><span>' + s[1] + '</span></li>').join('') +
      '</ol>' +
      '<div class="stack mt">' +
        '<button class="btn big block" id="gd-share">' + F.icon('share') + ' أرسل موقعي</button>' +
        '<button class="btn secondary block" id="gd-close">إغلاق</button>' +
      '</div>'
    );
    F.$('#gd-close', m.el).onclick = m.close;
    F.$('#gd-share', m.el).onclick = () => { m.close(); shareLocation(); };
  }

  F.guide = { show: show, shareLocation: shareLocation };
})();

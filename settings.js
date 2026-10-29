/* سند جايك — الإعدادات: المظهر، الحركة، الكرينات التجريبية، التثبيت، التحديث، حول التطبيق */
(function () {
  'use strict';
  const F = window.F;

  const VERSION = '1.1';

  // حدث التثبيت (Chrome/Android). نحفظه حتى نعرض زر «ثبّت التطبيق».
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (F.settings && F.settings.refresh) F.settings.refresh(); });
  window.addEventListener('appinstalled', () => { installEvt = null; if (F.settings && F.settings.refresh) F.settings.refresh(); });

  const isStandalone = () =>
    (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

  function seg(name, value, options) {
    return '<div class="seg" role="radiogroup" data-seg="' + name + '">' +
      options.map((o) =>
        '<button type="button" role="radio" aria-checked="' + (o[0] === value) + '" class="' + (o[0] === value ? 'on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'
      ).join('') + '</div>';
  }

  function toggle(id, checked, title, desc) {
    return '<label class="set-row" for="' + id + '">' +
      '<span class="grow"><b>' + title + '</b>' + (desc ? '<span class="muted small">' + desc + '</span>' : '') + '</span>' +
      '<input type="checkbox" class="switch" id="' + id + '"' + (checked ? ' checked' : '') + '>' +
      '</label>';
  }

  function render() {
    const el = F.$('#v-settings');
    const s = F.getSettings();

    let installBlock = '';
    if (isStandalone()) {
      installBlock = '<div class="muted small">' + F.icon('check-circle') + ' التطبيق مثبّت على جهازك.</div>';
    } else if (installEvt) {
      installBlock = '<button class="btn block" id="s-install">' + F.icon('download') + ' ثبّت التطبيق على جهازك</button>';
    } else if (isIOS()) {
      installBlock = '<div class="muted small">على آيفون: اضغط زر المشاركة بالمتصفح ثم «إضافة إلى الشاشة الرئيسية».</div>';
    } else {
      installBlock = '<div class="muted small">إذا يدعم متصفحك التثبيت، راح يظهر هنا زر «ثبّت التطبيق». أو استخدم قائمة المتصفح ← «تثبيت التطبيق».</div>';
    }

    el.innerHTML =
      '<h1>' + F.icon('sliders') + ' الإعدادات</h1>' +
      '<p class="lead">كل الإعدادات تنحفظ على جهازك فقط.</p>' +

      '<div class="card"><h2>المظهر</h2>' +
        '<div class="set-label">الوضع</div>' +
        seg('theme', s.theme, [['auto', 'تلقائي'], ['dark', 'داكن'], ['light', 'فاتح']]) +
        '<p class="muted small mt-s">الخريطة تتبع الوضع عند فتح الصفحة من جديد.</p>' +
        toggle('s-motion', s.reduceMotion, 'تقليل الحركة', 'يوقّف الحركات والانتقالات المتحركة.') +
      '</div>' +

      '<div class="card"><h2>الرئيسية</h2>' +
        toggle('s-avail', s.onlyAvail, 'إظهار المتاح فقط', 'يفعّل فلتر «متاح فقط» تلقائياً عند فتح التطبيق.') +
        toggle('s-demo', s.hideDemo, 'إخفاء الكرينات التجريبية', 'الكرينات اللي بشارة «تجريبي» ما عندها أرقام حقيقية.') +
      '</div>' +

      '<div class="card"><h2>التطبيق</h2>' +
        '<div class="stack">' +
          installBlock +
          '<button class="btn secondary" id="s-update">' + F.icon('radar') + ' تحديث التطبيق (مسح الذاكرة المؤقتة)</button>' +
        '</div>' +
        '<p class="muted small mt-s">استخدم «تحديث التطبيق» إذا ما ظهرت لك آخر التعديلات.</p>' +
      '</div>' +

      '<div class="card"><h2>حول سند جايك</h2>' +
        '<ul class="list">' +
          '<li><span>الإصدار</span><span class="muted">' + VERSION + ' (تجريبي)</span></li>' +
          '<li><span>التغطية الحالية</span><span class="muted">الناصرية، ذي قار</span></li>' +
        '</ul>' +
        '<div class="row wrap mt">' +
          '<button class="btn secondary" id="s-priv">' + F.icon('doc') + ' سياسة الخصوصية</button>' +
          '<button class="btn secondary" id="s-guide">' + F.icon('shield') + ' دليل «سيارتي تعطلت»</button>' +
        '</div>' +
      '</div>';

    F.$$('[data-seg="theme"] button', el).forEach((b) => {
      b.onclick = () => { F.saveSettings({ theme: b.dataset.v }); render(); };
    });
    F.$('#s-motion', el).onchange = (e) => F.saveSettings({ reduceMotion: e.target.checked });
    F.$('#s-avail', el).onchange = (e) => F.saveSettings({ onlyAvail: e.target.checked });
    F.$('#s-demo', el).onchange = (e) => F.saveSettings({ hideDemo: e.target.checked });
    F.$('#s-priv', el).onclick = F.showPrivacy;
    F.$('#s-guide', el).onclick = () => F.guide.show();
    const inst = F.$('#s-install', el);
    if (inst) inst.onclick = async () => {
      if (!installEvt) return;
      installEvt.prompt();
      try { await installEvt.userChoice; } catch (e) {}
      installEvt = null;
      render();
    };
    F.$('#s-update', el).onclick = updateApp;
  }

  async function updateApp() {
    F.toast('جاري التحديث…');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}
    // بياناتك (الحساب، الإعدادات) ما تنمسح — بس ملفات التطبيق
    setTimeout(() => location.reload(), 400);
  }

  F.settings = { show: render, refresh: function () { if (F.$('#v-settings') && !F.$('#v-settings').hidden) render(); } };
})();

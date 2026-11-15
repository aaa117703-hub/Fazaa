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
        '<div class="set-label">مكان شريط الأيقونات</div>' +
        seg('navpos', s.navPos === 'top' ? 'top' : 'bottom', [['bottom', 'تحت'], ['top', 'فوق']]) +
        toggle('s-motion', s.reduceMotion, 'تقليل الحركة', 'يوقّف الحركات والانتقالات المتحركة.') +
      '</div>' +

      '<div class="card"><h2>حجم الخط والأزرار</h2>' +
        '<p class="muted small">غيّر الحجم وراح يظهر لك نموذج بالضبط حتى تشوف النتيجة.</p>' +
        '<div class="size-row"><span class="lbl">حجم الخط</span><button type="button" data-sz="font" data-d="-1" aria-label="تصغير الخط">−</button><span class="val" id="sz-font"></span><button type="button" data-sz="font" data-d="1" aria-label="تكبير الخط">+</button></div>' +
        '<div class="size-row"><span class="lbl">حجم الأزرار</span><button type="button" data-sz="btn" data-d="-1" aria-label="تصغير الأزرار">−</button><span class="val" id="sz-btn"></span><button type="button" data-sz="btn" data-d="1" aria-label="تكبير الأزرار">+</button></div>' +
        '<button class="btn secondary sm" type="button" id="sz-reset">إعادة للحجم العادي</button>' +
      '</div>' +

      '<div class="card"><h2>اللغة</h2>' +
        seg('lang', s.lang || 'ar', [['ar', 'العربية'], ['en', 'English'], ['ckb', 'کوردی']]) +
        '<p class="muted small mt-s">الترجمة الكردية (سۆرانی) تجريبية وتحتاج مراجعة قبل الإطلاق.</p>' +
      '</div>' +

      '<div class="card"><h2>الإشعارات</h2><div id="s-push"></div></div>' +

      '<div class="card"><h2>الرئيسية</h2>' +
        toggle('s-avail', s.onlyAvail, 'إظهار المتاح فقط', 'يفعّل فلتر «متاح فقط» تلقائياً عند فتح التطبيق.') +
        toggle('s-demo', s.hideDemo, 'إخفاء الكرينات التجريبية', 'الكرينات اللي بشارة «تجريبي» ما عندها أرقام حقيقية.') +
      '</div>' +

      '<div class="card"><h2>التطبيق</h2>' +
        '<div class="stack">' +
          installBlock +
          '<button class="btn secondary" id="s-offline">' + F.icon('map') + ' خرائط دون اتصال</button>' +
          '<button class="btn secondary" id="s-update">' + F.icon('radar') + ' تحديث التطبيق (مسح الذاكرة المؤقتة)</button>' +
        '</div>' +
        '<p class="muted small mt-s">استخدم «تحديث التطبيق» إذا ما ظهرت لك آخر التعديلات.</p>' +
      '</div>' +

      '<div class="card"><h2>حول سند جايك</h2>' +
        '<ul class="list">' +
          '<li><span>الإصدار</span><span class="muted">' + VERSION + ' (تجريبي)</span></li>' +
          '<li><span>التغطية الحالية</span><span class="muted">كل محافظات العراق</span></li>' +
        '</ul>' +
        '<div class="row wrap mt">' +
          '<button class="btn secondary" id="s-priv">' + F.icon('doc') + ' سياسة الخصوصية</button>' +
        '<button class="btn secondary" id="s-terms">' + F.icon('doc') + ' شروط الاستخدام</button>' +
          '<button class="btn secondary" id="s-guide">' + F.icon('shield') + ' دليل «سيارتي تعطلت»</button>' +
        '</div>' +
      '</div>';

    F.$$('[data-seg="navpos"] button', el).forEach((b) => {
      b.onclick = () => { F.saveSettings({ navPos: b.dataset.v }); render(); };
    });
    F.$$('[data-seg="lang"] button', el).forEach((b) => {
      b.onclick = () => { F.saveSettings({ lang: b.dataset.v }); location.reload(); };
    });
    sizeBlock(el);
    pushBlock(F.$('#s-push', el));
    F.$('#s-motion', el).onchange = (e) => F.saveSettings({ reduceMotion: e.target.checked });
    F.$('#s-avail', el).onchange = (e) => F.saveSettings({ onlyAvail: e.target.checked });
    F.$('#s-demo', el).onchange = (e) => F.saveSettings({ hideDemo: e.target.checked });
    F.$('#s-offline', el).onclick = () => { location.hash = '#offline'; };
    F.$('#s-priv', el).onclick = F.showPrivacy;
    F.$('#s-terms', el).onclick = F.showTerms;
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

  // ===== حجم الخط والأزرار + نموذج المعاينة =====
  let pvTimer = null;
  function showPreview() {
    let pv = F.$('#size-preview');
    if (!pv) {
      pv = document.createElement('div'); pv.id = 'size-preview'; pv.setAttribute('role', 'status');
      pv.innerHTML = '<span class="pv-tag">نموذج الحجم</span><div class="pv-t">هذا شكل العنوان</div><div class="pv-s">وهذا شكل النص العادي بالتطبيق، حتى تشوف إذا مريح لعينك.</div>' +
        '<div class="row"><button class="btn grow" type="button" tabindex="-1">زر رئيسي</button><button class="btn secondary" type="button" tabindex="-1">ثانوي</button></div>';
      document.body.appendChild(pv);
    }
    void pv.offsetWidth; pv.classList.add('show');
    clearTimeout(pvTimer);
    pvTimer = setTimeout(() => pv.classList.remove('show'), 2800);
  }
  function sizeBlock(el) {
    const draw = () => {
      const s = F.getSettings(), fi = s.fontStep == null ? 1 : s.fontStep, bi = s.btnStep == null ? 1 : s.btnStep;
      F.$('#sz-font', el).textContent = F.FONT_STEPS[fi][1];
      F.$('#sz-btn', el).textContent = F.BTN_STEPS[bi][1];
      F.$$('[data-sz="font"]', el).forEach((b) => { const n = fi + +b.dataset.d; b.disabled = n < 0 || n >= F.FONT_STEPS.length; });
      F.$$('[data-sz="btn"]', el).forEach((b) => { const n = bi + +b.dataset.d; b.disabled = n < 0 || n >= F.BTN_STEPS.length; });
    };
    F.$$('[data-sz]', el).forEach((b) => {
      b.onclick = () => {
        const s = F.getSettings(), k = b.dataset.sz === 'font' ? 'fontStep' : 'btnStep', max = (k === 'fontStep' ? F.FONT_STEPS : F.BTN_STEPS).length - 1;
        const cur = s[k] == null ? 1 : s[k], n = Math.min(max, Math.max(0, cur + +b.dataset.d));
        F.saveSettings({ [k]: n }); draw(); showPreview();
      };
    });
    F.$('#sz-reset', el).onclick = () => { F.saveSettings({ fontStep: 1, btnStep: 1 }); draw(); showPreview(); };
    draw();
  }

  async function pushBlock(box) {
    if (!box) return;
    if (!F.push || !F.push.supported()) { box.innerHTML = '<div class="muted small">هذا المتصفح ما يدعم الإشعارات. على الآيفون: أضف التطبيق للشاشة الرئيسية أول.</div>'; return; }
    if (F.isGuest()) { box.innerHTML = '<div class="muted small">سجّل دخول حتى تفعّل الإشعارات.</div>'; return; }
    const on = await F.push.enabled();
    box.innerHTML = '<div class="row between"><div class="muted small">' + (on ? 'شغّالة على هذا الجهاز.' : 'تصلك تنبيهات الطلبات وقبولها حتى والتطبيق مسكّر.') + '</div>' +
      '<button class="btn sm ' + (on ? 'secondary' : '') + '" id="s-push-btn">' + (on ? 'إيقاف' : 'تفعيل') + '</button></div>';
    F.$('#s-push-btn', box).onclick = () => (on ? F.push.disable() : F.push.enable())
      .then(() => { F.toast(on ? 'تم إيقاف الإشعارات' : 'تم تفعيل الإشعارات', 'ok'); pushBlock(box); })
      .catch((e) => F.toast(F.errMsg(e), 'err'));
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

/* سند جايك — التنقل وتشغيل التطبيق */
(function () {
  'use strict';
  const F = window.F;

  const VIEWS = { home: 'v-home', driver: 'v-driver', packages: 'v-packages', profile: 'v-profile', settings: 'v-settings', offline: 'v-offline', admin: 'v-admin', 'admin-drivers': 'v-admin', 'admin-app': 'v-admin' };
  const NAV = [
    ['home', 'home', 'الرئيسية'],
    ['driver', 'wheel', 'سائق'],
    ['packages', 'gem', 'الباقات'],
    ['profile', 'user', 'حسابي']
  ];
  let ready = false, current = '';
  const ORDER = ['home', 'driver', 'packages', 'profile', 'settings', 'offline', 'admin', 'admin-drivers', 'admin-app'];

  function buildNav() {
    const html = NAV.map((n) =>
      '<button data-nav="' + n[0] + '">' + F.icon(n[1]) + '<span>' + n[2] + '</span></button>').join('');
    F.$('#nav-top').innerHTML = html + '<button class="sos-top" id="nav-sos-top" aria-label="طوارئ SOS">' + F.icon('siren') + '<span>طوارئ SOS</span></button>';
    const st = F.$('#nav-sos-top'); if (st) st.onclick = () => { if (F.guide && F.guide.sos) F.guide.sos(); };
    const parts = NAV.map((n) => '<button data-nav="' + n[0] + '">' + F.icon(n[1]) + '<span>' + n[2] + '</span></button>');
    parts.splice(2, 0, '<button id="nav-sos" aria-label="طوارئ SOS">' + F.icon('siren') + '<span>طوارئ</span></button>');
    F.$('#nav-bottom').innerHTML = parts.join('');
    const sos = F.$('#nav-sos');
    if (sos) sos.onclick = () => { if (F.guide && F.guide.sos) F.guide.sos(); };
    const gear = F.$('#tb-settings');
    gear.innerHTML = F.icon('sliders');
    gear.onclick = () => { location.hash = '#settings'; };
    F.$$('button[data-nav]').forEach((b) => { b.onclick = () => { location.hash = '#' + b.dataset.nav; }; });
    ['#nav-top', '#nav-bottom'].forEach((sel) => {
      const ind = document.createElement('span');
      ind.className = 'nav-ind';
      F.$(sel).prepend(ind);
    });
  }

  // المؤشر المتحرك (الإطار) تحت الزر النشط
  function moveInd() {
    ['#nav-top', '#nav-bottom'].forEach((sel) => {
      const nav = F.$(sel), ind = F.$('.nav-ind', nav), btn = F.$('button.active', nav);
      if (!ind) return;
      const nr = nav.getBoundingClientRect();
      if (!btn || !nr.width) { ind.style.opacity = 0; return; }
      const br = btn.getBoundingClientRect();
      const apply = () => {
        ind.style.width = br.width + 'px';
        ind.style.height = br.height + 'px';
        ind.style.transform = 'translate(' + (br.left - nr.left - nav.clientLeft) + 'px,' + (br.top - nr.top - nav.clientTop) + 'px)';
        ind.style.opacity = 1;
      };
      if (!ind.dataset.ready) {
        ind.style.transition = 'none';
        apply();
        void ind.offsetWidth;
        ind.style.transition = '';
        ind.dataset.ready = '1';
      } else apply();
    });
  }

  async function route() {
    if (!F.canEnter()) return;
    let v = (location.hash || '#home').slice(1);
    if (!VIEWS[v]) v = 'home';
    const isAd = v === 'admin' || v === 'admin-drivers' || v === 'admin-app';
    if (isAd && !F.isAdmin()) { v = 'profile'; history.replaceState(null, '', '#profile'); }

    if (isAd) {
      const ok = await F.admin.show(v === 'admin-app' ? 'app' : 'drivers');
      if (!ok) { location.hash = '#profile'; return; }
    }

    const prev = current;
    const vid = VIEWS[v];
    Object.keys(VIEWS).forEach((k) => { F.$('#' + VIEWS[k]).hidden = VIEWS[k] !== vid; });
    F.$$('button[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === (isAd || v === 'settings' ? 'profile' : v === 'offline' ? 'home' : v)));
    current = v;
    document.body.classList.toggle('off-page', v === 'offline');

    // انتقال سلس: الصفحة الجديدة تنزلق من جهة التنقل
    if (prev !== v) {
      const target = F.$('#' + VIEWS[v]);
      const dir = prev && ORDER.indexOf(v) < ORDER.indexOf(prev) ? -1 : 1;
      target.style.setProperty('--dx', (dir * -28) + 'px');
      target.classList.remove('enter');
      void target.offsetWidth;
      target.classList.add('enter');
    }
    moveInd();

    if (v === 'home') F.home.show();
    else if (v === 'driver') F.driver.show();
    else if (v === 'packages') F.packages.show();
    else if (v === 'profile') F.profile.show();
    else if (v === 'settings') F.settings.show();
    else if (v === 'offline') F.offline.show();
    window.scrollTo(0, 0);
  }

  // مبدّل العرض للمدير: مدير / زبون / زائر
  function viewChip() {
    const b = F.$('#tb-view');
    if (!b) return;
    b.hidden = !F.isRealAdmin();
    const names = { admin: 'مدير', customer: 'زبون', visitor: 'زائر' };
    b.innerHTML = F.icon('eye') + ' ' + names[F.viewAs()];
    b.onclick = () => {
      const m = F.modal('<h2>عرض التطبيق كـ</h2><div class="stack">' +
        [['admin', 'مدير (كل الصلاحيات)'], ['customer', 'زبون مسجّل'], ['visitor', 'زائر (بدون حساب)']].map((v) =>
          '<button class="btn ' + (F.viewAs() === v[0] ? '' : 'secondary') + ' block" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>');
      F.$$('[data-v]', m.el).forEach((x) => { x.onclick = () => { F.setViewAs(x.dataset.v); m.close(); if (F.driver) F.driver.stop(); if (F.request) F.request.reset(); viewChip(); current = ''; route(); }; });
    };
  }

  // نأخّر تشغيل التطبيق (الخريطة والبيانات) لحد ما تخلص الافتتاحية حتى ما تتقطع الحركة
  function afterSplash(fn) {
    const s = document.getElementById('splash');
    if (!s || !s.parentNode) return fn();
    let d = false;
    const go = () => { if (d) return; d = true; fn(); };
    document.addEventListener('splash-out', go, { once: true });
    setTimeout(go, 5700);
  }
  F.showApp = function () { afterSplash(showAppNow); };
  function showAppNow() {
    F.$('#auth').hidden = true;
    F.$('#app').hidden = false;
    if (!ready) {
      buildNav();
      F.driver.init();
      F.admin.init();
      applyRemote(); setInterval(applyRemote, 120000);
      ready = true;
      F.driver.resume();
      if (F.native) F.native.onReady();
    }
    viewChip();
    route();
    const app = F.$('#app');
    app.classList.remove('app-in'); void app.offsetWidth; app.classList.add('app-in');
  }

  // قفل الصيانة + شريط الإعلان (من app_settings)
  async function applyRemote() {
    try {
      const st = await F.sb.q('app_settings', 'select=key,value');
      const g = (k) => ((st || []).find((x) => x.key === k) || { value: {} }).value || {};
      const m = g('maintenance'), n = g('announcement');
      let lock = F.$('#maint');
      if (m.on && !F.isRealAdmin()) {
        if (!lock) { lock = document.createElement('div'); lock.id = 'maint'; document.body.appendChild(lock); }
        lock.innerHTML = '<div class="maint-in">' + F.icon('lock') + '<h2>صيانة</h2><p>' + F.esc(m.msg || 'التطبيق تحت الصيانة.') + '</p></div>';
      } else if (lock) lock.remove();
      let bar = F.$('#announce');
      if (n.on && n.msg) {
        if (!bar) { bar = document.createElement('div'); bar.id = 'announce'; bar.setAttribute('role', 'status'); document.body.prepend(bar); }
        bar.textContent = n.msg;
      } else if (bar) bar.remove();
    } catch (e) { /* بدون نت: تجاهل */ }
  }

  F.start = async function () {
    F.applySettings();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // شريط «ماكو إنترنت» حتى يعرف الزبون ليش شي ما يشتغل
    const net = document.createElement('div');
    net.id = 'net-bar'; net.hidden = navigator.onLine !== false; net.setAttribute('role', 'status');
    net.textContent = 'ماكو إنترنت — الاتصال بالسائقين يشتغل، والباقي يرجع لما يرجع النت';
    document.body.appendChild(net);
    const upd = () => {
      const off = navigator.onLine === false;
      net.hidden = !off;
      if (!off && F.home && F.home.refresh) F.home.refresh();
    };
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    upd();

    window.addEventListener('hashchange', route);
    window.addEventListener('resize', moveInd);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);
    // تحديث الأوقات النسبية («قبل 5 د») وتغييرات التبويبات الأخرى
    setInterval(() => { if (current === 'home' && !document.hidden) F.home.refresh(); }, 60000);
    window.addEventListener('storage', () => { if (current === 'home') F.home.refresh(); });

    await F.sb.init();
    // مسجّل بلا اسم: نكمّل بياناته. غير ذلك (زائر أو مسجّل) يدخل التطبيق مباشرة
    if (!F.isGuest() && !F.isRealAdmin() && !(F.user() && F.user().name)) F.auth.completeProfile();
    else F.showApp();
  };

  F.start();
})();

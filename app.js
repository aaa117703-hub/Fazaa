/* فزعة — التنقل وتشغيل التطبيق */
(function () {
  'use strict';
  const F = window.F;

  const VIEWS = { home: 'v-home', driver: 'v-driver', packages: 'v-packages', profile: 'v-profile', admin: 'v-admin' };
  const NAV = [
    ['home', '🏠', 'الرئيسية'],
    ['driver', '🚛', 'سائق'],
    ['packages', '💎', 'الباقات'],
    ['profile', '👤', 'حسابي']
  ];
  let ready = false, current = '';

  function buildNav() {
    const html = NAV.map((n) =>
      '<button data-nav="' + n[0] + '"><span class="ic">' + n[1] + '</span><span>' + n[2] + '</span></button>').join('');
    F.$('#nav-top').innerHTML = html;
    F.$('#nav-bottom').innerHTML = html;
    F.$$('[data-nav]').forEach((b) => { b.onclick = () => { location.hash = '#' + b.dataset.nav; }; });
  }

  async function route() {
    if (!F.loggedIn()) return;
    let v = (location.hash || '#home').slice(1);
    if (!VIEWS[v]) v = 'home';

    if (v === 'admin') {
      const ok = await F.admin.show();
      if (!ok) { location.hash = '#profile'; return; }
    }

    Object.keys(VIEWS).forEach((k) => { F.$('#' + VIEWS[k]).hidden = k !== v; });
    F.$$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === (v === 'admin' ? 'profile' : v)));
    current = v;

    if (v === 'home') F.home.show();
    else if (v === 'driver') F.driver.show();
    else if (v === 'packages') F.packages.show();
    else if (v === 'profile') F.profile.show();
    window.scrollTo(0, 0);
  }

  F.showApp = function () {
    F.$('#auth').hidden = true;
    F.$('#app').hidden = false;
    if (!ready) {
      buildNav();
      F.driver.init();
      F.admin.init();
      ready = true;
      F.driver.resume();
    }
    route();
  };

  F.start = function () {
    F.seed();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    window.addEventListener('hashchange', route);
    // تحديث الأوقات النسبية («قبل 5 د») وتغييرات التبويبات الأخرى
    setInterval(() => { if (current === 'home' && !document.hidden) F.home.refresh(); }, 60000);
    window.addEventListener('storage', () => { if (current === 'home') F.home.refresh(); });

    if (F.loggedIn()) F.showApp();
    else F.auth.render();
  };

  F.start();
})();

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
  const ORDER = ['home', 'driver', 'packages', 'profile', 'admin'];

  function buildNav() {
    const html = NAV.map((n) =>
      '<button data-nav="' + n[0] + '"><span class="ic">' + n[1] + '</span><span>' + n[2] + '</span></button>').join('');
    F.$('#nav-top').innerHTML = html;
    F.$('#nav-bottom').innerHTML = html;
    F.$$('[data-nav]').forEach((b) => { b.onclick = () => { location.hash = '#' + b.dataset.nav; }; });
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
    if (!F.loggedIn()) return;
    let v = (location.hash || '#home').slice(1);
    if (!VIEWS[v]) v = 'home';

    if (v === 'admin') {
      const ok = await F.admin.show();
      if (!ok) { location.hash = '#profile'; return; }
    }

    const prev = current;
    Object.keys(VIEWS).forEach((k) => { F.$('#' + VIEWS[k]).hidden = k !== v; });
    F.$$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === (v === 'admin' ? 'profile' : v)));
    current = v;

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
    window.addEventListener('resize', moveInd);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);
    // تحديث الأوقات النسبية («قبل 5 د») وتغييرات التبويبات الأخرى
    setInterval(() => { if (current === 'home' && !document.hidden) F.home.refresh(); }, 60000);
    window.addEventListener('storage', () => { if (current === 'home') F.home.refresh(); });

    if (F.loggedIn()) F.showApp();
    else F.auth.render();
  };

  F.start();
})();

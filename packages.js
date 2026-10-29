/* فزعة — الباقات
 * ملاحظة: لا يوجد دفع بالمرحلة 1. الاختيار هنا تجريبي ويمنح عرض 3 أشهر مجاناً.
 */
(function () {
  'use strict';
  const F = window.F;
  const PROMO_MS = 90 * 24 * 3600 * 1000;

  function render() {
    const el = F.$('#v-packages');
    const c = F.myCrane();

    el.innerHTML =
      '<h1>' + F.icon('gem') + ' الباقات</h1>' +
      '<p class="lead">للسائقين فقط. الزبون يستخدم فزعة مجاناً دائماً.</p>' +
      '<div class="promo">' + F.icon('gift') + ' أول 20 سائق: 3 أشهر مجاناً كاملة، وبعدها تختار باقتك أو توقف بدون أي التزام.</div>' +
      '<div class="pkgs">' +
      F.PACKAGES.map((p) => {
        const current = c && c.package === p.id;
        return (
          '<div class="card pkg ' + (current ? 'current' : '') + '">' +
            '<h2>' + p.name + (current ? ' <span class="badge amber">باقتك</span>' : '') + '</h2>' +
            '<div class="price">' + (p.price ? F.money(p.price) : 'مجاناً') + ' <small>' + p.unit + '</small></div>' +
            '<ul>' + p.features.map((f) => '<li class="' + (f.soon ? 'soon' : '') + '">' + f.t + (f.soon ? ' (قريباً)' : '') + '</li>').join('') + '</ul>' +
            (c
              ? '<button class="btn block ' + (current ? 'secondary' : '') + '" data-pkg="' + p.id + '"' + (current ? ' disabled' : '') + '>' +
                (current ? 'باقتك الحالية' : (p.price ? 'جرّبها 3 أشهر مجاناً' : 'اختر المجاني')) + '</button>'
              : '<a class="btn block ghost" href="#driver">سجّل كسائق أول</a>') +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<p class="muted small mt">لا يوجد دفع إلكتروني حالياً. الدفع (ZainCash وغيره) يُضاف لاحقاً بعد استشارة قانونية.</p>';

    F.$$('[data-pkg]', el).forEach((b) => {
      b.onclick = () => {
        const mine = F.myCrane();
        if (!mine) return;
        const id = b.dataset.pkg;
        F.updateCrane(mine.id, {
          package: id,
          promoUntil: id === 'free' ? null : Date.now() + PROMO_MS
        });
        F.toast(id === 'free' ? 'رجعت للباقة المجانية' : 'تم! 3 أشهر مجانية على هذي الباقة', 'ok');
        render();
      };
    });
  }

  F.packages = { show: render };
})();

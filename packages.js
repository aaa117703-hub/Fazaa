/* سند جايك — الباقات (4 مستويات). لا دفع إلكتروني حالياً؛ الترقية عن طريق الإدارة. */
(function () {
  'use strict';
  const F = window.F;
  let mine = null;

  async function render() {
    const el = F.$('#v-packages');
    if (!F.isGuest()) { try { const r = await F.sb.q('cranes', 'select=id,tier,sub_expires_at&owner_id=eq.' + F.sb.uid() + '&limit=1'); mine = r && r[0] || null; } catch (e) { mine = null; } } else mine = null;
    const c = mine;
    const cur = c ? F.effTier(c) : null;

    el.innerHTML =
      '<h1>' + F.icon('gem') + ' الباقات</h1>' +
      '<p class="lead">للسائقين فقط. الزبون يستخدم سند جايك مجاناً دائماً.</p>' +
      '<div class="promo">' + F.icon('gift') + ' كل باقة مدفوعة تعطيك إطاراً مميزاً حول صورتك، وترتيباً أعلى، وثقة أكبر عند الزبون.</div>' +
      '<div class="pkgs">' +
      F.TIERS.map((p) => {
        const current = cur === p.id;
        return (
          '<div class="card pkg tier-card tier-' + p.id + (current ? ' current' : '') + '">' +
            '<div class="tier-ring" style="--tc:' + p.color + '">' + F.icon('gem') + '</div>' +
            '<h2>' + p.name + (current ? ' <span class="badge amber">باقتك</span>' : '') + '</h2>' +
            '<div class="price">' + (p.price ? F.money(p.price) : 'مجاناً') + ' <small>' + p.unit + '</small></div>' +
            (p.price ? '<div class="muted small">سنوي: ' + F.money(p.price * 10) + ' (وفّر شهرين)</div>' : '') +
            '<ul>' + p.features.map((f) => '<li>' + f.t + '</li>').join('') + '</ul>' +
            (c
              ? '<button class="btn block ' + (current ? 'secondary' : '') + '" data-pkg="' + p.id + '"' + (current ? ' disabled' : '') + '>' +
                (current ? 'باقتك الحالية' : (p.price ? 'اطلب هذه الباقة' : 'المجانية')) + '</button>'
              : '<a class="btn block ghost" href="#driver">سجّل كسائق أول</a>') +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<p class="muted small mt">لا يوجد دفع إلكتروني حالياً. الاشتراك يُفعّل من الإدارة بعد التواصل معك.</p>';

    F.$$('[data-pkg]', el).forEach((b) => {
      b.onclick = () => F.toast(b.dataset.pkg === 'bronze' ? 'أنت على المجاني حالياً.' : 'تم تسجيل رغبتك. الإدارة تتواصل وياك لتفعيل الباقة.');
    });
  }

  F.packages = { show: render };
})();

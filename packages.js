/* سند جايك — العضوية (4 مستويات). الدفع يدوي: السائق يتواصل واتساب والإدارة تفعّل. */
(function () {
  'use strict';
  const F = window.F;
  let mine = null;

  const ROWS = [
    ['نطاق استلام الطلبات', (t) => t.radius + ' كم'],
    ['أولوية وصول الطلب', (t, i) => ['عادية', 'قبل الأساسي', 'عالية', 'الأعلى'][i]],
    ['حجم الدبوس على الخريطة', (t, i) => ['عادي', 'عادي', 'كبير', 'الأكبر'][i]],
    ['قسم «الموصى بهم»', (t, i) => i >= 2 ? '✓' : '—'],
    ['إحصائيات أسبوعية', (t, i) => i >= 1 ? '✓' : '—'],
    ['عدد الكرينات بالحساب', (t) => String(t.fleet)]
  ];

  async function render() {
    const el = F.$('#v-packages');
    if (!F.isGuest()) { try { const r = await F.sb.q('cranes', 'select=id,tier,sub_expires_at&owner_id=eq.' + F.sb.uid() + '&limit=1'); mine = r && r[0] || null; } catch (e) { mine = null; } } else mine = null;
    const c = mine;
    const cur = c ? F.effTier(c) : null;

    el.innerHTML =
      '<h1>' + F.icon('gem') + ' العضوية</h1>' +
      '<p class="lead">للسائقين فقط. الزبون يستخدم سند جايك مجاناً دائماً.</p>' +
      '<div class="promo">' + F.icon('gift') + ' كل ترقية تعطيك طلبات أكثر وظهور أكبر. وشارة «موثق» مجانية لكل سائق يرفع وثائقه.</div>' +
      '<div class="pkgs ladder">' +
      F.TIERS.map((p, i) => {
        const current = cur === p.id;
        return (
          '<div class="card pkg tier-card tier-' + p.id + (current ? ' current' : '') + '" style="--tc:' + p.color + ';--i:' + i + '">' +
            '<div class="tier-top"><div class="tier-ring">' + F.icon('gem') + '</div><div><h2>' + p.name + (current ? ' <span class="badge amber">عضويتك</span>' : '') + '</h2><div class="muted small">' + p.tag + '</div></div></div>' +
            '<div class="price">' + (p.price ? F.money(p.price) : 'مجاناً') + ' <small>' + (p.price ? p.unit : '') + '</small></div>' +
            (p.price ? '<div class="muted small">سنوي: ' + F.money(p.price * 10) + ' (وفّر شهرين)</div>' : '') +
            '<ul>' + p.features.map((f) => '<li>' + f.t + '</li>').join('') + '</ul>' +
            (c
              ? '<button class="btn block ' + (current ? 'secondary' : '') + '" data-pkg="' + p.id + '"' + (current || !p.price ? ' disabled' : '') + '>' +
                (current ? 'عضويتك الحالية' : (p.price ? 'اطلب عبر واتساب' : 'المجانية')) + '</button>'
              : '<a class="btn block ghost" href="#driver">سجّل كسائق أول</a>') +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<h2 class="mt">مقارنة سريعة</h2>' +
      '<div class="card cmp-wrap"><table class="cmp"><thead><tr><th></th>' + F.TIERS.map((t) => '<th style="color:' + t.color + '">' + t.name + '</th>').join('') + '</tr></thead><tbody>' +
      ROWS.map((r) => '<tr><td>' + r[0] + '</td>' + F.TIERS.map((t, i) => '<td>' + r[1](t, i) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>' +
      '<p class="muted small mt">لا يوجد دفع إلكتروني. تواصل معنا عبر واتساب، وبعد الاتفاق تُفعّل الإدارة عضويتك.</p>';

    F.$$('[data-pkg]', el).forEach((b) => {
      b.onclick = () => {
        const t = F.tierOf(b.dataset.pkg);
        // نسجّل الطلب حتى تشوفه الإدارة (ما نمنع واتساب إذا فشل التسجيل)
        if (c && c.id) F.sb.q('subscription_requests', '', { method: 'POST', body: { crane_id: c.id, tier: b.dataset.pkg, period: 'monthly' } }).catch(() => {});
        F.contact.support('مرحباً، أريد الاشتراك بعضوية «' + t.name + '» بتطبيق سند جايك' + (c && c.id ? ' (رقم الكرين: ' + c.id + ')' : ''));
      };
    });
  }

  F.packages = { show: render };
})();

/* سند جايك — الملف العام للسائق (صورة، إطار الباقة، نجوم، آراء) */
(function () {
  'use strict';
  const F = window.F;
  const star = (n) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

  F.cprofile = {
    async show(id, c) {
      const m = F.modal('<p class="muted center">جاري التحميل…</p>');
      try {
        const p = await F.sb.rpc('crane_profile', { p_id: id });
        if (!p) { m.close(); return F.toast('الملف غير متاح', 'err'); }
        try { const k = 'v_' + id; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); F.sb.rpc('track_crane_view', { p_id: id }).catch(() => {}); } } catch (e) { }
        const t = F.tierOf(p.tier);
        const avg = p.rating_avg != null ? +p.rating_avg : null;
        const since = p.since ? new Date(p.since).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' }) : '';
        m.el.innerHTML =
          '<div class="cp">' +
            '<div class="pf-ava big' + (p.verified ? ' ver' : '') + '">' + (p.avatar ? '<img src="' + F.esc(F.sb.avatarUrl(p.avatar)) + '" alt="">' : F.icon('crane')) + '</div>' +
            '<h2>' + F.esc(p.name) + '</h2>' +
            '<div class="cp-badges">' + (p.verified ? '<span class="badge green">موثق</span> ' : '') + '<span class="badge tier-b-' + p.tier + '">' + t.name + '</span></div>' +
            '<div class="muted">' + F.esc(p.type) + (p.governorate ? ' · ' + F.esc(p.governorate) : '') + '</div>' +
            '<div class="cp-stats">' +
              '<div><b class="stars">' + (avg != null ? '★ ' + avg.toFixed(1) : '—') + '</b><span>' + (p.rating_count ? p.rating_count + ' تقييم' : 'بدون تقييم') + '</span></div>' +
              '<div><b>' + (p.jobs || 0) + '</b><span>طلب منتهي</span></div>' +
              (since ? '<div><b style="font-size:13px">' + since + '</b><span>انضم</span></div>' : '') +
            '</div>' +
            (p.reviews && p.reviews.length ? '<div class="cp-rev"><h3>آراء الزبائن</h3>' + p.reviews.map((r) => '<div class="rv"><span class="stars">' + star(r.stars) + '</span><p>' + F.esc(r.comment) + '</p></div>').join('') + '</div>' : '') +
            '<button class="btn block mt" id="cp-x">إغلاق</button>' +
          '</div>';
        F.$('#cp-x', m.el).onclick = m.close;
      } catch (e) { m.close(); F.toast(F.errMsg(e), 'err'); }
    }
  };
})();

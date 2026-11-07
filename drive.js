/* سند جايك — مسافة ووقت الطريق الحقيقي (مو خط مستقيم) + حماية من اختيار كرين بعيد.
 * مزوّدات المسار المجانية (للتجربة). عند الفشل نقدّر بالمسافة المستقيمة × 1.35.
 */
(function () {
  'use strict';
  const F = window.F;
  const BASES = ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car'];
  const FAR_MIN = 40, FAR_KM = 40;   // أبعد من هذا نحذّر الزبون
  const cache = new Map();           // id -> {km, min, approx, at}
  const TTL = 4 * 60000;

  const est = (a, b) => { const d = F.dist(a, b) * 1.35; return { km: d, min: Math.max(1, Math.round(d / 40 * 60)), approx: true, at: Date.now() }; };

  async function tryBase(base, from, list) {
    const coords = [from].concat(list).map((p) => p.lng.toFixed(5) + ',' + p.lat.toFixed(5)).join(';');
    const dst = list.map((_, i) => i + 1).join(';');
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 7000);
    try {
      const r = await fetch(base + '/table/v1/driving/' + coords + '?sources=0&destinations=' + dst + '&annotations=duration,distance', { signal: ctrl.signal });
      const j = await r.json();
      if (!j.durations || !j.durations[0]) throw new Error('bad');
      return list.map((_, i) => ({ km: (j.distances[0][i] || 0) / 1000, min: Math.max(1, Math.round((j.durations[0][i] || 0) / 60)), approx: false, at: Date.now() }));
    } finally { clearTimeout(t); }
  }

  // يحسب الطريق الحقيقي لأقرب N كرين (طلب واحد). يرجع true إذا تغيّر شي.
  async function enrich(list, from, n) {
    if (!from || from.source === 'default') return false;
    const pick = list.filter((c) => c.status === 'available').slice(0, n || 10);
    const need = pick.filter((c) => { const x = cache.get(c.id); return !x || Date.now() - x.at > TTL; });
    if (!need.length) return false;
    let res = null;
    for (const b of BASES) { try { res = await tryBase(b, from, need); break; } catch (e) { /* التالي */ } }
    need.forEach((c, i) => cache.set(c.id, res ? res[i] : est(from, c)));
    return true;
  }

  const get = (id) => cache.get(id) || null;
  const far = (id) => { const x = cache.get(id); return !!x && (x.min > FAR_MIN || x.km > FAR_KM); };
  const label = (x) => (x.approx ? '≈ ' : '') + x.km.toFixed(1) + ' كم · ' + x.min + ' د';

  // قبل ما الزبون يكمّل مع كرين بعيد: نعرض له البدائل الأقرب داخل التطبيق
  function guard(c, list, proceed, pick) {
    const x = get(c.id);
    if (!x || !far(c.id)) return proceed();
    const alts = list.filter((o) => o.id !== c.id && o.status === 'available' && get(o.id) && get(o.id).min < x.min - 5).sort((a, b) => get(a.id).min - get(b.id).min).slice(0, 3);
    const m = F.modal(
      '<h2>' + F.icon('alert') + ' هذا الكرين بعيد</h2>' +
      '<p>' + F.esc(c.name) + ' يبعد <b>' + label(x) + '</b> على الطريق.</p>' +
      (alts.length ? '<p class="muted small">كرينات أقرب إلك:</p><div class="stack">' + alts.map((o) => '<button class="btn secondary block" data-alt="' + F.esc(o.id) + '">' + F.esc(o.name) + ' — ' + label(get(o.id)) + '</button>').join('') + '</div>' : '<p class="muted small">ما كو كرين أقرب حالياً. تقدر تكمل، أو ترسل طلب لأقرب الكرينات.</p>') +
      '<div class="row mt"><button class="btn grow" id="dg-go">كمّل مع هذا</button><button class="btn secondary" id="dg-x">إلغاء</button></div>');
    F.$('#dg-x', m.el).onclick = m.close;
    F.$('#dg-go', m.el).onclick = () => { m.close(); proceed(); };
    F.$$('[data-alt]', m.el).forEach((b) => { b.onclick = () => { m.close(); pick(b.dataset.alt); }; });
  }

  F.drive = { enrich: enrich, get: get, far: far, label: label, guard: guard, BASES: BASES };
})();

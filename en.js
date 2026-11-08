/* سند جايك — اللغة الإنجليزية. نترجم النصوص العربية بالواجهة عند ظهورها (نفس فكرة lang.js). */
(function () {
  'use strict';
  const F = window.F;
  if (F.lang !== 'en') return;
  const root = document.documentElement;
  root.lang = 'en'; root.dir = 'ltr'; root.classList.add('is-en');

  const D = F.EN_DICT || {};
  const AR = /[؀-ۿ]/;
  // مفاتيح قصيرة (حرف أو حرفين) نطابقها كاملة فقط حتى ما نخرّب كلمات
  const exact = {};
  Object.keys(D).forEach((k) => { exact[k.trim()] = D[k].trim(); });
  // عبارات داخل جمل ديناميكية (أرقام/أسماء بينها): نستبدل فقط عبارة طويلة بحدود كلمة كاملة
  const keys = Object.keys(exact).filter((k) => k.length >= 5 && AR.test(k)).sort((a, b) => b.length - a.length);
  const L = /[؀-ۿ]/;
  function sub(s) {
    let o = s;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      let at = o.indexOf(k);
      while (at > -1) {
        const before = o[at - 1], after = o[at + k.length];
        if (!(before && L.test(before)) && !(after && L.test(after))) { o = o.slice(0, at) + exact[k] + o.slice(at + k.length); at = o.indexOf(k, at + exact[k].length); }
        else at = o.indexOf(k, at + 1);
      }
      if (!AR.test(o)) break;
    }
    return o;
  }
  function tr(s) {
    if (!AR.test(s)) return s;
    const t = s.trim();
    if (exact[t] !== undefined) return s.replace(t, exact[t]);
    return sub(s);
  }
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  function walk(n) {
    if (n.nodeType === 3) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; return; }
    if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.tagName)) return;
    ATTRS.forEach((a) => { if (n.hasAttribute(a)) { const v = tr(n.getAttribute(a)); if (v !== n.getAttribute(a)) n.setAttribute(a, v); } });
    n.childNodes.forEach(walk);
  }
  F.tr = tr;
  document.title = tr(document.title);
  walk(document.body);
  new MutationObserver((ms) => {
    ms.forEach((m) => {
      if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes') walk(m.target);
      else m.addedNodes.forEach(walk);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
})();

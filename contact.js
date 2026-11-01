/* سند جايك — الاتصال بالسائق: اتصال فوري، واتساب مع موقعك، ومتابعة بعد المكالمة */
(function () {
  'use strict';
  const F = window.F;

  const LK = 'sanad_last_call';
  const phones = {}; // crane_id -> رقم (كاش حتى يصير الاتصال فورياً)
  let busy = false;

  async function phoneOf(id) {
    if (phones[id]) return phones[id];
    const r = await F.sb.q('crane_contacts', 'select=phone&crane_id=eq.' + encodeURIComponent(id));
    const p = r && r[0] && r[0].phone;
    if (p) phones[id] = p;
    return p || '';
  }

  // 07701234567 / +964770... / 00964770... → 964770...
  function waNumber(p) {
    let d = String(p || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.indexOf('964') === 0) return d;
    if (d.charAt(0) === '0') d = d.slice(1);
    return '964' + d;
  }

  // رسالة جاهزة للسائق، وفيها موقعك إذا معروف بدقة
  function message() {
    const l = F.loc();
    const where = (l.source === 'gps' || l.source === 'manual')
      ? '\nموقعي: https://maps.google.com/?q=' + l.lat.toFixed(6) + ',' + l.lng.toFixed(6) : '';
    return 'السلام عليكم، سيارتي تعطلت وأحتاج كرين.' + where + '\n(من تطبيق سند جايك)';
  }
  const waLink = (phone) => 'https://wa.me/' + waNumber(phone) + '?text=' + encodeURIComponent(message());

  function remember(id, name) {
    try { localStorage.setItem(LK, JSON.stringify({ id: id, name: name || '', at: Date.now() })); } catch (e) {}
  }

  // how: 'tel' | 'wa'
  async function open(c, how) {
    if (!c || busy) return;
    if (F.isGuest()) return F.requireLogin('أرقام الكرينات تظهر للمسجّلين فقط، حتى نحمي السائقين من الإزعاج.');
    if (c.demo) return F.toast('هذا كرين تجريبي، ما عنده رقم حقيقي.');
    busy = true;
    try {
      const phone = await phoneOf(c.id);
      if (!phone) { F.toast('ما لكينا رقم هذا الكرين.', 'err'); return; }
      F.sb.q('calls', '', { method: 'POST', body: { crane_id: c.id, user_id: F.sb.uid() } }).catch(() => {});
      remember(c.id, c.name);
      window.location.href = how === 'wa' ? waLink(phone) : 'tel:' + phone;
    } catch (e) { F.toast(F.errMsg(e), 'err'); }
    finally { setTimeout(() => { busy = false; }, 800); }
  }

  // نجلب أرقام أقرب الكرينات مسبقاً، فيصير الاتصال فورياً بدون انتظار
  function warm(list) {
    if (F.isGuest()) return;
    (list || []).filter((c) => !c.demo && c.status === 'available').slice(0, 3).forEach((c) => { phoneOf(c.id).catch(() => {}); });
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); F.toast('تم نسخ الرقم', 'ok'); }
    catch (e) { F.toast('الرقم: ' + text); }
  }

  // لما يرجع الزبون للتطبيق بعد المكالمة: نسأله كيف راحت، وإذا ما رد السائق نعرض عليه طلب لأقرب 3 كرينات
  function followUp() {
    let last = null;
    try { last = JSON.parse(localStorage.getItem(LK)); } catch (e) {}
    if (!last) return;
    const age = Date.now() - last.at;
    if (age < 4000) return;                       // لسه ما طلع من التطبيق
    try { localStorage.removeItem(LK); } catch (e) {}
    if (age > 30 * 60 * 1000) return;             // قديمة
    const m = F.modal(
      '<h2>' + F.icon('phone') + ' كيف راحت المكالمة؟</h2>' +
      '<p class="muted">' + (last.name ? 'مع ' + F.esc(last.name) + '. ' : '') + 'إذا ما رد، نرسل طلبك لأقرب 3 كرينات مرة وحدة.</p>' +
      '<div class="stack mt">' +
        '<button class="btn green block" id="fu-ok">رد وتفاهمنا</button>' +
        '<button class="btn block" id="fu-no">ما رد — أرسل طلب لغيره</button>' +
        '<button class="btn ghost block" id="fu-later">لاحقاً</button>' +
      '</div>'
    );
    F.$('#fu-ok', m.el).onclick = () => { m.close(); F.toast('الله يوفقك، سلامتك', 'ok'); };
    F.$('#fu-later', m.el).onclick = m.close;
    F.$('#fu-no', m.el).onclick = () => { m.close(); if (F.request) F.request.start(); };
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !F.isGuest()) setTimeout(followUp, 400); });

  F.contact = {
    call: (c) => open(c, 'tel'),
    whatsapp: (c) => open(c, 'wa'),
    phoneOf: phoneOf,
    waLink: waLink,
    remember: remember,
    warm: warm,
    copy: copy,
    followUp: followUp
  };
})();

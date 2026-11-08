/* سند جايك — حسّ التطبيق الحقيقي: إشعارات، اهتزاز لمس، سحب للتحديث، تثبيت، شارة */
(function () {
  'use strict';
  const F = window.F;
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true || !!window.Capacitor;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  function haptic(ms) { try { navigator.vibrate && navigator.vibrate(ms || 8); } catch (e) {} }

  // إشعار محلي عند تغيّر حالة الطلب والتطبيق بالخلفية (يكمّل إشعار السيرفر، نفس الـ tag يمنع التكرار)
  async function notify(title, body, url, tag) {
    haptic([200, 100, 200]);
    try {
      if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body: body, icon: './icon-192.png', badge: './icon-192.png', tag: tag, dir: 'rtl', lang: 'ar', vibrate: [200, 100, 200], data: { url: url || './#home' } });
    } catch (e) {}
  }

  // شارة على أيقونة التطبيق (عدد الطلبات الواردة للسائق)
  function badge(n) {
    try {
      if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(n);
      else if (navigator.clearAppBadge) navigator.clearAppBadge();
    } catch (e) {}
  }

  // ———— ورقة سفلية (طلب الإشعارات / التثبيت)
  function sheet(icon, title, text, okTxt, onOk, key) {
    if (document.getElementById('nsheet')) return;
    const s = document.createElement('div');
    s.id = 'nsheet'; s.setAttribute('role', 'dialog');
    s.innerHTML = '<div class="ns-ic">' + F.icon(icon) + '</div><div class="ns-tx"><b>' + title + '</b><span>' + text + '</span></div>' +
      '<div class="ns-bt">' + (okTxt ? '<button class="btn sm" id="ns-ok">' + okTxt + '</button>' : '') + '<button class="btn sm secondary" id="ns-no">لاحقاً</button></div>';
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add('in'));
    const close = (snooze) => { if (snooze) store.set(key, String(Date.now())); s.classList.remove('in'); setTimeout(() => s.remove(), 300); };
    s.querySelector('#ns-no').onclick = () => close(true);
    const ok = s.querySelector('#ns-ok');
    if (ok) ok.onclick = async () => { close(false); try { await onOk(); } catch (e) { F.toast(F.errMsg ? F.errMsg(e) : 'تعذّر', 'err'); } };
  }
  const snoozed = (k, days) => { const t = +store.get(k) || 0; return Date.now() - t < days * 86400000; };

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; });

  async function onReady() {
    try {
      if (/[?&]sos=1/.test(location.search) && F.guide && F.guide.sos) { history.replaceState(null, '', location.pathname + location.hash); setTimeout(F.guide.sos, 600); }
      if (!F.push || F.isGuest()) return;
      // إذا الإذن ممنوح من قبل نتأكد الاشتراك شغّال (يتجدد بهدوء)
      if (F.push.supported() && Notification.permission === 'granted') {
        if (!(await F.push.enabled())) F.push.enable().catch(() => {});
        return;
      }
      setTimeout(() => {
        if (F.push.supported() && Notification.permission === 'default' && !snoozed('sanad_ask_push', 3)) {
          sheet('bell', 'فعّل الإشعارات', 'حتى توصلك لحظة قبول طلبك أو وصول طلب جديد، حتى لو التطبيق مسكّر.', 'تفعيل', async () => { await F.push.enable(); F.toast('تم تفعيل الإشعارات', 'ok'); }, 'sanad_ask_push');
        } else if (!standalone() && !snoozed('sanad_ask_install', 7)) {
          if (deferred) sheet('download', 'ثبّت التطبيق', 'أضفه لشاشتك الرئيسية ويفتح كتطبيق كامل بدون شريط المتصفح.', 'تثبيت', async () => { deferred.prompt(); await deferred.userChoice; deferred = null; }, 'sanad_ask_install');
          else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) sheet('download', 'ثبّت التطبيق', 'اضغط زر المشاركة بالأسفل ثم «إضافة إلى الشاشة الرئيسية». بعدها تقدر تفعّل الإشعارات.', '', null, 'sanad_ask_install');
        }
      }, 6000);
    } catch (e) {}
  }

  // ———— سحب للتحديث
  function ptr() {
    let y0 = null, d = 0, el = null;
    const ind = () => { if (!el) { el = document.createElement('div'); el.id = 'ptr'; el.innerHTML = F.icon('refresh') || '↻'; document.body.appendChild(el); } return el; };
    const blocked = (t) => t.closest && t.closest('.maplibregl-map, #modal-root, input, textarea, select, #auth, #nsheet');
    document.addEventListener('touchstart', (e) => {
      y0 = (window.scrollY <= 0 && e.touches.length === 1 && !blocked(e.target) && !document.getElementById('modal-root').childElementCount) ? e.touches[0].clientY : null; d = 0;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      d = e.touches[0].clientY - y0;
      if (d <= 0) { ind().style.transform = 'translate(-50%,-60px)'; return; }
      const n = ind(); n.style.transition = 'none';
      n.style.transform = 'translate(-50%,' + (Math.min(d, 110) * .8 - 50) + 'px) rotate(' + (d * 3) + 'deg)';
      n.classList.toggle('ready', d > 80);
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (y0 == null || !el) { y0 = null; return; }
      el.style.transition = '';
      if (d > 80) {
        haptic(12); el.classList.add('spin'); el.style.transform = 'translate(-50%,24px)';
        try { if (F.home && F.home.refresh) F.home.refresh(); if (F.home && F.home.reloadShops) F.home.reloadShops(); window.dispatchEvent(new Event('sanad-refresh')); } catch (e) {}
        setTimeout(() => { el.classList.remove('spin', 'ready'); el.style.transform = 'translate(-50%,-60px)'; }, 900);
      } else el.style.transform = 'translate(-50%,-60px)';
      y0 = null;
    }, { passive: true });
  }

  // اهتزاز خفيف عند لمس الأزرار
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('button, .btn, [data-nav], .chip, a.card')) haptic(7);
  }, { passive: true });

  ptr();
  F.native = { notify: notify, haptic: haptic, badge: badge, onReady: onReady, standalone: standalone };
})();

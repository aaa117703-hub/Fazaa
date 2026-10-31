/* سند جايك — إشعارات الدفع (Web Push). تعمل بالأندرويد والكمبيوتر، وبالآيفون بعد «إضافة للشاشة الرئيسية». */
(function () {
  'use strict';
  const F = window.F;

  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const b64ToU8 = (s) => {
    const p = '='.repeat((4 - (s.length % 4)) % 4), b = (s + p).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  };

  async function current() {
    if (!supported()) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }

  async function enabled() {
    try { return !!(await current()) && Notification.permission === 'granted'; } catch (e) { return false; }
  }

  async function enable() {
    if (!supported()) throw new Error('هذا الجهاز أو المتصفح ما يدعم الإشعارات. على الآيفون: أضف التطبيق للشاشة الرئيسية أول.');
    if (F.isGuest()) throw new Error('سجّل دخول أول.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('ما أعطيت إذن الإشعارات. فعّله من إعدادات المتصفح.');
    const reg = await navigator.serviceWorker.ready;
    const k = await F.sb.fn('notify', { kind: 'vapid' });
    if (!k.publicKey) throw new Error('تعذّر تجهيز الإشعارات. جرّب بعد شوية.');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(k.publicKey) });
    const j = sub.toJSON();
    await F.sb.q('push_subscriptions', 'on_conflict=endpoint', {
      method: 'POST', prefer: 'resolution=merge-duplicates',
      body: { user_id: F.sb.uid(), endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }
    });
    return true;
  }

  async function disable() {
    const sub = await current();
    if (sub) {
      try { await F.sb.q('push_subscriptions', 'endpoint=eq.' + encodeURIComponent(sub.endpoint), { method: 'DELETE' }); } catch (e) {}
      await sub.unsubscribe();
    }
  }

  F.push = { supported: supported, enabled: enabled, enable: enable, disable: disable };
})();

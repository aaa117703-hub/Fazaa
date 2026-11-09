/* سند جايك — نافذة التحديث الداخلي: ما الجديد + نصائح تتبدّل باللمس + شريط 1→100% مع رسم هندسي تفاعلي */
(function () {
  'use strict';
  var F = window.F = window.F || {};
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  var CSS = '' +
    '#upd{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;padding:18px;background:rgba(6,8,10,.72);opacity:0;transition:opacity .25s}#upd.on{opacity:1}' +
    '.upd-card{width:min(92vw,400px);max-height:92vh;overflow:auto;border-radius:24px;padding:20px 18px 16px;background:linear-gradient(160deg,#1d2126,#14171a);border:1px solid rgba(255,138,61,.35);box-shadow:0 30px 70px -20px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.04) inset;color:#fff;font-family:"Noto Kufi Arabic","Tajawal",sans-serif;text-align:start;transform:translateY(14px) scale(.97);transition:transform .3s cubic-bezier(.2,1.2,.4,1)}#upd.on .upd-card{transform:none}' +
    '.upd-badge{display:inline-block;padding:4px 12px;border-radius:99px;background:rgba(255,107,44,.16);color:#FF9A55;font-size:12.5px;font-weight:700}' +
    '.upd-card h3{margin:10px 0 12px;font-size:19px;font-weight:700}' +
    '.upd-new{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);margin-bottom:12px}.upd-new b{display:block;color:#FF9A55;font-size:13px;margin-bottom:6px}' +
    '.upd-new ul{margin:0;padding:0;list-style:none}.upd-new li{position:relative;padding-inline-start:18px;font-size:14.5px;line-height:1.9}.upd-new li::before{content:"";position:absolute;inset-inline-start:2px;top:.85em;width:7px;height:7px;background:#FF6B2C;transform:rotate(45deg)}' +
    '.upd-tip{display:flex;gap:12px;align-items:center;width:100%;text-align:start;padding:12px 14px;border-radius:16px;border:1px solid rgba(255,138,61,.3);border-inline-start:4px solid #FF6B2C;background:linear-gradient(135deg,rgba(255,107,44,.14),rgba(255,255,255,.03));color:#fff;font:inherit;cursor:pointer;margin-bottom:14px}' +
    '.upd-tip svg{flex:none;width:26px;height:26px;color:#FF8A3D}.upd-tip span{display:block;font-size:14.5px;line-height:1.8;font-weight:600}.upd-tip small{display:block;margin-top:2px;color:#9AA3AF;font-size:11.5px;font-weight:500}.upd-tip.sw span{animation:upd-sw .35s ease}' +
    '@keyframes upd-sw{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '.upd-btns{display:flex;gap:10px}.upd-btns button{flex:1;height:50px;border-radius:15px;border:0;font:inherit;font-size:16px;font-weight:700;cursor:pointer}' +
    '.upd-go{background:linear-gradient(135deg,#FF8A3D,#F0541C);color:#fff;box-shadow:0 10px 22px -8px rgba(255,107,44,.7)}.upd-later{flex:.6!important;background:rgba(255,255,255,.07);color:#C9CED6}' +
    '.upd-b{text-align:center}.upd-cv{display:block;width:100%;height:230px;border-radius:18px;background:#101316;touch-action:none}' +
    '.upd-pct{margin:12px 0 8px;font-family:"Changa",sans-serif;font-size:44px;font-weight:800;line-height:1;direction:ltr}.upd-pct small{font-size:22px;color:#FF9A55;margin-inline-start:2px}' +
    '.upd-bar{height:10px;border-radius:9px;background:rgba(255,255,255,.09);overflow:hidden;direction:ltr}.upd-bar i{display:block;height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#FF6B2C,#FFB36B)}' +
    '.upd-msg{margin-top:10px;font-size:13.5px;color:#9AA3AF}';

  var reg = null, nw = null, ready = false, opened = false, started = false, real = 0, reloading = false, inited = false;
  var el, raf = 0;

  function later() { try { return sessionStorage.getItem('sanad_upd_later') === '1'; } catch (e) { return false; } }
  function $(s) { return el.querySelector(s); }

  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'sw-progress' && e.data.total) real = e.data.done / e.data.total;
  });
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (started && !reloading) { reloading = true; location.reload(); }
  });

  function watch(w) {
    if (!w) return;
    if (w.state === 'installed') ready = true;
    w.addEventListener('statechange', function () { if (w.state === 'installed') ready = true; });
  }

  function nextTip() {
    var t = F.TIPS || [], box = $('.upd-tip span'); if (!t.length) return;
    var i = Math.floor(Math.random() * t.length);
    box.textContent = t[i];
    var b = $('.upd-tip'); b.classList.remove('sw'); void b.offsetWidth; b.classList.add('sw');
    try { if (F.native && F.native.haptic) F.native.haptic(6); } catch (e) { }
  }

  function open() {
    if (opened || later()) return;
    opened = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'upd'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="upd-card"><div class="upd-a">' +
      '<span class="upd-badge">تحديث جديد</span><h3>نسخة أحسن جاهزة لك</h3>' +
      '<div class="upd-new"><b>ما الجديد</b><ul id="upd-notes"><li>تحسينات وإصلاحات لتجربة أسرع وأثبت</li></ul></div>' +
      '<button class="upd-tip" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/><path d="M9.8 20.5h4.4"/></svg><div><span></span><small>المس النصيحة لتطلع غيرها</small></div></button>' +
      '<div class="upd-btns"><button type="button" class="upd-go">تحديث</button><button type="button" class="upd-later">لاحقاً</button></div></div>' +
      '<div class="upd-b" hidden><canvas class="upd-cv"></canvas><div class="upd-pct"><span id="upd-n">0</span><small>%</small></div><div class="upd-bar"><i id="upd-f"></i></div><div class="upd-msg" id="upd-m">جاري التحديث… لا تسكّر التطبيق</div></div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('on'); });
    nextTip();
    $('.upd-tip').onclick = nextTip;
    $('.upd-later').onclick = function () { try { sessionStorage.setItem('sanad_upd_later', '1'); } catch (e) { } close(); };
    $('.upd-go').onclick = go;
    fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.notes && j.notes.length) $('#upd-notes').innerHTML = j.notes.slice(0, 4).map(function (n) { return '<li>' + String(n).replace(/[<>&]/g, '') + '</li>'; }).join('');
    }).catch(function () { });
  }

  function close() {
    cancelAnimationFrame(raf);
    el.classList.remove('on');
    setTimeout(function () { el.remove(); opened = false; }, 260);
  }

  /* رسم هندسي تفاعلي: شبكة نقاط تتحرك وتتجاوب مع اللمس + سداسي يمتلئ حسب النسبة */
  function art(getP) {
    var cv = $('.upd-cv'), ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    var N = 30, nodes = [], ptr = null, rings = [];
    for (var i = 0; i < N; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5, s: 2 + Math.random() * 2.5, o: Math.random() < .35 });
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener('pointerdown', function (e) { ptr = pos(e); rings.push({ x: ptr.x, y: ptr.y, r: 4, a: .9 }); });
    cv.addEventListener('pointermove', function (e) { if (e.pressure > 0 || e.pointerType === 'mouse') ptr = pos(e); });
    cv.addEventListener('pointerup', function () { ptr = null; });
    cv.addEventListener('pointerleave', function () { ptr = null; });
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, t = 0;
    var cx = W / 2, cy = H / 2, R = 52, hex = [];
    for (var k = 0; k <= 6; k++) { var a = -Math.PI / 2 + k * Math.PI / 3; hex.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    function frame() {
      t += .016; ctx.clearRect(0, 0, W, H);
      var p = getP();
      nodes.forEach(function (n) {
        if (ptr) { var dx = n.x - ptr.x, dy = n.y - ptr.y, d = Math.hypot(dx, dy); if (d < 90 && d > 1) { n.vx += dx / d * .35; n.vy += dy / d * .35; } }
        n.vx *= .985; n.vy *= .985; if (Math.abs(n.vx) < .12) n.vx += (Math.random() - .5) * .02; if (Math.abs(n.vy) < .12) n.vy += (Math.random() - .5) * .02;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1;
      });
      for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
        var d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < 85) { ctx.strokeStyle = 'rgba(255,138,61,' + (1 - d / 85) * .35 + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); }
      }
      nodes.forEach(function (n) { ctx.fillStyle = n.o ? '#FF6B2C' : 'rgba(255,255,255,.75)'; ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(t + n.s); ctx.fillRect(-n.s, -n.s, n.s * 2, n.s * 2); ctx.restore(); });
      rings = rings.filter(function (r) { r.r += 2.6; r.a -= .025; if (r.a <= 0) return false; ctx.strokeStyle = 'rgba(255,138,61,' + r.a + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.3); ctx.stroke(); return true; });
      /* السداسي: المسار الباهت كامل، والبرتقالي يمتلئ حسب النسبة */
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 6; ctx.beginPath(); hex.forEach(function (h, i) { i ? ctx.lineTo(h[0], h[1]) : ctx.moveTo(h[0], h[1]); }); ctx.stroke();
      var tot = 6 * R, run = p * tot; ctx.strokeStyle = '#FF6B2C'; ctx.beginPath(); ctx.moveTo(hex[0][0], hex[0][1]);
      for (var s = 0; s < 6 && run > 0; s++) { var f = Math.min(1, run / R); ctx.lineTo(hex[s][0] + (hex[s + 1][0] - hex[s][0]) * f, hex[s][1] + (hex[s + 1][1] - hex[s][1]) * f); run -= R; }
      ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(reduce ? 0 : t * .6); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var q = 0; q < 3; q++) { var aa = q * 2.094; ctx[q ? 'lineTo' : 'moveTo'](Math.cos(aa) * 26, Math.sin(aa) * 26); } ctx.closePath(); ctx.stroke(); ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    frame();
  }

  function go() {
    started = true;
    $('.upd-a').hidden = true; $('.upd-b').hidden = false;
    var t0 = Date.now(), disp = 0, done = false;
    art(function () { return disp; });
    (function tick() {
      if (reloading) return;
      var el_s = (Date.now() - t0) / 1000;
      var target = Math.min(.92, Math.max(real * .9, el_s / 4 * .9));
      if (ready) target = el_s >= 3.4 ? 1 : Math.max(target, Math.min(.97, el_s / 3.4));
      disp += (target - disp) * .07; if (target === 1 && disp > .994) disp = 1;
      var pct = Math.round(disp * 100);
      $('#upd-n').textContent = pct; $('#upd-f').style.width = pct + '%';
      if (disp >= 1 && !done) {
        done = true; $('#upd-m').textContent = 'تم التحديث ✓ جاري إعادة التشغيل';
        var w = (reg && reg.waiting) || nw;
        setTimeout(function () { if (w) w.postMessage({ type: 'SKIP_WAITING' }); setTimeout(function () { if (!reloading) { reloading = true; location.reload(); } }, 3000); }, 450);
      }
      if (el_s > 30 && !ready) { $('#upd-m').textContent = 'تعذّر التحديث الآن، جرّب لاحقاً'; setTimeout(function () { started = false; close(); }, 1800); return; }
      setTimeout(tick, 33);
    })();
  }

  function init() {
    if (inited) return; inited = true;
    navigator.serviceWorker.getRegistration().then(function (r) {
      if (!r) return; reg = r;
      if (r.waiting && navigator.serviceWorker.controller) { nw = r.waiting; ready = true; open(); }
      r.addEventListener('updatefound', function () { nw = r.installing; watch(nw); if (navigator.serviceWorker.controller) open(); });
      r.update().catch(function () { });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) r.update().catch(function () { }); });
    }).catch(function () { });
  }
  F.checkUpdate = function () { if (reg) reg.update().catch(function () { }); };
  document.addEventListener('splash-out', function () { setTimeout(init, 700); }, { once: true });
  setTimeout(init, 7000);
})();

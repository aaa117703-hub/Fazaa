/* الجولة ثلاثية الأبعاد (لوكو سند جايك يتفكك مع السكرول) + شعار 3D على الرئيسية.
   بلا مكتبات: طبقات SVG مكدّسة بـ CSS 3D تعطي عمق حقيقي، وتشتغل بدون إنترنت. */
(function () {
  const F = window.F = window.F || {};
  const SEEN = 'sanad_story_v1';
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
  const reduce = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('reduce-motion');
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (t) => t * t * (3 - 2 * t);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  const mix = (c1, c2, t) => '#' + [0, 1, 2].map((i) => Math.round(lerp(parseInt(c1.substr(1 + i * 2, 2), 16), parseInt(c2.substr(1 + i * 2, 2), 16), t)).toString(16).padStart(2, '0')).join('');
  const ARCH = '<path d="M19 86V51a31 31 0 0 1 62 0V86" fill="none" stroke="@" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>';
  const DOT = '<circle cx="50" cy="40" r="6.5" fill="@"/>';
  const CHEV = '<path d="M35.5 73L50 57.5L64.5 73" fill="none" stroke="@" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>';
  const PIECES = [
    { k: 'arch', svg: ARCH, front: '#FF6B2C', back: '#6e2a10', n: 14 },
    { k: 'dot', svg: DOT, front: '#FF8A55', back: '#8a3a18', n: 8 },
    { k: 'chev', svg: CHEV, front: '#F5F5F0', back: '#77777a', n: 8 },
  ];

  // يبني شعاراً مكدّساً. size بالبكسل. depth = سماكة الطبقات بوحدات 100.
  function build(size, depth) {
    const root = document.createElement('div');
    root.className = 'l3d';
    root.style.setProperty('--s', size + 'px');
    const u = size / 100, parts = {};
    PIECES.forEach((p) => {
      const g = document.createElement('div');
      g.className = 'pc';
      const n = weak ? Math.max(4, Math.round(p.n / 2.5)) : p.n;
      let h = '';
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1);
        const z = (t - 0.5) * depth * u * (p.k === 'chev' ? 0.8 : 1);
        h += '<svg class="ly" viewBox="0 0 100 100" style="transform:translateZ(' + z.toFixed(2) + 'px)">' + p.svg.replace('@', mix(p.front, p.back, t)) + '</svg>';
      }
      g.innerHTML = h;
      root.appendChild(g);
      parts[p.k] = g;
    });
    return { el: root, parts, u };
  }
  function pose(parts, u, st) {
    ['arch', 'dot', 'chev'].forEach((k) => {
      const s = st[k];
      parts[k].style.transform = 'translate3d(' + (s[0] * u).toFixed(1) + 'px,' + (s[1] * u).toFixed(1) + 'px,' + (s[2] * u).toFixed(1) + 'px) rotateX(' + s[3].toFixed(1) + 'deg) rotateY(' + s[4].toFixed(1) + 'deg) rotateZ(' + s[5].toFixed(1) + 'deg) scale(' + s[6].toFixed(3) + ')';
      parts[k].style.opacity = s[7];
    });
  }
  const A = [0, 0, 0, 0, 0, 0, 1, 1];
  // مشاهد القصة: كل مرحلة تمهّد للي بعدها
  const STOPS = [
    { p: 0.00, rx: -8, ry: -35, sc: 0.9, arch: A, dot: A, chev: A },
    { p: 0.16, rx: -10, ry: 18, sc: 1, arch: A, dot: A, chev: A },
    { p: 0.38, rx: -18, ry: 0, sc: 0.95,
      arch: [0, 30, -20, 72, 0, 0, 1.25, 1], dot: [0, -46, 40, 0, 0, 0, 1.5, 1], chev: [-26, 34, 6, 72, 0, -18, 1, 1] },
    { p: 0.62, rx: -16, ry: 0, sc: 0.95,
      arch: [0, 30, -20, 72, 0, 0, 1.25, 1], dot: [0, -46, 40, 0, 0, 0, 1.5, 1], chev: [0, -22, 52, 0, 0, 0, 1.25, 1] },
    { p: 0.82, rx: -8, ry: 180, sc: 0.9,
      arch: [0, 0, 0, 0, 0, 0, 1.12, 1], dot: [0, 0, 0, 0, 0, 0, 1.12, 1], chev: [0, 0, 0, 0, 0, 0, 1.12, 1] },
    { p: 1.00, rx: -6, ry: 360, sc: 1.05, arch: A, dot: A, chev: A },
  ];
  function sample(p) {
    let i = 0;
    while (i < STOPS.length - 2 && p > STOPS[i + 1].p) i++;
    const a = STOPS[i], b = STOPS[i + 1];
    const t = sm(clamp((p - a.p) / (b.p - a.p), 0, 1));
    const mixv = (x, y) => x.map((v, j) => lerp(v, y[j], t));
    return { rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t), sc: lerp(a.sc, b.sc, t), arch: mixv(a.arch, b.arch), dot: mixv(a.dot, b.dot), chev: mixv(a.chev, b.chev) };
  }
  const CAPS = [
    { a: 0.00, b: 0.16, h: 'سند <b>جايك</b>', t: 'سندك بضغطة. اسحب لتحت وشوف شلون يشتغل.' },
    { a: 0.20, b: 0.38, h: 'الخريطة <b>تدلك</b>', t: 'القوس يصير طريق، وتشوف أقرب كرين لموقعك بالعراق كله.' },
    { a: 0.42, b: 0.62, h: 'اتصل <b>مباشرة</b>', t: 'السهم يوصل للكرين بدقيقة، ضغطة وحدة واتصال بدون وسيط.' },
    { a: 0.66, b: 0.80, h: 'وكرينك <b>يبرز</b>', t: 'للسائقين: باقات تطلّعك أول القائمة وتزيد طلباتك.' },
    { a: 0.86, b: 1.00, h: 'جاهز؟ <b>يلا</b>', t: 'سندك دايماً قريب منك.' },
  ];

  function openStory(force) {
    if (document.getElementById('story')) return;
    if (!force && reduce()) return;
    const el = document.createElement('div');
    el.id = 'story';
    el.setAttribute('dir', 'rtl');
    const size = Math.round(Math.min(window.innerWidth * 0.62, window.innerHeight * 0.34, 300));
    const lg = build(size, 20);
    el.innerHTML = '<div class="st-track"><div class="st-stage"><div class="st-bg"></div><div class="st-bar"></div>' +
      '<button class="st-skip" type="button">تخطّي</button>' +
      '<div class="st-world"><div class="st-floor"></div><div class="st-ring"></div></div>' +
      CAPS.map((c) => '<div class="st-cap"><h2>' + c.h + '</h2><p>' + c.t + '</p></div>').join('') +
      '<div class="st-hint">اسحب لتحت<i></i></div><button class="st-cta" type="button">ابدأ الآن</button></div></div>';
    document.body.appendChild(el);
    document.documentElement.style.overflow = 'hidden';
    const world = el.querySelector('.st-world');
    world.style.setProperty('--s', size + 'px');
    world.insertBefore(lg.el, world.firstChild);
    const floor = el.querySelector('.st-floor'), ring = el.querySelector('.st-ring'), bg = el.querySelector('.st-bg'), bar = el.querySelector('.st-bar');
    const caps = el.querySelectorAll('.st-cap'), hint = el.querySelector('.st-hint'), cta = el.querySelector('.st-cta');
    let raf = 0;
    const draw = () => {
      raf = 0;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? clamp(el.scrollTop / max, 0, 1) : 0;
      const s = sample(p);
      world.style.transform = 'rotateX(' + s.rx.toFixed(1) + 'deg) rotateY(' + s.ry.toFixed(1) + 'deg) scale(' + s.sc.toFixed(3) + ')';
      pose(lg.parts, lg.u, s);
      // الأرضية (الخريطة) تظهر بالمشهدين 2 و3
      const fl = sm(clamp((p - 0.18) / 0.14, 0, 1)) * (1 - sm(clamp((p - 0.7) / 0.1, 0, 1)));
      floor.style.opacity = fl.toFixed(2);
      floor.style.transform = 'translateY(' + (30 * lg.u).toFixed(0) + 'px) translateZ(' + (-20 * lg.u).toFixed(0) + 'px) rotateX(72deg)';
      // حلقة النبض حول النقطة (الكرين) بمشهد الاتصال
      const rr = sm(clamp((p - 0.4) / 0.1, 0, 1)) * (1 - sm(clamp((p - 0.66) / 0.08, 0, 1)));
      const ph = (performance.now() / 1100) % 1;
      ring.style.opacity = (rr * (1 - ph)).toFixed(2);
      ring.style.transform = 'translate3d(0,' + (-46 * lg.u).toFixed(0) + 'px,' + (40 * lg.u).toFixed(0) + 'px) scale(' + (0.5 + ph * 1.4).toFixed(2) + ')';
      // لون الخلفية يتغير مع المشهد
      const hue = p < 0.36 ? '255,107,44' : p < 0.64 ? '56,189,120' : p < 0.82 ? '245,185,66' : '255,107,44';
      bg.style.setProperty('--g', 'rgba(' + hue + ',.22)');
      caps.forEach((c, i) => {
        const d = CAPS[i];
        const inn = sm(clamp((p - d.a) / 0.035, 0, 1)), out = i === CAPS.length - 1 ? 0 : sm(clamp((p - d.b + 0.03) / 0.035, 0, 1));
        const o = inn * (1 - out);
        c.style.opacity = o.toFixed(2);
        c.style.transform = 'translateY(' + ((1 - o) * 14).toFixed(1) + 'px)';
      });
      hint.style.opacity = p < 0.04 ? 1 : 0;
      const ct = sm(clamp((p - 0.9) / 0.07, 0, 1));
      cta.style.opacity = ct.toFixed(2); cta.style.pointerEvents = ct > 0.6 ? 'auto' : 'none';
      caps[caps.length - 1].style.bottom = 'calc(17vh + env(safe-area-inset-bottom))';
      bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      if (rr > 0.01) raf = requestAnimationFrame(draw);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    el.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    const close = () => {
      try { localStorage.setItem(SEEN, '1'); } catch (e) {}
      el.style.transition = 'opacity .45s'; el.style.opacity = '0';
      setTimeout(() => { el.remove(); document.documentElement.style.overflow = ''; window.removeEventListener('resize', kick); }, 460);
    };
    el.querySelector('.st-skip').onclick = close;
    cta.onclick = close;
    draw();
  }

  // شعار 3D بأعلى الرئيسية: يدور ويميل حسب السكرول
  function mountHome(host) {
    if (!host || reduce() || host.querySelector('.h3d')) return;
    const box = document.createElement('div');
    box.className = 'h3d rv';
    box.innerHTML = '<div class="h3d-stage"></div><div class="h3d-t"><b>سندك بضغطة</b><span>اسحب لتحت: كل شي يوصلك بالدور.</span></div>';
    host.insertBefore(box, host.firstChild);
    const lg = build(88, 18);
    box.querySelector('.h3d-stage').appendChild(lg.el);
    let raf = 0;
    const draw = () => {
      raf = 0;
      if (host.hidden) return;
      const y = window.scrollY, t = clamp(y / 500, 0, 1);
      lg.el.style.transform = 'rotateX(' + (-10 + t * 24).toFixed(1) + 'deg) rotateY(' + (-25 + y * 0.45).toFixed(1) + 'deg)';
      const sp = clamp(y / 260, 0, 1);
      pose(lg.parts, lg.u, { arch: [0, sp * 4, -sp * 8, sp * 18, 0, 0, 1, 1], dot: [0, -sp * 10, sp * 14, 0, 0, 0, 1, 1], chev: [0, sp * 8, sp * 22, 0, 0, 0, 1, 1] });
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });
    draw();
    // ظهور متسلسل لباقي عناصر الرئيسية
    const els = host.querySelectorAll('.quick, .home-grid > div');
    els.forEach((e) => e.classList.add('rv'));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.08 });
      host.querySelectorAll('.rv').forEach((e, i) => { e.style.transitionDelay = Math.min(i * 70, 280) + 'ms'; io.observe(e); });
    } else host.querySelectorAll('.rv').forEach((e) => e.classList.add('in'));
  }

  F.story = { open: () => openStory(true), mountHome };
  F.logo3d = { build, pose };

  // أول تشغيل: بعد الافتتاحية
  function first() {
    let seen = false; try { seen = !!localStorage.getItem(SEEN); } catch (e) {}
    if (!seen) openStory(false);
  }
  if (document.getElementById('splash')) document.addEventListener('splash-out', first, { once: true });
  else first();
})();

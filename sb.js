/* سند جايك — الاتصال بـ Supabase (عميل خفيف بدون مكتبات خارجية)
 * المفتاح هنا publishable: مصمّم يكون علني. الأمان الحقيقي من RLS بقاعدة البيانات.
 */
(function () {
  'use strict';
  const F = window.F;

  const API = 'https://hwlpzlfimplzkdleaclw.supabase.co';
  const KEY = 'sb_publishable_8MXXYiGMYODBil-jcNuwWg_fwrowc_a';
  const SK = 'sanad_sb_session', GK = 'sanad_guest', VK = 'sanad_view_as';

  let sess = readJSON(SK);
  let profile = null, admin = false, refreshing = null;

  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function store(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} }
  function mkErr(status, msg, data) { const e = new Error(msg); e.status = status; e.data = data; return e; }

  const AUTH_MSG = [
    [/invalid login/i, 'الإيميل أو كلمة المرور غلط.'],
    [/already registered|already been registered/i, 'هذا الإيميل مسجّل من قبل. سجّل دخول.'],
    [/not confirmed/i, 'فعّل بريدك أولاً (راجع رسالة التأكيد).'],
    [/password.*(short|least|weak)|weak password/i, 'كلمة المرور ضعيفة. استخدم 8 خانات أو أكثر.'],
    [/valid email|invalid.*email|email address.*invalid/i, 'الإيميل غير صحيح.'],
    [/rate limit|too many|after \d+ seconds/i, 'محاولات كثيرة. انتظر دقيقة وجرّب.'],
    [/otp.*(expired|invalid)|token has expired|invalid.*(token|otp|code)/i, 'الرمز غلط أو انتهت صلاحيته.'],
    [/unsupported phone provider|phone provider|sms.*(disabled|not)/i, 'خدمة الرسائل غير مفعّلة بعد. راجع الإدارة.'],
    [/jwt/i, 'انتهت الجلسة. سجّل دخول من جديد.']
  ];
  function friendly(msg) {
    msg = String(msg || '');
    for (const p of AUTH_MSG) if (p[0].test(msg)) return p[1];
    return msg;
  }

  async function raw(path, o) {
    o = o || {};
    const h = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, o.headers || {});
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    let res;
    try {
      res = await fetch(API + path, { method: o.method || 'GET', headers: h, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    } catch (e) { throw mkErr('network', 'تعذّر الاتصال بالإنترنت.'); }
    const txt = await res.text();
    let data = null;
    if (txt) { try { data = JSON.parse(txt); } catch (e) { data = txt; } }
    if (!res.ok) {
      const m = data && (data.msg || data.message || data.error_description || data.error) || ('خطأ ' + res.status);
      throw mkErr(res.status, friendly(m), data);
    }
    return { data: data, res: res };
  }

  function setSession(r) {
    sess = {
      access_token: r.access_token, refresh_token: r.refresh_token,
      expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
      user: r.user || (sess && sess.user) || null
    };
    store(SK, sess);
  }

  async function token() {
    if (!sess) return null;
    if (sess.expires_at - 60 > Date.now() / 1000) return sess.access_token;
    if (!refreshing) {
      refreshing = raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: sess.refresh_token } })
        .then((r) => { setSession(r.data); })
        .catch((e) => { if (e.status !== 'network') { clearLocal(); } throw e; })
        .finally(() => { refreshing = null; });
    }
    await refreshing;
    return sess && sess.access_token;
  }

  function clearLocal() { sess = null; profile = null; admin = false; store(SK, null); }

  // طلب مع صلاحيات المستخدم الحالي (أو زائر إذا ما كو جلسة)
  async function call(path, o) {
    o = Object.assign({}, o);
    o.token = await token();
    return raw(path, o);
  }

  /* ---------- REST / RPC ---------- */
  // F.sb.q('cranes', 'select=*&owner_id=eq.x', { method, body, prefer })
  async function q(table, query, o) {
    o = o || {};
    const headers = {};
    if (o.prefer) headers.Prefer = o.prefer;
    const r = await call('/rest/v1/' + table + (query ? '?' + query : ''), { method: o.method, body: o.body, headers: headers });
    return r.data;
  }
  async function rpc(name, args) { return (await call('/rest/v1/rpc/' + name, { method: 'POST', body: args || {} })).data; }
  async function count(table, filter) {
    const r = await call('/rest/v1/' + table + '?select=*' + (filter ? '&' + filter : ''), { headers: { Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' } });
    const m = /\/(\d+)$/.exec(r.res.headers.get('content-range') || '');
    return m ? +m[1] : 0;
  }

  /* ---------- الدخول ---------- */
  async function afterLogin() {
    const uid = sess.user.id;
    try {
      const p = await q('profiles', 'select=*&id=eq.' + uid);
      profile = p && p[0] || null;
      const r = await q('user_roles', 'select=role&user_id=eq.' + uid);
      admin = !!(r && r.some((x) => x.role === 'admin'));
    } catch (e) { admin = false; }
  }

  async function signUp(o) {
    const r = await raw('/auth/v1/signup', { method: 'POST', body: { email: o.email, password: o.password, data: { full_name: o.name, phone: o.phone, car: o.car } } });
    const d = r.data;
    if (!d.access_token) return { needsConfirm: true };
    setSession(d); store(GK, null);
    await saveProfile({ full_name: o.name, phone: o.phone, car: o.car }).catch(() => {});
    await afterLogin();
    return { ok: true };
  }

  // 07701234567 -> +9647701234567
  const e164 = (p) => '+964' + String(p).replace(/^0/, '');

  // channel: 'whatsapp' | 'sms'
  async function sendOtp(phone, channel) {
    await raw('/auth/v1/otp', { method: 'POST', body: { phone: e164(phone), channel: channel, create_user: true } });
    return true;
  }

  async function verifyOtp(phone, code) {
    const r = await raw('/auth/v1/verify', { method: 'POST', body: { type: 'sms', phone: e164(phone), token: code } });
    setSession(r.data); store(GK, null);
    await afterLogin();
    return { ok: true, needsProfile: !(profile && profile.full_name) };
  }

  async function signIn(email, password) {
    const r = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } });
    setSession(r.data); store(GK, null);
    await afterLogin();
    return { ok: true };
  }

  async function signOut() {
    try { if (sess) await raw('/auth/v1/logout', { method: 'POST', token: sess.access_token }); } catch (e) {}
    clearLocal(); store(GK, null); store(VK, null);
    ['sanad_active_req'].forEach((k) => store(k, null));
  }

  async function saveProfile(patch) {
    const uid = sess.user.id;
    const rows = await q('profiles', 'id=eq.' + uid, { method: 'PATCH', body: patch, prefer: 'return=representation' });
    if (rows && rows.length) profile = rows[0];
    else {
      const ins = await q('profiles', '', { method: 'POST', body: Object.assign({ id: uid }, patch), prefer: 'return=representation' });
      profile = ins && ins[0] || profile;
    }
    return profile;
  }

  async function init() {
    if (sess) {
      try { await token(); if (sess) await afterLogin(); } catch (e) {}
    }
  }

  /* ---------- حالة الواجهة ---------- */
  const realAdmin = () => !!sess && admin;
  // وضع العرض: للمدير فقط. admin | customer | visitor
  F.viewAs = function () {
    if (!realAdmin()) return sess ? 'customer' : 'visitor';
    const v = sessionStorage.getItem(VK);
    return v === 'visitor' || v === 'customer' ? v : 'admin';
  };
  F.setViewAs = function (v) { try { sessionStorage.setItem(VK, v); } catch (e) {} };

  F.isGuest = () => !sess || F.viewAs() === 'visitor';
  F.isAdmin = () => realAdmin() && F.viewAs() === 'admin';
  F.isRealAdmin = realAdmin;
  F.canEnter = () => !!sess; // الدخول برقم الموبايل إجباري
  F.authPhone = () => { const p = sess && sess.user && sess.user.phone; return p ? '0' + String(p).replace(/^\+?964/, '') : ''; };

  F.user = function () {
    if (!sess || F.viewAs() === 'visitor') return null;
    const u = sess.user || {};
    const p = profile || {};
    return { id: u.id, email: u.email, name: p.full_name || (u.user_metadata && u.user_metadata.full_name) || '', phone: p.phone || '', car: p.car || '' };
  };

  F.sb = { q: q, rpc: rpc, count: count, signUp: signUp, signIn: signIn, sendOtp: sendOtp, verifyOtp: verifyOtp, signOut: signOut, saveProfile: saveProfile, init: init, uid: () => sess && sess.user && sess.user.id, API: API };

  /* ---------- الكرينات ---------- */
  F.fetchCranes = async function (lat, lng) {
    const rows = await rpc('nearby_cranes', { p_lat: lat, p_lng: lng, p_radius_km: 150, p_limit: 50 });
    return (rows || []).map((c) => ({
      id: c.id, name: c.name, type: c.type, lat: +c.lat, lng: +c.lng, status: c.status,
      verified: !!c.verified, package: c.package, demo: !!c.is_demo,
      updatedAt: Date.parse(c.updated_at) || 0,
      rating: c.rating_avg != null ? +c.rating_avg : null, ratingCount: c.rating_count || 0,
      d: c.distance_km != null ? +c.distance_km : null
    }));
  };

  // يطلب من الزائر تسجيل الدخول
  F.requireLogin = function (reason) {
    const m = F.modal(
      '<h2>' + F.icon('lock') + ' سجّل دخول أول</h2>' +
      '<p class="muted">' + F.esc(reason || 'هذي الخدمة تحتاج حساب.') + '</p>' +
      '<div class="stack mt"><button class="btn block" id="rl-in">دخول / حساب جديد</button>' +
      '<button class="btn secondary block" id="rl-no">لاحقاً</button></div>'
    );
    F.$('#rl-no', m.el).onclick = m.close;
    F.$('#rl-in', m.el).onclick = () => { m.close(); F.auth.open(); };
  };

  F.errMsg = (e) => (e && e.message) || 'صار خطأ، جرّب مرة ثانية.';
})();

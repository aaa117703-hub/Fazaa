/* سند جايك — مجموعة أيقونات هندسية (خطوط موحّدة، شبكة 24) */
(function () {
  'use strict';
  const F = (window.F = window.F || {});

  const P = {
    // كرين سحب: قاعدة + ذراع + خطاف
    crane:
      '<circle cx="6.8" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>' +
      '<path d="M4.8 18H2.5v-4.5h12V11H18l3.5 3.5V18H19"/><path d="M8.8 18H15"/>' +
      '<path d="m11.5 13.5-5.7-7.7"/><path d="M5.8 5.8v3.9"/><circle cx="5.8" cy="11.1" r="1.4"/>',
    phone:
      '<path d="M7 3.5h3l1.4 4-2 1.4a11 11 0 0 0 5.7 5.7l1.4-2 4 1.4v3a2.1 2.1 0 0 1-2.3 2.1A16 16 0 0 1 4.9 5.8 2.1 2.1 0 0 1 7 3.5z"/>',
    pin: '<path d="M12 21s6.5-5.7 6.5-11a6.5 6.5 0 0 0-13 0c0 5.3 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    gps: '<circle cx="12" cy="12" r="6.3"/><circle cx="12" cy="12" r="1.7"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2"/>',
    cursor: '<path d="M5 4.5 19 10l-6.2 2.2L10.6 19z"/>',
    home: '<path d="m3.5 11 8.5-7 8.5 7"/><path d="M6 9.4V20h12V9.4"/><path d="M10 20v-5h4v5"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    gem: '<path d="M6.5 4h11l3.5 5-9 11L3 9z"/><path d="M3 9h18"/><path d="m9.5 4-2 5L12 20l4.5-11-2-5"/>',
    wheel:
      '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2"/><path d="M3.6 10.6h6.6M13.8 10.6h6.6M12 14v6.6"/>',
    alert: '<path d="M12 3.6 21.4 20H2.6z"/><path d="M12 10v4.4"/><path d="M12 17.1v.1"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.8"/><path d="m8.2 12.4 2.7 2.7 5-5.4"/>',
    'pause-circle': '<circle cx="12" cy="12" r="8.8"/><path d="M9.7 9v6M14.3 9v6"/>',
    pencil: '<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
    siren: '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 18h14v3H5z"/><path d="M12 2v2M4.5 5.5 6 7M19.5 5.5 18 7M2 12h2M20 12h2"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    download: '<path d="M12 4v11"/><path d="m7.5 10.8 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12.5h5M10 16.5h5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    gift: '<rect x="3.5" y="8.5" width="17" height="4.5" rx="1"/><path d="M5 13v7h14v-7"/><path d="M12 8.5V20"/><path d="M12 8.5C9.5 8.5 8 7.4 8 6.1S9.4 4 12 8.5zM12 8.5c2.5 0 4-1.1 4-2.4S14.6 4 12 8.5z"/>',
    car: '<path d="m4 13.5 1.7-4.6a2 2 0 0 1 1.9-1.3h8.8a2 2 0 0 1 1.9 1.3l1.7 4.6"/><rect x="3" y="13.5" width="18" height="4.5" rx="1.5"/><path d="M6.5 18v1.8M17.5 18v1.8"/><path d="M7 15.7h.1M17 15.7h.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M10 4H5v16h5"/><path d="m14 8 4 4-4 4"/><path d="M18 12H9"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    share: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.1 10.9 7.8-3.7M8.1 13.1l7.8 3.7"/>',
    shield: '<path d="M12 3.5 19.5 6v5.5c0 4.4-3 7.7-7.5 9-4.5-1.3-7.5-4.6-7.5-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    map: '<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    wrench: '<path d="M17.2 3.2a4.6 4.6 0 0 0-4.4 6L4.2 17.8a1.9 1.9 0 0 0 2.7 2.7l8.6-8.6a4.6 4.6 0 0 0 6-4.4l-3.1 3.1-2.9-.6-.6-2.9z"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1.2"/>',
    // أيقونات خدمات الطريق (كل نوع له رمز خاص)
    gear: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="7.9" stroke-width="2.6" stroke-dasharray="2.5 3.1" stroke-dashoffset="1.2"/>',
    oilcan: '<path d="M12 3.2c3.3 4 5.6 6.9 5.6 9.9a5.6 5.6 0 0 1-11.2 0c0-3 2.3-5.9 5.6-9.9z"/><path d="M9.1 13.9a3 3 0 0 0 2.6 2.6"/>',
    pump: '<rect x="4.5" y="3.8" width="9.5" height="16.2" rx="1.6"/><path d="M4.5 9.5H14"/><path d="M14 8h2.2A1.8 1.8 0 0 1 18 9.8V16a1.5 1.5 0 0 0 3 0V9l-2.6-2.6"/><path d="M3 20.2h12.5"/>',
    fork: '<path d="M6 3v6a2.5 2.5 0 0 0 5 0V3"/><path d="M8.5 3v18"/><path d="M17 21V3c-2.3 1.2-3.6 3.8-3.6 7.6H17"/>',
    cup: '<path d="M4.5 9.5h11.5v4.5a5 5 0 0 1-5 5h-1.5a5 5 0 0 1-5-5z"/><path d="M16 11h1.8a2.2 2.2 0 0 1 0 4.4H16"/><path d="M8 3.5c-.9 1.1.9 1.7 0 2.9M12 3.5c-.9 1.1.9 1.7 0 2.9"/>',
    camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
    radar: '<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'
  };

  // F.icon('crane') أو F.icon('crane', 'extra-class')
  F.icon = function (name, cls) {
    const d = P[name];
    if (!d) return '';
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  };
  F.iconNames = Object.keys(P);
})();

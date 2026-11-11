/* سند جايك — قوائم السيارات وشركات الكرينات (اختيار بدل الكتابة). */
(function () {
  const F = window.F = window.F || {};
  // السيارات الشائعة بالعراق: شركة ← موديلات
  F.CARS = {
    'تويوتا': ['كامري', 'كورولا', 'يارس', 'افالون', 'لاندكروزر', 'برادو', 'هايلكس', 'فورتشنر', 'راف 4', 'هايلاندر', 'سيكويا', 'تندرا', 'هايس', 'كراون', 'اوريون'],
    'كيا': ['سيراتو', 'اوبتيما', 'ريو', 'سبورتاج', 'سورنتو', 'بيكانتو', 'كارنيفال', 'كادينزا', 'سيلتوس', 'تيلورايد', 'بونجو'],
    'هيونداي': ['النترا', 'سوناتا', 'اكسنت', 'توسان', 'سنتافي', 'ازيرا', 'i10', 'i20', 'كريتا', 'فيلوستر', 'باليسيد', 'جراند i10'],
    'نيسان': ['صني', 'التيما', 'سنترا', 'باترول', 'اكس تريل', 'باثفايندر', 'نافارا', 'قشقاي', 'ماكسيما', 'كيكس', 'ارمادا'],
    'شفروليه': ['كروز', 'ماليبو', 'اوبترا', 'افيو', 'تاهو', 'سبربان', 'كابتيفا', 'سلفرادو', 'سبارك', 'ترافيرس', 'كامارو', 'ايكوينوكس'],
    'جي إم سي': ['يوكن', 'سييرا', 'تيرين', 'اكاديا', 'سافانا'],
    'فورد': ['فوكس', 'فيوجن', 'اكسبلورر', 'اكسبديشن', 'ايدج', 'F-150', 'تورس', 'موستنج', 'اسكيب', 'رينجر', 'فيجو'],
    'هوندا': ['اكورد', 'سيفيك', 'CR-V', 'بايلوت', 'سيتي', 'اوديسي'],
    'مازدا': ['مازدا 3', 'مازدا 6', 'CX-5', 'CX-9', 'CX-3'],
    'ميتسوبيشي': ['لانسر', 'باجيرو', 'L200', 'اوتلاندر', 'ASX', 'اتراج', 'مونتيرو'],
    'مرسيدس': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLC', 'G-Class', 'سبرنتر', 'CLA', 'ML', 'GLS'],
    'بي إم دبليو': ['الفئة 3', 'الفئة 5', 'الفئة 7', 'X3', 'X5', 'X6'],
    'لكزس': ['ES', 'LS', 'RX', 'LX', 'GX', 'IS', 'NX'],
    'دودج': ['تشارجر', 'دورانجو', 'رام', 'تشالنجر', 'جورني'],
    'جيب': ['جراند شيروكي', 'شيروكي', 'رانجلر', 'كومباس', 'رينيجيد'],
    'كرايسلر': ['300C', 'باسيفيكا', 'سيبرينج'],
    'كاديلاك': ['اسكاليد', 'CTS', 'XT5', 'SRX'],
    'انفينيتي': ['QX80', 'QX60', 'Q50', 'FX'],
    'فولكس فاجن': ['باسات', 'جولف', 'جيتا', 'تيجوان', 'طوارق', 'بولو'],
    'اودي': ['A4', 'A6', 'Q5', 'Q7', 'A3'],
    'بيجو': ['301', '508', '206', '407', '3008', 'بارتنر'],
    'رينو': ['سيمبول', 'ميجان', 'داستر', 'لوجان', 'كابتشر'],
    'سوزوكي': ['سويفت', 'فيتارا', 'ارتيجا', 'ديزاير', 'سيليريو'],
    'إم جي': ['MG5', 'MG6', 'ZS', 'HS', 'RX5', 'MG3'],
    'شيري': ['تيجو 7', 'تيجو 8', 'اريزو 5', 'تيجو 4'],
    'جيلي': ['امجراند', 'كولراي', 'اطلس', 'مونجارو'],
    'شانجان': ['CS35', 'CS75', 'ايدو', 'هنتر', 'اليسفن'],
    'هافال': ['H6', 'جوليان', 'H9', 'دارجو'],
    'بي واي دي': ['سونج', 'هان', 'تانج', 'اتو 3', 'سيل'],
    'ايسوزو': ['D-Max', 'MU-X', 'NPR', 'NQR'],
    'فولفو': ['XC90', 'XC60', 'S60', 'S90'],
    'شاحنة / باص': ['هينو', 'ايسوزو', 'مرسيدس اكتروس', 'فولفو FH', 'سكانيا', 'مان', 'داف', 'هاو', 'فوتون', 'شاكمان', 'كوستر', 'باص صغير', 'تريلة', 'قلاب', 'تانكر'],
  };
  // شركات الكرينات (الشاصي): شركة ← موديلات
  F.CRANE_MAKES = {
    'ايسوزو': ['NPR', 'NQR', 'FVR', 'FTR', 'FRR', 'ELF'],
    'هينو': ['300', '500', '700', 'دوترو', 'رينجر'],
    'ميتسوبيشي فوسو': ['كانتر', 'فايتر', 'سوبر جريت'],
    'مرسيدس': ['اتيجو', 'اكتروس', 'اكسور', 'اتيغو', '1924', '1938'],
    'فولفو': ['FL', 'FM', 'FH', 'FMX'],
    'مان': ['TGL', 'TGM', 'TGS', 'TGX'],
    'سكانيا': ['P-series', 'G-series', 'R-series'],
    'داف': ['LF', 'CF', 'XF'],
    'ايفيكو': ['ديلي', 'يوروكارجو', 'ستراليس'],
    'هاو (سينوتروك)': ['A7', 'T5G', 'T7H', '371', '336'],
    'فوتون': ['اومارك', 'اومان', 'اولين'],
    'شاكمان': ['X3000', 'F3000', 'L3000'],
    'جاك': ['N-series', 'X-series', 'K-series'],
    'نيسان / UD': ['كوندور', 'كويون', 'ديزل'],
    'تويوتا': ['دينا', 'هايلكس', 'لاندكروزر'],
    'هيونداي': ['مايتي', 'HD65', 'HD78', 'HD120', 'بورتر'],
    'كيا': ['بونجو', 'K2500', 'K3600'],
    'فورد': ['كارجو', 'F-650', 'F-550', 'F-350'],
    'شفروليه': ['كودياك', 'سلفرادو', 'NPR'],
    'جي إم سي': ['سييرا', 'توبكيك'],
    'تاتا': ['LPT', 'اكسينون', 'الترا'],
  };

  const OTHER = 'غير مذكور';
  const opt = (v, sel) => '<option' + (v === sel ? ' selected' : '') + '>' + F.esc(v) + '</option>';
  const YEARS = (function () { const a = [], y = new Date().getFullYear() + 1; for (let i = y; i >= 1985; i--) a.push(String(i)); return a; })();

  /* منتقي: شركة ← موديل (+ سنة اختيارية). cfg: {id, data, makeLabel, modelLabel, year, value:{make,model,year}} */
  F.picker = function (cfg) {
    const id = cfg.id, data = cfg.data, v = cfg.value || {};
    const html =
      '<div class="field"><label for="' + id + '-make">' + (cfg.makeLabel || 'الشركة') + '</label>' +
        '<select id="' + id + '-make"><option value="">اختر</option>' + Object.keys(data).map((k) => opt(k, v.make)).join('') + '<option' + (v.make === OTHER ? ' selected' : '') + '>' + OTHER + '</option></select>' +
        '<div class="err" id="' + id + '-em"></div></div>' +
      '<div class="field"><label for="' + id + '-model">' + (cfg.modelLabel || 'الموديل') + '</label>' +
        '<select id="' + id + '-model"></select>' +
        '<input id="' + id + '-free" placeholder="اكتب الاسم" maxlength="40" hidden style="margin-top:8px">' +
        '<div class="err" id="' + id + '-eo"></div></div>' +
      (cfg.year ? '<div class="field"><label for="' + id + '-year">سنة الصنع (اختياري)</label><select id="' + id + '-year"><option value="">—</option>' + YEARS.map((y) => opt(y, v.year)).join('') + '</select></div>' : '');
    function wire(root) {
      const mk = F.$('#' + id + '-make', root), md = F.$('#' + id + '-model', root), fr = F.$('#' + id + '-free', root);
      const fill = (sel) => {
        const make = mk.value;
        if (!make) { md.innerHTML = '<option value="">اختر الشركة أولاً</option>'; md.disabled = true; fr.hidden = true; return; }
        md.disabled = false;
        if (make === OTHER) { md.innerHTML = '<option>' + OTHER + '</option>'; md.disabled = true; fr.hidden = false; return; }
        const list = data[make] || [];
        md.innerHTML = '<option value="">اختر</option>' + list.map((m) => opt(m, sel)).join('') + '<option' + (sel && list.indexOf(sel) < 0 ? ' selected' : '') + '>' + OTHER + '</option>';
        fr.hidden = md.value !== OTHER;
      };
      fill(v.model);
      if (v.model && (v.make === OTHER || (data[v.make] && data[v.make].indexOf(v.model) < 0))) { fr.hidden = false; fr.value = v.model === OTHER ? '' : v.model; if (data[v.make]) md.value = OTHER; }
      mk.onchange = () => { fill(''); fr.value = ''; };
      md.onchange = () => { fr.hidden = md.value !== OTHER; if (!fr.hidden) fr.focus(); };
    }
    function get(root) {
      const mk = F.$('#' + id + '-make', root), md = F.$('#' + id + '-model', root), fr = F.$('#' + id + '-free', root), yr = F.$('#' + id + '-year', root);
      let model = md.value;
      if (mk.value === OTHER || model === OTHER) model = fr.value.trim();
      const em = F.$('#' + id + '-em', root), eo = F.$('#' + id + '-eo', root);
      let ok = true;
      em.textContent = mk.value ? '' : (ok = false, 'اختر الشركة.');
      eo.textContent = model.length >= 1 ? '' : (ok = false, mk.value === OTHER || md.value === OTHER ? 'اكتب الاسم.' : 'اختر الموديل.');
      const make = mk.value === OTHER ? '' : mk.value;
      const year = yr ? yr.value : '';
      return { ok: ok, make: mk.value, model: model, year: year, text: [make, model, year].filter(Boolean).join(' ') };
    }
    return { html: html, wire: wire, get: get };
  };
  // يحاول يفكّ نص قديم («كيا سيراتو 2018») لقيم المنتقي
  F.parseCar = function (txt) {
    txt = (txt || '').trim();
    if (!txt) return {};
    const y = (txt.match(/\b(19|20)\d{2}\b/) || [''])[0];
    const rest = txt.replace(y, '').trim();
    const make = Object.keys(F.CARS).find((m) => rest.indexOf(m) === 0);
    if (!make) return { make: OTHER, model: rest, year: y };
    return { make: make, model: rest.slice(make.length).trim() || OTHER, year: y };
  };
})();

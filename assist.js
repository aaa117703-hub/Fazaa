/* سند جايك — مساعد الأعطال (ذكاء اصطناعي): يجاوب بالعراقي شنو تسوي إذا تعطلت مركبتك */
(function () {
  'use strict';
  const F = window.F;
  const VEHICLES = ['سيارة صالون', 'تكسي', 'بيك آب / دبل', 'SUV / جيب', 'باص / ميني باص', 'شاحنة / قلاب', 'تريلة / سطحة', 'كرين / ونش', 'دراجة نارية', 'مركبة ثانية'];
  const QUICK = ['ما تشتغل (ستارت)', 'الحرارة عالية', 'بنشر بالإطار', 'البطارية فارغة', 'طلع دخان', 'صوت غريب بالمحرك', 'الفرامل ضعيفة', 'خلص البنزين'];
  const hist = [];
  let vehicle = '', busy = false;

  const bubble = (role, text) => '<div class="ai-b ' + role + '">' + F.esc(text).replace(/\n/g, '<br>') + '</div>';

  function show() {
    if (F.isGuest()) { F.toast('سجّل دخول حتى تستخدم المساعد.'); F.auth.open(); return; }
    const m = F.modal(
      '<h2>' + F.icon('shield') + ' مساعد الأعطال</h2>' +
      '<p class="muted small">اكتب شنو صار بمركبتك وراح أقلك شنو تسوي. نصائح عامة وما تغني عن الميكانيكي.</p>' +
      '<div class="ai-veh" id="ai-veh">' + VEHICLES.map((v) => '<button class="chip' + (v === vehicle ? ' on' : '') + '" type="button">' + v + '</button>').join('') + '</div>' +
      '<div class="ai-log" id="ai-log"></div>' +
      '<div class="ai-quick" id="ai-quick">' + QUICK.map((q) => '<button class="chip" type="button">' + q + '</button>').join('') + '</div>' +
      '<form class="ai-form" id="ai-form"><input id="ai-in" maxlength="400" placeholder="شنو المشكلة؟" autocomplete="off"><button class="btn" type="submit" id="ai-send">إرسال</button></form>' +
      '<div class="ai-foot"><a class="btn sm secondary" id="ai-req">أرسل طلب لأقرب كرين</a><a class="btn sm danger" id="ai-sos">طوارئ SOS</a></div>'
    );
    const $ = (s) => F.$(s, m.el), log = $('#ai-log');
    const paint = () => { log.innerHTML = hist.map((h) => bubble(h.role === 'user' ? 'me' : 'bot', h.content)).join('') || '<div class="ai-hint">اختر نوع مركبتك فوق، وبعدها اكتب المشكلة أو اضغط على واحدة من الأعراض.</div>'; log.scrollTop = log.scrollHeight; };
    paint();

    $('#ai-veh').onclick = (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      vehicle = vehicle === b.textContent ? '' : b.textContent;
      F.$$('#ai-veh .chip', m.el).forEach((c) => c.classList.toggle('on', c.textContent === vehicle));
    };
    async function send(text) {
      text = (text || '').trim();
      if (!text || busy) return;
      busy = true; $('#ai-send').disabled = true; $('#ai-in').value = '';
      hist.push({ role: 'user', content: text }); paint();
      log.insertAdjacentHTML('beforeend', '<div class="ai-b bot typing" id="ai-typing"><i></i><i></i><i></i></div>'); log.scrollTop = log.scrollHeight;
      let out;
      try { out = await F.sb.fn('assist', { messages: hist.slice(-10), vehicle: vehicle }); } catch (e) { out = { error: 'network' }; }
      const msg = out && out.reply ? out.reply
        : out && out.error === 'limit' ? 'خلصت أسئلتك لليوم. جرّب باجر، أو أرسل طلب لأقرب كرين.'
        : out && out.error === 'not_configured' ? 'المساعد غير مفعّل حالياً. حاول بعد شوي.'
        : out && out.error === 'unauthorized' ? 'سجّل دخول من جديد وجرّب.'
        : 'ما كدرت أجاوب هسه. تأكد من الإنترنت وجرّب مرة ثانية.';
      if (!(out && out.reply)) hist.pop(); else hist.push({ role: 'assistant', content: msg });
      paint();
      if (!(out && out.reply)) log.insertAdjacentHTML('beforeend', bubble('bot err', msg));
      busy = false; $('#ai-send').disabled = false; log.scrollTop = log.scrollHeight;
    }
    $('#ai-quick').onclick = (e) => { const b = e.target.closest('.chip'); if (b) send(b.textContent); };
    $('#ai-form').onsubmit = (e) => { e.preventDefault(); send($('#ai-in').value); };
    $('#ai-req').onclick = () => { m.close(); F.request.start(); };
    $('#ai-sos').onclick = () => { m.close(); F.guide.sos(); };
  }

  F.assist = { show: show };
})();

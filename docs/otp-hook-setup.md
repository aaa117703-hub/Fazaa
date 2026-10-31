# إعداد رمز التحقق (واتساب أولاً، SMS احتياط)

الدالة `send-otp-hook` منشورة على Supabase. تحتاج 3 خطوات منك:

1. Supabase ← Authentication ← **Sign In / Providers** ← Phone: فعّله.
2. Supabase ← Authentication ← **Hooks** ← **Send SMS hook**: اختر Edge Function ← `send-otp-hook`، واضغط Generate secret (ينسخ لك سر يبدأ بـ `v1,whsec_`).
3. Edge Functions ← Secrets: أضف
   - `SEND_SMS_HOOK_SECRET` = السر أعلاه
   - واتساب (Meta Cloud API): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, و`WHATSAPP_TEMPLATE` (اسم قالب Authentication المعتمد، الافتراضي `otp`) و`WHATSAPP_LANG` (الافتراضي `ar`)
   - SMS احتياط (Twilio): `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`

يكفي أحد المزوّدين. إذا واتساب فشل أو غير مضبوط، يرسل SMS تلقائياً.

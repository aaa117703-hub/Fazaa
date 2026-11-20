import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';

import { AuthBg, AuthBrand, glass } from '@/components/auth-art';
import { Btn, Muted, T } from '@/components/ui';
import { SITE } from '@/lib/site';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

function arErr(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'الإيميل أو كلمة المرور غلط.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'هذا الإيميل مسجّل من قبل. جرّب تسجيل الدخول.';
  if (m.includes('password')) return 'كلمة المرور لازم تكون 8 أحرف أو أكثر.';
  if (m.includes('rate') || m.includes('too many')) return 'محاولات كثيرة. انتظر شوي وجرّب.';
  if (m.includes('network')) return 'ما كو اتصال بالإنترنت.';
  return 'صار خطأ. جرّب مرة ثانية.';
}

const input = {
  fontFamily: 'IBMPlexSansArabic_400Regular',
  backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  textAlign: 'right' as const, borderWidth: 1, borderColor: C.line,
};

function Field({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(37,42,47,0.85)', borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 18, minHeight: 54, gap: 10 }}>
      <Icon name={icon} size={20} />
      {children}
    </View>
  );
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function submit() {
    setErr(''); setInfo('');
    if (!email.includes('@')) return setErr('اكتب إيميل صحيح.');
    if (mode === 'forgot') {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: SITE + '/' });
      setBusy(false);
      if (error) return setErr('تعذّر الإرسال. تأكد من الإيميل وجرّب بعد قليل.');
      return setInfo('إذا الإيميل مسجّل، أرسلنا لك رابط لتغيير كلمة المرور. افتحه من الإيميل.');
    }
    if (pass.length < 8) return setErr('كلمة المرور لازم تكون 8 أحرف أو أكثر.');
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) throw error;
        router.back();
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { data: { full_name: name.trim() } } });
        if (error) throw error;
        if (data.session) {
          if (name.trim()) await supabase.from('profiles').upsert({ id: data.session.user.id, full_name: name.trim() });
          router.back();
        } else setInfo('أرسلنا رابط تأكيد لإيميلك. افتحه ثم سجّل دخول.');
      }
    } catch (e) {
      setErr(arErr(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'in' ? 'أهلاً بعودتك' : mode === 'up' ? 'حساب جديد' : 'نسيت كلمة المرور';
  const sub = mode === 'in' ? 'سجّل دخولك حتى تكمل.' : mode === 'up' ? 'أنشئ حسابك بدقيقة.' : 'اكتب إيميلك وراح نرسل لك رابط لتغيير كلمة المرور.';
  const bare = { ...input, flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0 };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <AuthBg />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 18 }}>
        <View style={{ gap: 14, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <View style={[glass, { gap: 12 }]}>
            <AuthBrand />
            <T style={{ fontSize: 28, fontWeight: '800', marginTop: 10 }}>{title}</T>
            <Muted>{sub}</Muted>
            {mode === 'up' && <Field icon="profile"><TextInput value={name} onChangeText={setName} placeholder="الاسم الثلاثي" placeholderTextColor={C.muted} style={bare} /></Field>}
            <Field icon="mail"><TextInput value={email} onChangeText={setEmail} placeholder="الإيميل" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={[bare, { writingDirection: 'ltr' }]} /></Field>
            {mode !== 'forgot' && (
              <Field icon="lock">
                <TextInput value={pass} onChangeText={setPass} placeholder="كلمة المرور (8 أحرف أو أكثر)" placeholderTextColor={C.muted} secureTextEntry={!showPass} autoCapitalize="none" style={bare} />
                <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}><Icon name={showPass ? 'eyeoff' : 'eye'} size={20} /></Pressable>
              </Field>
            )}
            {mode === 'in' && <Pressable onPress={() => { setMode('forgot'); setErr(''); setInfo(''); }}><T style={{ color: C.accent, fontWeight: '700' }}>نسيت كلمة المرور؟</T></Pressable>}
            {!!err && <T style={{ color: C.danger }}>{err}</T>}
            {!!info && <T style={{ color: C.ok }}>{info}</T>}
            {busy ? <ActivityIndicator color={C.accent} /> : <Btn label={mode === 'in' ? 'دخول' : mode === 'forgot' ? 'أرسل الرابط' : 'إنشاء الحساب'} onPress={submit} style={{ minHeight: 54 }} />}
            {mode === 'in' && <Pressable onPress={() => { setMode('up'); setErr(''); }}><T style={{ textAlign: 'center', color: C.muted }}>ما عندك حساب؟ <T style={{ color: C.accent, fontWeight: '800' }}>أنشئ حساب</T></T></Pressable>}
            {mode === 'up' && <Pressable onPress={() => { setMode('in'); setErr(''); }}><T style={{ textAlign: 'center', color: C.muted }}>عندك حساب؟ <T style={{ color: C.accent, fontWeight: '800' }}>سجّل دخول</T></T></Pressable>}
            {mode === 'forgot' && <Pressable onPress={() => { setMode('in'); setErr(''); setInfo(''); }}><T style={{ color: C.accent, fontWeight: '700', textAlign: 'center' }}>رجوع للدخول</T></Pressable>}
          </View>
          <Muted style={{ textAlign: 'center', fontSize: 12 }}>رقمك يظهر فقط للسائق اللي يقبل طلبك. بالتسجيل أنت توافق على الشروط وسياسة الخصوصية (من «حسابي»).</Muted>
          <Btn label="تصفح بدون حساب" kind="secondary" onPress={() => router.back()} style={{ backgroundColor: 'rgba(20,23,26,0.6)' }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

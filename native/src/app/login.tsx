import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Muted, T } from '@/components/ui';
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
  backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  textAlign: 'right' as const, borderWidth: 1, borderColor: C.line,
};

export default function Login() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  async function submit() {
    setErr(''); setInfo('');
    if (!email.includes('@')) return setErr('اكتب إيميل صحيح.');
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <T style={{ fontSize: 26, fontWeight: '800', color: C.accent }}>سند جايك</T>
        <Muted>رقمك يظهر فقط للسائق اللي يقبل طلبك.</Muted>
        <View style={{ flexDirection: 'row-reverse', backgroundColor: C.surface2, borderRadius: R.md, padding: 4 }}>
          {(['in', 'up'] as const).map((k) => (
            <Pressable key={k} onPress={() => { setMode(k); setErr(''); }} style={{ flex: 1, paddingVertical: 10, borderRadius: R.sm, backgroundColor: mode === k ? C.accent : 'transparent' }}>
              <T style={{ textAlign: 'center', fontWeight: '800', color: mode === k ? '#fff' : C.muted }}>{k === 'in' ? 'دخول' : 'حساب جديد'}</T>
            </Pressable>
          ))}
        </View>
        {mode === 'up' && <TextInput value={name} onChangeText={setName} placeholder="الاسم" placeholderTextColor={C.muted} style={input} />}
        <TextInput value={email} onChangeText={setEmail} placeholder="الإيميل" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={[input, { writingDirection: 'ltr' }]} />
        <TextInput value={pass} onChangeText={setPass} placeholder="كلمة المرور (8 أحرف أو أكثر)" placeholderTextColor={C.muted} secureTextEntry autoCapitalize="none" style={input} />
        {!!err && <T style={{ color: C.danger }}>{err}</T>}
        {!!info && <T style={{ color: C.ok }}>{info}</T>}
        {busy ? <ActivityIndicator color={C.accent} /> : <Btn label={mode === 'in' ? 'دخول' : 'إنشاء الحساب'} onPress={submit} />}
        <Btn label="تصفح بدون حساب" kind="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

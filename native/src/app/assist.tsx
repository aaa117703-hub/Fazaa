import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

const VEHICLES = ['سيارة صالون', 'تكسي', 'بيك آب / دبل', 'SUV / جيب', 'باص / ميني باص', 'شاحنة / قلاب', 'تريلة / سطحة', 'كرين / ونش', 'دراجة نارية', 'مركبة ثانية'];
const QUICK = ['ما تشتغل (ستارت)', 'الحرارة عالية', 'بنشر بالإطار', 'البطارية فارغة', 'طلع دخان', 'صوت غريب بالمحرك', 'الفرامل ضعيفة', 'خلص البنزين'];
type Msg = { role: 'user' | 'assistant'; content: string };

function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill, backgroundColor: on ? C.accent : C.surface2 }}>
      <T style={{ color: on ? '#fff' : C.text, fontWeight: '700', fontSize: 14 }}>{label}</T>
    </Pressable>
  );
}

export default function Assist() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [vehicle, setVehicle] = useState('');
  const [hist, setHist] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const scroll = useRef<ScrollView>(null);

  async function send(q: string) {
    q = q.trim();
    if (!q || busy) return;
    if (!session) { router.push('/login'); return; }
    setErr(''); setText(''); setBusy(true);
    const next: Msg[] = [...hist, { role: 'user', content: q }];
    setHist(next);
    try {
      const { data, error } = await supabase.functions.invoke('assist', { body: { messages: next.slice(-10), vehicle } });
      const reply = (data as { reply?: string } | null)?.reply;
      if (error || !reply) {
        let code = '';
        try { code = (await (error as { context?: Response })?.context?.json())?.error ?? ''; } catch { /* */ }
        setErr(code === 'limit' ? 'خلصت أسئلتك لليوم. جرّب باجر، أو أرسل طلب لأقرب كرين.' : code === 'not_configured' ? 'المساعد غير مفعّل حالياً.' : 'ما كدرت أجاوب هسه. تأكد من الإنترنت وجرّب مرة ثانية.');
        setHist(hist);
      } else setHist([...next, { role: 'assistant', content: reply }]);
    } catch { setErr('ما كدرت أجاوب هسه. تأكد من الإنترنت.'); setHist(hist); }
    setBusy(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 10 }}>
        <T style={{ fontSize: 24, fontWeight: '800' }}>مساعد الأعطال</T>
        <Muted>اكتب شنو صار بمركبتك وأقلك شنو تسوي. نصائح عامة وما تغني عن الميكانيكي.</Muted>
        <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>
          {VEHICLES.map((v) => <Chip key={v} label={v} on={v === vehicle} onPress={() => setVehicle(v === vehicle ? '' : v)} />)}
        </View>
        {hist.length === 0 && <Muted style={{ textAlign: 'center', marginTop: 12 }}>اختر نوع مركبتك فوق، وبعدها اكتب المشكلة أو اضغط على عرض جاهز.</Muted>}
        {hist.map((m, i) => (
          <View key={i} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '88%', padding: 12, borderRadius: 16, backgroundColor: m.role === 'user' ? C.accent : C.surface2 }}>
            <T style={{ color: m.role === 'user' ? '#fff' : C.text, lineHeight: 24 }}>{m.content}</T>
          </View>
        ))}
        {busy && <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-end' }} />}
        {!!err && <T style={{ color: C.danger }}>{err}</T>}
        <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>{QUICK.map((q) => <Chip key={q} label={q} onPress={() => send(q)} />)}</View>
      </ScrollView>
      <View style={{ padding: 12, paddingBottom: insets.bottom + 12, gap: 8, borderTopWidth: 1, borderTopColor: C.line }}>
        <View style={[rtl.row, { gap: 8 }]}>
          <TextInput value={text} onChangeText={setText} maxLength={400} placeholder="شنو المشكلة؟" placeholderTextColor={C.muted} onSubmitEditing={() => send(text)} returnKeyType="send"
            style={{ flex: 1, backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right', borderWidth: 1, borderColor: C.line }} />
          <Btn label="إرسال" disabled={busy} onPress={() => send(text)} />
        </View>
        <View style={[rtl.row, { gap: 8 }]}>
          <Btn label="أرسل طلب لأقرب كرين" kind="secondary" small style={{ flex: 1 }} onPress={() => router.push('/request')} />
          <Btn label="طوارئ SOS" kind="danger" small style={{ flex: 1 }} onPress={() => router.push('/sos')} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

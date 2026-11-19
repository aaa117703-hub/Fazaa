import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BackBar } from '@/components/back-bar';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

const VEHICLES = ['سيارة صالون', 'تكسي', 'بيك آب / دبل', 'SUV / جيب', 'باص / ميني باص', 'شاحنة / قلاب', 'تريلة / سطحة', 'كرين / ونش', 'دراجة نارية', 'مركبة ثانية'];
const QUICK = ['ما تشتغل (ستارت)', 'الحرارة عالية', 'بنشر بالإطار', 'البطارية فارغة', 'طلع دخان', 'صوت غريب بالمحرك', 'الفرامل ضعيفة', 'خلص البنزين'];
type Msg = { role: 'user' | 'assistant'; content: string; photo?: string };

function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill, backgroundColor: on ? C.accent : C.surface2 }}>
      <T style={{ color: on ? C.onAccent : C.text, fontWeight: '700', fontSize: 14 }}>{label}</T>
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
  const [pic, setPic] = useState<{ uri: string; b64: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scroll = useRef<any>(null);

  async function pick(cam: boolean) {
    try {
      const perm = cam ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert(cam ? 'الكاميرا مغلقة' : 'الصور مغلقة', 'فعّل الوصول من إعدادات الجهاز.'); return; }
      const opt: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.35, base64: true };
      const r = cam ? await ImagePicker.launchCameraAsync(opt) : await ImagePicker.launchImageLibraryAsync(opt);
      if (r.canceled || !r.assets[0]?.base64) return;
      if (r.assets[0].base64.length > 2_900_000) { setErr('الصورة كبيرة. جرّب صورة ثانية.'); return; }
      setErr(''); setPic({ uri: r.assets[0].uri, b64: r.assets[0].base64 });
    } catch { setErr('تعذّر فتح الصورة. جرّب مرة ثانية.'); }
  }
  const photoMenu = () => Alert.alert('صوّر العطل', 'لمبة إنذار، إطار، تسريب، أضرار…', [
    { text: 'الكاميرا', onPress: () => { pick(true); } },
    { text: 'من الصور', onPress: () => { pick(false); } },
    { text: 'إلغاء', style: 'cancel' },
  ]);

  async function send(q: string) {
    q = q.trim();
    if (pic && !q) q = 'شنو هذا العطل بالصورة؟';
    if (!q || busy) return;
    if (!session) { router.push('/login'); return; }
    setErr(''); setText(''); setBusy(true);
    const sent = pic; setPic(null);
    const next: Msg[] = [...hist, { role: 'user', content: q, photo: sent?.uri }];
    setHist(next);
    try {
      const { data, error } = await supabase.functions.invoke('assist', { body: { messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })), vehicle, image: sent?.b64 } });
      const reply = (data as { reply?: string } | null)?.reply;
      if (error || !reply) {
        let code = '';
        try { code = (await (error as { context?: Response })?.context?.json())?.error ?? ''; } catch { /* */ }
        setErr(code === 'limit' ? 'خلصت أسئلتك لليوم. جرّب باجر، أو أرسل طلب لأقرب كرين.' : code === 'not_configured' || code === 'no_vision' ? 'المساعد غير مفعّل حالياً.' : code === 'image_too_big' || code === 'bad_image' ? 'الصورة ما اشتغلت. جرّب صورة ثانية.' : 'ما كدرت أجاوب هسه. تأكد من الإنترنت وجرّب مرة ثانية.');
        setHist(hist); if (sent) setPic(sent);
      } else setHist([...next, { role: 'assistant', content: reply }]);
    } catch { setErr('ما كدرت أجاوب هسه. تأكد من الإنترنت.'); setHist(hist); }
    setBusy(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: 20, gap: 10 }}>
        <BackBar /><T style={{ fontSize: 24, fontWeight: '800' }}>مساعد الأعطال</T>
        <Muted>اكتب شنو صار بمركبتك أو صوّر العطل (لمبة إنذار، إطار، تسريب) وأقلك شنو تسوي. نصائح عامة وما تغني عن الميكانيكي.</Muted>
        <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>
          {VEHICLES.map((v) => <Chip key={v} label={v} on={v === vehicle} onPress={() => setVehicle(v === vehicle ? '' : v)} />)}
        </View>
        {hist.length === 0 && <Muted style={{ textAlign: 'center', marginTop: 12 }}>اختر نوع مركبتك فوق، وبعدها اكتب المشكلة أو اضغط على عرض جاهز.</Muted>}
        {hist.map((m, i) => (
          <View key={i} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '88%', padding: 12, borderRadius: 16, backgroundColor: m.role === 'user' ? C.accent : C.surface2 }}>
            {!!m.photo && <Image source={{ uri: m.photo }} style={{ width: 160, height: 120, borderRadius: 10, marginBottom: 6 }} contentFit="cover" />}
            <T style={{ color: m.role === 'user' ? C.onAccent : C.text, lineHeight: 24 }}>{m.content}</T>
          </View>
        ))}
        {busy && <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-end' }} />}
        {!!err && <T style={{ color: C.danger }}>{err}</T>}
        <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>{QUICK.map((q) => <Chip key={q} label={q} onPress={() => send(q)} />)}</View>
      </ScrollView>
      <View style={{ padding: 12, paddingBottom: insets.bottom + 12, gap: 8, borderTopWidth: 1, borderTopColor: C.line }}>
        {!!pic && (
          <View style={[rtl.row, { gap: 10 }]}>
            <Image source={{ uri: pic.uri }} style={{ width: 56, height: 56, borderRadius: 10 }} contentFit="cover" />
            <Muted style={{ flex: 1 }}>الصورة جاهزة. اكتب سؤالك أو اضغط إرسال. (تحسب بسؤالين)</Muted>
            <Btn small kind="ghost" label="حذف" onPress={() => setPic(null)} />
          </View>
        )}
        <View style={[rtl.row, { gap: 8 }]}>
          <Pressable onPress={photoMenu} accessibilityLabel="صوّر العطل" style={{ width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line }}><T style={{ fontSize: 22 }}>📷</T></Pressable>
          <TextInput value={text} onChangeText={setText} maxLength={400} placeholder="شنو المشكلة؟" placeholderTextColor={C.muted} onSubmitEditing={() => send(text)} returnKeyType="send"
            style={{ flex: 1, fontFamily: 'IBMPlexSansArabic_400Regular', backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right', borderWidth: 1, borderColor: C.line }} />
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

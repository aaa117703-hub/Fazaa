import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarPicker, carOk, CarVal, OTHER } from '@/components/car-picker';
import { Select } from '@/components/select';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { loadBlocks, unblock } from '@/lib/blocks';
import { ago, avatarUrl, GOVS } from '@/lib/data';
import { carSpec, carSpecText } from '@/lib/carspecs';
import { PAGES } from '@/lib/site';
import { supabase } from '@/lib/supabase';
import { C, fontFor, R } from '@/lib/theme';
import { CARS } from '@/lib/vehicles';

type Prof = { full_name: string | null; phone: string | null; car: string | null; governorate: string | null; avatar_path?: string | null; car_weight_kg?: number | null; car_length_m?: number | null };
type ReqRow = { number: number | null; issue: string; status: string; created_at: string };
const ST: Record<string, string> = { open: 'قيد البحث', accepted: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي', expired: 'منتهي' };
const ISS: Record<string, string> = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح مقفلة', accident: 'حادث', other: 'أخرى' };
const inp = { fontFamily: fontFor('400'), backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right' as const, borderWidth: 1, borderColor: C.line };

const parseCar = (t: string | null): CarVal => {
  if (!t) return { make: '', model: '' };
  const mk = Object.keys(CARS).find((m) => t.startsWith(m + ' '));
  return mk ? { make: mk, model: t.slice(mk.length + 1) } : { make: OTHER, model: t };
};
const cleanPhone = (s: string) => s.replace(/\D/g, '').replace(/^00964/, '0').replace(/^964/, '0');

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [p, setP] = useState<Prof | null>(null);
  const [reqs, setReqs] = useState<ReqRow[] | null>(null);
  const [blocked, setBlocked] = useState<[string, string][]>([]);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gov, setGov] = useState('');
  const [car, setCar] = useState<CarVal>({ make: '', model: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [kg, setKg] = useState('');
  const [len, setLen] = useState('');
  const [touched, setTouched] = useState(false);
  const [mail, setMail] = useState('');
  const [mailMsg, setMailMsg] = useState('');
  const [avaV, setAvaV] = useState(0);

  // مواصفات تقريبية من القاعدة إذا المستخدم ما عدّلها بنفسه
  const suggest = (c: CarVal) => {
    const sp = c.make && c.model && c.model !== OTHER ? carSpec(c.make, c.model) : c.make && c.make !== OTHER ? carSpec(c.make, '') : null;
    setKg(sp ? String(sp.kg) : ''); setLen(sp ? String(sp.m) : '');
  };
  const onCar = (c: CarVal) => { setCar(c); if (!touched) suggest(c); };

  async function pickAvatar() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('الصور مغلقة', 'فعّل الوصول للصور من إعدادات الجهاز.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1] });
      if (r.canceled || !r.assets[0]) return;
      const buf = await (await fetch(r.assets[0].uri)).arrayBuffer();
      const path = uid + '/avatar.jpg';
      const up = await supabase.storage.from('avatars').upload(path, buf, { contentType: 'image/jpeg', upsert: true });
      if (up.error) throw up.error;
      const { error } = await supabase.from('profiles').upsert({ id: uid, avatar_path: path });
      if (error) throw error;
      setAvaV(Date.now()); load().catch(() => {});
    } catch { Alert.alert('تعذّر رفع الصورة', 'جرّب صورة ثانية.'); }
  }
  async function changeEmail() {
    const em = mail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return setMailMsg('اكتب إيميل صحيح.');
    if (em === (session?.user.email ?? '').toLowerCase()) return setMailMsg('هذا هو إيميلك الحالي.');
    const { error } = await supabase.auth.updateUser({ email: em });
    setMailMsg(error ? 'تعذّر الإرسال. جرّب لاحقاً.' : 'أرسلنا رسالة تأكيد إلى ' + em + '. افتحها واضغط الرابط.');
  }

  const load = useCallback(async () => {
    if (!uid) return;
    const [pr, rq, bl] = await Promise.all([
      supabase.from('profiles').select('full_name,phone,car,governorate,avatar_path,car_weight_kg,car_length_m').eq('id', uid).maybeSingle(),
      supabase.from('requests').select('number,issue,status,created_at').order('created_at', { ascending: false }).limit(10),
      loadBlocks().catch(() => ({} as Record<string, string>)),
    ]);
    setP((pr.data as Prof | null) ?? { full_name: null, phone: null, car: null, governorate: null });
    setReqs((rq.data as ReqRow[]) ?? []);
    setBlocked(Object.entries(bl));
  }, [uid]);
  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  function startEdit() {
    setName(p?.full_name ?? ''); setPhone(p?.phone ?? ''); setGov(p?.governorate ?? ''); setCar(parseCar(p?.car ?? null)); setKg(p?.car_weight_kg ? String(p.car_weight_kg) : ''); setLen(p?.car_length_m ? String(p.car_length_m) : ''); setTouched(!!(p?.car_weight_kg || p?.car_length_m)); setMail(session?.user.email ?? ''); setMailMsg(''); setErr(''); setEdit(true);
    if (!(p?.car_weight_kg || p?.car_length_m)) suggest(parseCar(p?.car ?? null));
  }
  async function save() {
    const ph = cleanPhone(phone), nm = name.trim().replace(/\s+/g, ' ');
    if (nm.split(' ').length < 3) return setErr('اكتب الاسم الثلاثي.');
    if (!/^07\d{9}$/.test(ph)) return setErr('الرقم لازم 11 رقم ويبدأ بـ 07.');
    if (!gov) return setErr('اختر المحافظة.');
    if (!carOk(car)) return setErr('اختر شركة سيارتك ونوعها.');
    const kgN = parseInt(kg, 10), lenN = parseFloat(len.replace(',', '.'));
    if (kg && !(kgN >= 300 && kgN <= 60000)) return setErr('الوزن لازم بين 300 و 60000 كغم.');
    if (len && !(lenN >= 1.5 && lenN <= 25)) return setErr('الطول لازم بين 1.5 و 25 م.');
    setBusy(true); setErr('');
    const { error } = await supabase.from('profiles').upsert({ id: uid, full_name: nm, phone: ph, car: car.make === OTHER ? car.model : car.make + ' ' + car.model, governorate: gov, car_weight_kg: kg ? kgN : null, car_length_m: len ? Math.round(lenN * 10) / 10 : null });
    setBusy(false);
    if (error) { setErr('تعذّر الحفظ. جرّب مرة ثانية.'); return; }
    setEdit(false); load().catch(() => {});
  }

  async function exportMine() {
    try {
      const [c, r] = await Promise.all([
        supabase.from('calls').select('crane_id,created_at,channel').order('created_at', { ascending: false }).limit(200),
        supabase.from('requests').select('number,issue,status,destination,created_at').order('created_at', { ascending: false }).limit(200),
      ]);
      await Share.share({ message: JSON.stringify({ email: session?.user.email, profile: p, requests: r.data, calls: c.data }, null, 2) });
    } catch { Alert.alert('تعذّر', 'ما كدرنا نجهّز بياناتك.'); }
  }
  function confirmDelete() {
    Alert.alert('حذف حسابك نهائياً؟', 'راح نحذف حسابك وبياناتك وطلباتك من الخادم. ما يمكن التراجع.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم، احذف', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) { Alert.alert('تعذّر الحذف', 'جرّب مرة ثانية.'); return; }
        await supabase.auth.signOut();
      } },
    ]);
  }

  const wrap = (c: React.ReactNode) => (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 140, gap: 12 }} keyboardShouldPersistTaps="handled">
      <T style={{ fontSize: 26, fontWeight: '800' }}>حسابي</T>
      {c}
    </ScrollView>
  );
  if (!session) return wrap(
    <>
      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800' }}>أنت تتصفح كزائر</T>
        <Muted>سجّل دخول حتى ترسل طلب أو تشوف أرقام الكرينات أو تسجّل كسائق.</Muted>
        <Btn label="دخول / حساب جديد" onPress={() => router.push('/login')} />
      </Card>
      <Legal />
    </>,
  );
  if (!p) return wrap(<ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />);

  if (edit) return wrap(
    <Card style={{ gap: 12 }}>
      <T style={{ fontWeight: '800', fontSize: 17 }}>تعديل بياناتي</T>
      <View style={{ gap: 6 }}><Muted>الاسم الثلاثي</Muted><TextInput value={name} onChangeText={setName} style={inp} /></View>
      <View style={{ gap: 6 }}><Muted>رقم الهاتف</Muted><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={16} style={[inp, { writingDirection: 'ltr' }]} /></View>
      <View style={{ gap: 6 }}><Muted>المحافظة</Muted><Select full label="المحافظة" value={gov} options={GOVS.map((g) => g.name)} onChange={setGov} allLabel="اختر المحافظة" /></View>
      <CarPicker data={CARS} makeLabel="شركة سيارتك" modelLabel="نوع السيارة" value={car} onChange={onCar} />
      <View style={{ gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: R.md, padding: 12 }}>
        <T style={{ fontWeight: '700' }}>🚗 مواصفات السيارة التقريبية</T>
        <Muted style={{ fontSize: 12 }}>تساعد سائق الكرين يجهّز المعدة المناسبة. عدّلها إذا تعرف الأرقام.</Muted>
        <View style={[rtl.row, { gap: 8 }]}>
          <View style={{ flex: 1, gap: 4 }}><Muted>الوزن (كغم)</Muted><TextInput value={kg} onChangeText={(t) => { setKg(t); setTouched(true); }} keyboardType="number-pad" maxLength={5} style={[inp, { writingDirection: 'ltr' }]} /></View>
          <View style={{ flex: 1, gap: 4 }}><Muted>الطول (م)</Muted><TextInput value={len} onChangeText={(t) => { setLen(t); setTouched(true); }} keyboardType="decimal-pad" maxLength={4} style={[inp, { writingDirection: 'ltr' }]} /></View>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Muted>الإيميل</Muted>
        <TextInput value={mail} onChangeText={setMail} autoCapitalize="none" keyboardType="email-address" style={[inp, { writingDirection: 'ltr' }]} />
        <Btn small kind="secondary" label="تغيير الإيميل" onPress={changeEmail} />
        {!!mailMsg && <Muted style={{ fontSize: 12.5 }}>{mailMsg}</Muted>}
        <Muted style={{ fontSize: 12 }}>نرسل رسالة تأكيد للإيميل الجديد، ويتغيّر بعد ضغط الرابط. تغيير رقم الهاتف سيحتاج رمز تحقق عبر واتساب (يُفعَّل قريباً).</Muted>
      </View>
      {!!err && <T style={{ color: C.danger }}>{err}</T>}
      {busy ? <ActivityIndicator color={C.accent} /> : <Btn label="حفظ" onPress={save} />}
      <Btn label="إلغاء" kind="secondary" onPress={() => setEdit(false)} />
    </Card>,
  );

  return wrap(
    <>
      <View style={{ alignItems: 'center', padding: 18, paddingTop: 22, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, overflow: 'hidden', gap: 8 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: C.accent }} />
        <Pressable onPress={pickAvatar} accessibilityLabel="تغيير الصورة" style={{ width: 108, height: 108, borderRadius: 54, borderWidth: 3, borderColor: C.accent, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 102, height: 102, borderRadius: 51, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {p.avatar_path ? <Image source={{ uri: avatarUrl(p.avatar_path) + '?v=' + avaV }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <T style={{ fontSize: 42, fontWeight: '700', color: C.accent }}>{(p.full_name || '؟').trim().charAt(0)}</T>}
          </View>
          <View style={{ position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera" size={17} color={C.onAccent} /></View>
        </Pressable>
        <T style={{ fontSize: 22, fontWeight: '700' }}>{p.full_name || 'مستخدم سند جايك'}</T>
        <View style={[rtl.row, { gap: 8, flexWrap: 'wrap', justifyContent: 'center' }]}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }}><T style={{ color: C.ok, fontSize: 13, fontWeight: '600' }}>📍 {p.governorate || 'المحافظة غير محددة'}</T></View>
          {!!p.car && <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,201,60,0.08)', borderWidth: 1, borderColor: 'rgba(255,201,60,0.4)' }}><T style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>🚗 {p.car}</T></View>}
        </View>
        {(() => {
          const mk = p.car ? Object.keys(CARS).find((m) => p.car!.startsWith(m + ' ')) : undefined, sp = mk ? carSpec(mk, p.car!.slice(mk.length + 1)) : null;
          const line = p.car_weight_kg || p.car_length_m ? carSpecText(p.car_weight_kg, p.car_length_m ? +p.car_length_m : null, false) : sp ? carSpecText(sp.kg, sp.m, true) : '';
          return line ? <Muted style={{ fontSize: 12.5 }}>{line}</Muted> : null;
        })()}
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 6 }}>
          <View style={[rtl.row, { justifyContent: 'space-between', padding: 12, borderRadius: R.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }]}><Muted style={{ fontSize: 12 }}>رقم الهاتف</Muted><T style={{ color: C.info, fontWeight: '700', writingDirection: 'ltr' }}>{p.phone || '—'}</T></View>
          <View style={[rtl.row, { justifyContent: 'space-between', padding: 12, borderRadius: R.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, gap: 10 }]}><Muted style={{ fontSize: 12 }}>الإيميل</Muted><T style={{ fontSize: 13, flexShrink: 1, writingDirection: 'ltr' }} numberOfLines={1}>{session.user.email}</T></View>
        </View>
        {(!p.full_name || !p.phone || !p.car) && <T style={{ color: C.warn, fontSize: 13 }}>كمّل بياناتك حتى يتعرف عليك السائق بسرعة.</T>}
        <Btn label="تعديل حسابي" onPress={startEdit} style={{ alignSelf: 'stretch', marginTop: 4 }} />
      </View>

      <Card style={{ gap: 6 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>طلباتي السابقة</T>
        {reqs === null ? <ActivityIndicator color={C.accent} /> : reqs.length === 0 ? <Muted>ما عندك طلبات بعد.</Muted> : reqs.map((x, i) => (
          <View key={i} style={[rtl.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
            <T><T style={{ fontWeight: '800' }}>#{x.number ?? ''}</T> {ISS[x.issue] ?? ''}</T>
            <Muted style={{ fontSize: 13 }}>{ST[x.status] ?? x.status} · {ago(x.created_at)}</Muted>
          </View>
        ))}
      </Card>

      {blocked.length > 0 && (
        <Card style={{ gap: 8 }}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>المحظورون</T>
          {blocked.map(([crane, owner]) => (
            <View key={crane} style={[rtl.row, { justifyContent: 'space-between' }]}>
              <Muted>كرين محظور</Muted>
              <Btn label="فك الحظر" kind="secondary" small onPress={async () => { await unblock(owner); load().catch(() => {}); }} />
            </View>
          ))}
        </Card>
      )}

      <Legal />
      <Btn label="تنزيل بياناتي" kind="secondary" onPress={exportMine} />
      <Btn label="تسجيل خروج" kind="secondary" onPress={() => supabase.auth.signOut()} />
      <View style={{ height: 22 }} />
      <Btn label="حذف حسابي وكل بياناتي" kind="danger" onPress={confirmDelete} />
      <Muted style={{ textAlign: 'center' }}>سند جايك</Muted>
    </>,
  );
}

function Legal() {
  const open = (u: string) => Linking.openURL(u).catch(() => Alert.alert('تعذّر فتح الرابط'));
  return (
    <Card style={{ gap: 8 }}>
      <Btn label="تواصل مع الدعم" kind="secondary" onPress={() => open(PAGES.support)} />
      <Btn label="سياسة الخصوصية" kind="secondary" onPress={() => open(PAGES.privacy)} />
      <Btn label="شروط الاستخدام" kind="secondary" onPress={() => open(PAGES.terms)} />
    </Card>
  );
}

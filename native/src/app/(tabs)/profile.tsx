import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarPicker, carOk, CarVal, OTHER } from '@/components/car-picker';
import { Select } from '@/components/select';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { loadBlocks, unblock } from '@/lib/blocks';
import { ago, GOVS } from '@/lib/data';
import { PAGES } from '@/lib/site';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { CARS } from '@/lib/vehicles';

type Prof = { full_name: string | null; phone: string | null; car: string | null; governorate: string | null };
type ReqRow = { number: number | null; issue: string; status: string; created_at: string };
const ST: Record<string, string> = { open: 'قيد البحث', accepted: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي', expired: 'منتهي' };
const ISS: Record<string, string> = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح مقفلة', accident: 'حادث', other: 'أخرى' };
const inp = { backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right' as const, borderWidth: 1, borderColor: C.line };

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

  const load = useCallback(async () => {
    if (!uid) return;
    const [pr, rq, bl] = await Promise.all([
      supabase.from('profiles').select('full_name,phone,car,governorate').eq('id', uid).maybeSingle(),
      supabase.from('requests').select('number,issue,status,created_at').order('created_at', { ascending: false }).limit(10),
      loadBlocks().catch(() => ({} as Record<string, string>)),
    ]);
    setP((pr.data as Prof | null) ?? { full_name: null, phone: null, car: null, governorate: null });
    setReqs((rq.data as ReqRow[]) ?? []);
    setBlocked(Object.entries(bl));
  }, [uid]);
  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  function startEdit() {
    setName(p?.full_name ?? ''); setPhone(p?.phone ?? ''); setGov(p?.governorate ?? ''); setCar(parseCar(p?.car ?? null)); setErr(''); setEdit(true);
  }
  async function save() {
    const ph = cleanPhone(phone), nm = name.trim().replace(/\s+/g, ' ');
    if (nm.split(' ').length < 3) return setErr('اكتب الاسم الثلاثي.');
    if (!/^07\d{9}$/.test(ph)) return setErr('الرقم لازم 11 رقم ويبدأ بـ 07.');
    if (!gov) return setErr('اختر المحافظة.');
    if (!carOk(car)) return setErr('اختر شركة سيارتك ونوعها.');
    setBusy(true); setErr('');
    const { error } = await supabase.from('profiles').upsert({ id: uid, full_name: nm, phone: ph, car: car.make === OTHER ? car.model : car.make + ' ' + car.model, governorate: gov });
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
      <CarPicker data={CARS} makeLabel="شركة سيارتك" modelLabel="نوع السيارة" value={car} onChange={setCar} />
      {!!err && <T style={{ color: C.danger }}>{err}</T>}
      {busy ? <ActivityIndicator color={C.accent} /> : <Btn label="حفظ" onPress={save} />}
      <Btn label="إلغاء" kind="secondary" onPress={() => setEdit(false)} />
    </Card>,
  );

  return wrap(
    <>
      <Card style={{ gap: 4 }}>
        <View style={rtl.row}><T style={{ fontSize: 18, fontWeight: '800', flex: 1 }}>{p.full_name || 'مستخدم سند جايك'}</T><Btn label="تعديل" kind="secondary" small onPress={startEdit} /></View>
        <Muted>{session.user.email}</Muted>
        {!!p.phone && <Muted>{p.phone}{p.governorate ? ' · ' + p.governorate : ''}</Muted>}
        {!!p.car && <Muted>سيارتي: {p.car}</Muted>}
        {(!p.full_name || !p.phone || !p.car) && <T style={{ color: C.warn, fontSize: 13 }}>كمّل بياناتك حتى يتعرف عليك السائق بسرعة.</T>}
      </Card>

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

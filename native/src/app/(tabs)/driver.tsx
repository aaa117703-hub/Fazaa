import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarPicker, carOk, CarVal } from '@/components/car-picker';
import { Select } from '@/components/select';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ago, fmtDist, GOVS, TYPES, tierOf } from '@/lib/data';
import { report } from '@/lib/report';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { CRANE_MAKES } from '@/lib/vehicles';

const ISSUE: Record<string, string> = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح مقفلة', accident: 'حادث', other: 'أخرى' };
const GROUPS: [string, [string, string][]][] = [
  ['البطاقة الموحدة', [['id_front', 'الوجه الأمامي'], ['id_back', 'الوجه الخلفي']]],
  ['سنوية السيارة', [['vehicle_front', 'الوجه الأمامي'], ['vehicle_back', 'الوجه الخلفي']]],
  ['إجازة السوق (الرخصة)', [['license_front', 'الوجه الأمامي'], ['license_back', 'الوجه الخلفي']]],
];
const DST: Record<string, [string, string]> = { pending: [C.warn, 'قيد المراجعة'], approved: [C.ok, 'مقبول'], rejected: [C.danger, 'مرفوض'] };

type CraneRow = { id: string; name: string; type: string; status: string; lat: number; lng: number; governorate: string | null; listed: boolean; verified: boolean; tier: string | null; crane_make: string | null; crane_model: string | null; updated_at: string };
type Target = { request_id: string; distance_km: number; requests: { id: string; number: number | null; issue: string; destination: string | null; note: string | null; status: string; created_at: string } | null };
type Job = { r: { id: string; lat: number; lng: number; issue: string; customer_id: string; arrived_at?: string | null }; p: { full_name: string | null; phone: string | null; car: string | null } | null };
type Doc = { id: string; kind: string; status: string; note: string | null };
type Wk = { locked?: boolean; views: number; calls: number; requests: number; accepted: number } | null;

const inp = { backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right' as const, borderWidth: 1, borderColor: C.line };
const cleanPhone = (s: string) => s.replace(/\D/g, '').replace(/^00964/, '0').replace(/^964/, '0');
const validPhone = (s: string) => /^07\d{9}$/.test(s);

export default function Driver() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState<CraneRow[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [crane, setCrane] = useState<CraneRow | null>(null);
  const [phone, setPhone] = useState('');
  const [incoming, setIncoming] = useState<Target[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState({ today: 0, total: 0, rating: null as number | null, count: 0 });
  const [wk, setWk] = useState<Wk>(null);
  const [editing, setEditing] = useState(false);
  const known = useRef<Record<string, boolean>>({});
  const busy = useRef(false);
  const fastUntil = useRef(0);

  const load = useCallback(async () => {
    if (!uid || busy.current) return;
    busy.current = true;
    try {
      const { data: rows } = await supabase.from('cranes').select('*').eq('owner_id', uid).order('created_at', { ascending: true }).limit(10);
      const fl = (rows ?? []) as CraneRow[];
      setFleet(fl);
      const c = fl.find((x) => x.id === selId) ?? fl[0] ?? null;
      setCrane(c);
      const ids = fl.map((x) => x.id);
      if (!c) { setIncoming([]); setJobs([]); return; }
      const [ct, calls, rs, tg, jb, dc, w] = await Promise.all([
        supabase.from('crane_contacts').select('phone').eq('crane_id', c.id).maybeSingle(),
        supabase.from('calls').select('created_at').eq('crane_id', c.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('crane_rating_summary').select('rating_avg,rating_count').eq('crane_id', c.id).maybeSingle(),
        supabase.from('request_targets').select('request_id,distance_km,sent_at,requests(id,number,lat,lng,issue,destination,note,status,created_at)').in('crane_id', ids).eq('status', 'sent').order('sent_at', { ascending: false }).limit(20),
        supabase.from('requests').select('*').in('accepted_crane_id', ids).eq('status', 'accepted').order('accepted_at', { ascending: false }),
        supabase.from('driver_documents').select('id,kind,status,note').eq('crane_id', c.id).order('created_at', { ascending: false }),
        supabase.rpc('my_crane_stats', {}),
      ]);
      setPhone((ct.data as { phone?: string } | null)?.phone ?? '');
      const cl = (calls.data ?? []) as { created_at: string }[];
      const day = new Date().toDateString();
      const rsd = rs.data as { rating_avg: number; rating_count: number } | null;
      setStats({ total: cl.length, today: cl.filter((x) => new Date(x.created_at).toDateString() === day).length, rating: rsd ? +rsd.rating_avg : null, count: rsd?.rating_count ?? 0 });
      setDocs((dc.data ?? []) as Doc[]);
      setWk((w.data as Wk) ?? null);
      const inc = ((tg.data ?? []) as unknown as Target[]).filter((t) => t.requests && t.requests.status === 'open');
      for (const t of inc) {
        if (!known.current[t.request_id]) {
          known.current[t.request_id] = true;
          if (Object.keys(known.current).length > inc.length) Alert.alert('طلب جديد قريب منك!', 'افتح الطلبات الواردة وقبّل.');
        }
      }
      setIncoming(inc);
      const js: Job[] = [];
      for (const r of ((jb.data ?? []) as Job['r'][])) {
        const { data: p } = await supabase.from('profiles').select('full_name,phone,car').eq('id', r.customer_id).maybeSingle();
        js.push({ r, p: p as Job['p'] });
      }
      setJobs(js);
    } catch { /* صامت: يعيد المحاولة بالدورة الجاية */ }
    busy.current = false;
    setLoading(false);
  }, [uid, selId]);

  useFocusEffect(useCallback(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]));
  useEffect(() => { if (!uid) { setLoading(false); setCrane(null); } }, [uid]);

  // الموقع: فقط أثناء «متاح» والتطبيق مفتوح
  useEffect(() => {
    if (!crane || crane.status !== 'available') return;
    let sub: Location.LocationSubscription | null = null;
    let last = 0, dead = false;
    const id = crane.id;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 30 }, (p) => {
          const now = Date.now();
          if (dead || now - last < (fastUntil.current > now ? 12000 : 45000)) return;
          last = now;
          supabase.from('cranes').update({ lat: p.coords.latitude, lng: p.coords.longitude, status: 'available' }).eq('id', id).then(() => {});
        });
      } catch { /* */ }
    })();
    return () => { dead = true; sub?.remove(); };
  }, [crane?.id, crane?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const wrap = (c: React.ReactNode) => (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 12 }} keyboardShouldPersistTaps="handled">
      <T style={{ fontSize: 26, fontWeight: '800' }}>لوحة السائق</T>
      {c}
    </ScrollView>
  );

  if (!session) return wrap(<><Muted>سجّل كرينك حتى يوصلك الزبائن القريبين منك.</Muted><Card style={{ gap: 10 }}><Muted>لازم حساب حتى تسجّل كسائق.</Muted><Btn label="دخول / حساب جديد" onPress={() => router.push('/login')} /></Card></>);
  if (loading) return wrap(<ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />);
  if (!crane || editing || adding) return wrap(<RegForm crane={editing ? crane : null} adding={adding} phone={editing ? phone : ''} uid={uid!} onDone={(id) => { setEditing(false); setAdding(false); if (id) setSelId(id); load(); }} onCancel={editing ? () => setEditing(false) : adding ? () => setAdding(false) : undefined} />);

  const avail = crane.status === 'available';
  const pkg = tierOf(crane.tier);

  async function goAvailable() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('الموقع مغلق', 'فعّل الموقع حتى تظهر للزبائن.'); return; }
    try {
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { data, error } = await supabase.from('cranes').update({ status: 'available', lat: p.coords.latitude, lng: p.coords.longitude }).eq('id', crane!.id).select().single();
      if (error) throw error;
      setCrane(data as CraneRow);
    } catch { Alert.alert('تعذّر', 'ما كدرنا نحدّد موقعك أو نحدّث الحالة.'); }
  }
  async function goBusy() {
    const { data, error } = await supabase.from('cranes').update({ status: 'busy' }).eq('id', crane!.id).select().single();
    if (error) Alert.alert('تعذّر', 'جرّب مرة ثانية.'); else setCrane(data as CraneRow);
  }
  async function act(fn: string, id: string, ok?: string) {
    const { error } = await supabase.rpc(fn, { p_request_id: id });
    if (error) Alert.alert('خطأ', error.message.includes('already') || error.message.includes('not') ? 'الطلب ما عاد متاح.' : 'جرّب مرة ثانية.');
    else {
      if (fn === 'accept_request') { fastUntil.current = Date.now() + 2 * 3600000; supabase.functions.invoke('notify', { body: { kind: 'accepted', request_id: id } }).catch(() => {}); }
      if (fn === 'complete_request') fastUntil.current = 0;
      if (fn === 'mark_arrived') supabase.functions.invoke('notify', { body: { kind: 'arrived', request_id: id } }).catch(() => {});
      if (ok) Alert.alert(ok);
    }
    load();
  }
  async function pickDoc(kind: string) {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('الصور مغلقة', 'فعّل الوصول للصور من إعدادات الجهاز.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (r.canceled || !r.assets[0]) return;
      const buf = await (await fetch(r.assets[0].uri)).arrayBuffer();
      const path = uid + '/' + kind + '-' + Date.now() + '.jpg';
      const up = await supabase.storage.from('driver-docs').upload(path, buf, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      for (const o of docs.filter((x) => x.kind === kind && x.status === 'rejected')) await supabase.from('driver_documents').delete().eq('id', o.id);
      const { error } = await supabase.from('driver_documents').insert({ crane_id: crane!.id, owner_id: uid, kind, path });
      if (error) throw error;
      Alert.alert('تم الرفع', 'بانتظار المراجعة.');
      load();
    } catch { Alert.alert('تعذّر الرفع', 'جرّب صورة ثانية أو أعد المحاولة.'); }
  }
  function remove() {
    Alert.alert('حذف تسجيلك كسائق؟', 'راح يختفي كرينك من القائمة والخريطة.', [
      { text: 'لا', style: 'cancel' },
      { text: 'نعم، احذف', style: 'destructive', onPress: async () => { const { error } = await supabase.from('cranes').delete().eq('id', crane!.id); if (error) Alert.alert('تعذّر الحذف'); else { setCrane(null); load(); } } },
    ]);
  }

  return wrap(
    <>
      <Muted>{crane.name} · {crane.type}{crane.governorate ? ' · ' + crane.governorate : ''}{crane.verified ? ' · موثق ✓' : ''}</Muted>
      <Card style={{ gap: 8 }}>
        <View style={[rtl.row, { justifyContent: 'space-between' }]}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>{fleet.length > 1 ? 'كرينات حسابك (' + fleet.length + ')' : 'حساب شركة؟'}</T>
          {fleet.length < 10 && <Btn small kind="secondary" label="+ أضف كرين آخر" onPress={() => setAdding(true)} />}
        </View>
        {fleet.length > 1 ? (
          <>
            <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>
              {fleet.map((x) => (
                <Pressable key={x.id} onPress={() => setSelId(x.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: x.id === crane.id ? C.accent : C.surface2 }}>
                  <T style={{ color: x.id === crane.id ? '#fff' : C.text, fontWeight: '700' }}>{x.name}</T>
                </Pressable>
              ))}
            </View>
            <Muted style={{ fontSize: 13 }}>الطلبات الواردة تصلك لكل كراناتك. الحالة والموقع والوثائق تخص الكرين المحدد.</Muted>
          </>
        ) : <Muted style={{ fontSize: 13 }}>عندك أكثر من كرين؟ أضفهم تحت حساب واحد.</Muted>}
      </Card>
      {!crane.listed && <Card style={{ backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.4)' }}><T style={{ color: C.warn }}>تسجيلك قيد مراجعة الإدارة. ما يظهر للزبائن لين تتم الموافقة.</T></Card>}

      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>حالتك الحين</T>
        <View style={[rtl.row, { gap: 8 }]}>
          <Pressable onPress={() => { if (!avail) goAvailable(); }} style={{ flex: 1, padding: 13, borderRadius: R.md, backgroundColor: avail ? C.ok : C.surface2 }}><T style={{ textAlign: 'center', fontWeight: '800', color: avail ? '#fff' : C.muted }}>متاح</T></Pressable>
          <Pressable onPress={() => { if (avail) goBusy(); }} style={{ flex: 1, padding: 13, borderRadius: R.md, backgroundColor: !avail ? C.danger : C.surface2 }}><T style={{ textAlign: 'center', fontWeight: '800', color: !avail ? '#fff' : C.muted }}>مشغول</T></Pressable>
        </View>
        <Muted>آخر تحديث: {ago(crane.updated_at)}. {avail ? 'موقعك يتحدّث طول ما التطبيق مفتوح.' : 'موقعك ما يتحدّث وأنت «مشغول».'}</Muted>
        {avail && <Muted>إذا سكّرت التطبيق وانت «متاح»، الزبون يشوف تحذير «آخر تحديث قديم». حوّل «مشغول» إذا طلعت.</Muted>}
      </Card>

      {crane.listed && (
        <Card style={{ gap: 10 }}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>طلبات واردة{incoming.length ? ' (' + incoming.length + ')' : ''}</T>
          {incoming.length === 0 && <Muted>{avail ? 'ما كو طلبات هسه. التحديث تلقائي.' : 'حوّل «متاح» حتى توصلك الطلبات.'}</Muted>}
          {incoming.map((t) => { const r = t.requests!; return (
            <View key={t.request_id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 }}>
              <View style={rtl.row}><T style={{ fontWeight: '800', flex: 1 }}>{r.number ? '#' + r.number + ' · ' : ''}{ISSUE[r.issue] ?? r.issue}</T><Muted>{fmtDist(+t.distance_km)} · {ago(r.created_at)}</Muted></View>
              {!!r.destination && <Muted>إلى: {r.destination}</Muted>}
              {!!r.note && <Muted>{r.note}</Muted>}
              <View style={[rtl.row, { gap: 8 }]}><Btn label="قبول" style={{ flex: 1, backgroundColor: C.ok }} onPress={() => act('accept_request', r.id, 'قبلت الطلب. تواصل مع الزبون.')} /><Btn label="رفض" kind="secondary" onPress={() => act('decline_request', r.id)} /></View>
            </View>); })}
        </Card>
      )}

      {jobs.length > 0 && (
        <Card style={{ gap: 10 }}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>طلبات مقبولة</T>
          {jobs.map(({ r, p }) => (
            <View key={r.id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 }}>
              <T style={{ fontWeight: '800' }}>{p?.full_name ?? 'زبون'} · {ISSUE[r.issue] ?? ''}</T>
              {!!p?.car && <Muted>{p.car}</Muted>}
              <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
                {!!p?.phone && <Btn small label="اتصل" style={{ backgroundColor: C.ok }} onPress={async () => { const ok = await Linking.canOpenURL('tel:' + p.phone).catch(() => false); if (ok) Linking.openURL('tel:' + p.phone); else Alert.alert(p.full_name ?? 'الزبون', 'الرقم: ' + p.phone); }} />}
                <Btn small kind="secondary" label="مسار لموقع الزبون" onPress={() => Linking.openURL('http://maps.apple.com/?daddr=' + r.lat + ',' + r.lng).catch(() => {})} />
                {r.arrived_at ? <T style={{ color: C.ok, fontWeight: '800' }}>وصلت ✓</T> : <Btn small label="وصلت للزبون" style={{ backgroundColor: C.ok }} onPress={() => act('mark_arrived', r.id, 'تم إشعار الزبون بوصولك')} />}
                <Btn small label="تم الإنجاز" onPress={() => act('complete_request', r.id, 'تم إنجاز الطلب')} />
                <Btn small kind="ghost" label="إبلاغ عن الزبون" onPress={() => report({ userId: r.customer_id, requestId: r.id })} />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>إحصائياتك</T>
        <View style={[rtl.row, { gap: 8 }]}>
          {([[stats.today, 'اتصالات اليوم'], [stats.total, 'كل الاتصالات'], [stats.rating != null ? '★ ' + stats.rating.toFixed(1) : '—', 'التقييم' + (stats.count ? ' (' + stats.count + ')' : '')]] as [string | number, string][]).map(([v, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: C.surface2, borderRadius: R.md, padding: 10, alignItems: 'center' }}><T style={{ fontSize: 20, fontWeight: '800' }}>{v}</T><Muted style={{ fontSize: 11, textAlign: 'center' }}>{l}</Muted></View>
          ))}
        </View>
      </Card>

      {wk && (
        <Card style={{ gap: 10 }}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>{wk.locked ? 'إحصائيات الأسبوع' : 'إحصائيات آخر 7 أيام'}</T>
          <View style={[rtl.row, { gap: 6, opacity: wk.locked ? 0.4 : 1 }]}>
            {([[wk.locked ? '٠٠' : wk.views, 'مشاهدات'], [wk.locked ? '٠٠' : wk.calls, 'اتصالات'], [wk.locked ? '٠٠' : wk.requests, 'وصلتك'], [wk.locked ? '٠٠' : wk.accepted, 'قبلتها']] as [string | number, string][]).map(([v, l]) => (
              <View key={l} style={{ flex: 1, backgroundColor: C.surface2, borderRadius: R.md, padding: 8, alignItems: 'center' }}><T style={{ fontSize: 18, fontWeight: '800' }}>{v}</T><Muted style={{ fontSize: 11 }}>{l}</Muted></View>
            ))}
          </View>
          {wk.locked && <><Muted>شوف كم زبون شاف ملفك واتصل بيك وكم طلب وصلك. تفتح بالباقة الفضية وأعلى.</Muted><Btn small label="شوف الباقات" onPress={() => router.push('/packages')} /></>}
        </Card>
      )}

      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>وثائقك ({docs.length}/6)</T>
        <Muted>ارفع صوراً واضحة لوجهي كل وثيقة. الإدارة تراجعها وتسجّل بياناتك بنفسها، وبعدها تظهر شارة «موثق». الصور خاصة ولا يراها غير المدير.</Muted>
        {GROUPS.map(([title, slots]) => (
          <View key={title} style={{ gap: 6 }}>
            <T style={{ fontWeight: '700', color: C.accent }}>{title}</T>
            {slots.map(([k, l]) => {
              const mine = docs.find((x) => x.kind === k); const st = mine ? DST[mine.status] : null;
              return (
                <View key={k} style={[rtl.row, { gap: 8, backgroundColor: C.surface2, borderRadius: R.sm, padding: 10 }]}>
                  <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{l}</T>{mine?.status === 'rejected' && !!mine.note && <Muted>السبب: {mine.note}</Muted>}</View>
                  {st ? <T style={{ color: st[0], fontWeight: '800', fontSize: 13 }}>{st[1]}</T> : <Muted>ما انرفع</Muted>}
                  {(!mine || mine.status === 'rejected') && <Btn small kind="secondary" label="رفع" onPress={() => pickDoc(k)} />}
                </View>
              );
            })}
          </View>
        ))}
      </Card>

      <Card style={[rtl.row, { gap: 8 }]}><View style={{ flex: 1 }}><Muted>باقتك</Muted><T style={{ fontWeight: '800', fontSize: 17 }}>{pkg.name}</T></View><Btn small kind="ghost" label="الباقات" onPress={() => router.push('/packages')} /></Card>

      <Btn label="تعديل بياناتي" kind="secondary" onPress={() => setEditing(true)} />
      <Btn label="حذف تسجيلي كسائق" kind="danger" onPress={remove} />
    </>,
  );
}

function RegForm({ crane, adding, phone, uid, onDone, onCancel }: { crane: CraneRow | null; adding?: boolean; phone: string; uid: string; onDone: (id?: string) => void; onCancel?: () => void }) {
  const [make, setMake] = useState<CarVal>({ make: crane?.crane_make ?? '', model: crane?.crane_model ?? '' });
  const [name, setName] = useState(crane?.name ?? '');
  const [type, setType] = useState(crane?.type ?? TYPES[0]);
  const [gov, setGov] = useState(crane?.governorate ?? '');
  const [ph, setPh] = useState(phone);
  const [agree, setAgree] = useState(!!crane);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setPh(phone); }, [phone]);

  async function save() {
    setErr('');
    const p = cleanPhone(ph);
    if (!carOk(make)) return setErr('اختر شركة الكرين وموديله.');
    if (name.trim().length < 3) return setErr('اكتب اسم للكرين.');
    if (!gov) return setErr('اختر المحافظة.');
    if (!validPhone(p)) return setErr('الرقم لازم 11 رقم ويبدأ بـ 07.');
    if (!agree) return setErr('لازم توافق حتى نكمّل.');
    setBusy(true);
    try {
      if (crane) {
        const a = await supabase.from('cranes').update({ name: name.trim(), type, crane_make: make.make, crane_model: make.model, governorate: gov }).eq('id', crane.id);
        if (a.error) throw a.error;
        const b = await supabase.from('crane_contacts').update({ phone: p }).eq('crane_id', crane.id);
        if (b.error) throw b.error;
      } else {
        const perm = await Location.requestForegroundPermissionsAsync();
        let lat: number, lng: number;
        if (perm.status === 'granted') { const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }); lat = l.coords.latitude; lng = l.coords.longitude; }
        else { const g = GOVS.find((x) => x.name === gov)!; lat = g.lat; lng = g.lng; }
        const { data, error } = await supabase.from('cranes').insert({ owner_id: uid, name: name.trim(), type, crane_make: make.make, crane_model: make.model, governorate: gov, lat, lng, status: 'busy', listed: false, verified: false, package: 'free', is_demo: false }).select().single();
        if (error) throw error;
        const c = await supabase.from('crane_contacts').insert({ crane_id: (data as { id: string }).id, phone: p });
        if (c.error) throw c.error;
        Alert.alert('تم التسجيل', 'بانتظار موافقة الإدارة.');
        onDone((data as { id: string }).id); return;
      }
      onDone();
    } catch (e) { setErr((e as { message?: string })?.message ? 'تعذّر الحفظ. تأكد من البيانات وجرّب مرة ثانية.' : 'خطأ'); setBusy(false); }
  }

  return (
    <>
      <Muted>{crane ? 'تعديل بيانات الكرين' : adding ? 'أضف كرين آخر لحسابك (حساب شركة). بعد المراجعة يظهر للزبائن.' : 'سجّل كرينك. بعد مراجعة الإدارة يظهر للزبائن ويوصلك الطلبات.'}</Muted>
      <Card style={{ gap: 12 }}>
        <CarPicker data={CRANE_MAKES} makeLabel="شركة الكرين" modelLabel="موديل الكرين" value={make} onChange={setMake} />
        <View style={{ gap: 6 }}><Muted>اسم الكرين الظاهر للزبائن</Muted><TextInput value={name} onChangeText={setName} maxLength={40} placeholder="مثال: كرين أبو علي" placeholderTextColor={C.muted} style={inp} /></View>
        <View style={{ gap: 6 }}><Muted>نوع الخدمة</Muted><Select full label="نوع الخدمة" value={type} options={TYPES} onChange={setType} /></View>
        <View style={{ gap: 6 }}><Muted>المحافظة اللي تشتغل بيها</Muted><Select full label="المحافظة" value={gov} options={GOVS.map((g) => g.name)} onChange={setGov} allLabel="اختر المحافظة" /></View>
        <View style={{ gap: 6 }}><Muted>رقم الاتصال للزبائن</Muted><TextInput value={ph} onChangeText={setPh} keyboardType="phone-pad" maxLength={16} placeholder="07xxxxxxxxx" placeholderTextColor={C.muted} style={[inp, { writingDirection: 'ltr' }]} /><Muted style={{ fontSize: 12 }}>يظهر فقط للزبائن المسجّلين.</Muted></View>
        {!crane && (
          <>
            <Card style={{ backgroundColor: 'rgba(255,107,44,0.12)', borderColor: 'rgba(255,107,44,0.35)' }}><T style={{ color: C.accent2 }}>أول 20 سائق: 3 أشهر مجاناً بدون أي التزام.</T></Card>
            <View style={[rtl.row, { gap: 10 }]}><Switch value={agree} onValueChange={setAgree} trackColor={{ true: C.accent }} /><Muted style={{ flex: 1 }}>أفهم إن موقعي يتحدّث فقط وأنا «متاح» والتطبيق مفتوح، وإن اسم الكرين ورقمي يظهرون للزبائن.</Muted></View>
          </>
        )}
        {!!err && <T style={{ color: C.danger }}>{err}</T>}
        {busy ? <ActivityIndicator color={C.accent} /> : <Btn label={crane ? 'حفظ' : 'سجّل كرينك'} onPress={save} />}
        {onCancel && <Btn label="إلغاء" kind="secondary" onPress={onCancel} />}
      </Card>
    </>
  );
}

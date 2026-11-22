import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerOffers } from '@/components/bidding';
import { CancelSheet, CUSTOMER_REASONS } from '@/components/cancel-reason';
import { geoAlert, getFix } from '@/lib/geo';
import { BackBar } from '@/components/back-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { dial } from '@/lib/contact';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { askBlock } from '@/lib/blocks';
import { distKm } from '@/lib/data';
import { report } from '@/lib/report';
import { useLive } from '@/lib/live';
import { supabase } from '@/lib/supabase';
import { C, fontFor, R } from '@/lib/theme';

export const AK = 'sanad_active_req';
const ISSUES: [string, string][] = [['tow', 'عطل كامل — أحتاج سحب'], ['battery', 'بطارية'], ['tire', 'إطار'], ['fuel', 'وقود'], ['locked', 'مفاتيح داخل السيارة'], ['accident', 'حادث'], ['other', 'شي ثاني']];
const ISSUE_SHORT: Record<string, string> = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح', accident: 'حادث', other: 'أخرى' };
const issueName = (k: string) => (ISSUES.find((i) => i[0] === k) ?? [0, k])[1];

type Req = { cancel_reason?: string | null; cancelled_by?: string | null; arrived_at?: string | null; id: string; number?: number; status: string; issue: string; lat: number; lng: number; accepted_crane_id: string | null; destination?: string | null; agreed_price?: number | null };
type Info = { id: string; name: string; type: string; verified: boolean; phone: string };
type Trk = { lat: number | null; lng: number | null } | null;

const inp = { fontFamily: fontFor('400'), backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right' as const, borderWidth: 1, borderColor: C.line };
const waNum = (p: string) => { let d = p.replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('964')) return d; if (d.startsWith('0')) d = d.slice(1); return '964' + d; };

export default function Request() {
  const insets = useSafeAreaInsets();
  const { craneId } = useLocalSearchParams<{ craneId?: string }>();
  const [active, setActive] = useState<{ id: string; targets: number | null } | null | undefined>(undefined);
  useEffect(() => { AsyncStorage.getItem(AK).then((v) => setActive(v ? JSON.parse(v) : null)).catch(() => setActive(null)); }, []);
  if (active === undefined) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;
  const wrap = (c: React.ReactNode) => <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: 22, paddingBottom: insets.bottom + 30, gap: 12 }} keyboardShouldPersistTaps="handled">{c}</ScrollView>;
  if (!active) return wrap(<Form craneId={craneId} onSent={(a) => { AsyncStorage.setItem(AK, JSON.stringify(a)).catch(() => {}); setActive(a); }} />);
  return wrap(<Track a={active} onReset={() => { AsyncStorage.removeItem(AK).catch(() => {}); setActive(null); }} />);
}

function Form({ craneId, onSent }: { craneId?: string; onSent: (a: { id: string; targets: number | null }) => void }) {
  const [issue, setIssue] = useState('tow');
  const [dest, setDest] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    setBusy(true); setErr('');
    try {
      let p: { latitude: number; longitude: number };
      try { p = await getFix(); } catch (e) { setBusy(false); setErr('ما كدرنا نحدد موقعك. فعّل الموقع من إعدادات الجهاز وجرّب مرة ثانية.'); geoAlert(e, 'الطلب يحتاج موقعك حتى يوصل لأقرب سائق.'); return; }
      const { data, error } = await supabase.rpc('create_request', { p_lat: p.latitude, p_lng: p.longitude, p_issue: issue, p_destination: dest.trim() || null, p_note: note.trim() || null, p_crane_id: craneId || null });
      if (error) throw error;
      const r = data as { request_id: string; targets: number };
      supabase.functions.invoke('notify', { body: { kind: 'new_request', request_id: r.request_id } }).catch(() => {});
      onSent({ id: r.request_id, targets: r.targets });
    } catch (e) { setErr((e as { message?: string })?.message?.includes('limit') ? 'طلبات كثيرة. انتظر شوي.' : 'تعذّر إرسال الطلب. جرّب مرة ثانية.'); setBusy(false); }
  };
  return (
    <>
      <BackBar /><T style={{ fontSize: 24, fontWeight: '800' }}>سيارتي تعطلت</T>
      <Muted>{craneId ? 'راح يوصل طلبك لهذا الكرين مباشرة، وتتفاوض وياه على السعر داخل التطبيق.' : 'راح نرسل طلبك لأقرب 5 سائقين مناسبين لمشكلتك. أول واحد يقبل يتواصل وياك.'}</Muted>
      <View style={{ gap: 8 }}><Muted>شنو المشكلة؟</Muted>
        <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>
          {ISSUES.map(([k]) => (
            <Pressable key={k} onPress={() => setIssue(k)} accessibilityRole="button" accessibilityLabel={ISSUE_SHORT[k]} style={{ width: '23.5%', minWidth: 74, flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: R.md, backgroundColor: issue === k ? 'rgba(255,201,60,0.16)' : C.surface2, borderWidth: 1.5, borderColor: issue === k ? C.accent : C.line }}>
              <Icon name={k as IconName} size={34} />
              <T style={{ fontSize: 12.5, fontWeight: issue === k ? '800' : '600', color: issue === k ? C.accent : C.text }}>{ISSUE_SHORT[k]}</T>
            </Pressable>
          ))}
        </View>
        <Muted style={{ fontSize: 12.5 }}>{issueName(issue)}</Muted></View>
      <View style={{ gap: 6 }}><Muted>وين تريد توصل؟ (اختياري)</Muted><TextInput value={dest} onChangeText={setDest} maxLength={80} placeholder="مثال: ورشة بالحي الصناعي" placeholderTextColor={C.muted} style={inp} /></View>
      <View style={{ gap: 6 }}><Muted>ملاحظة (اختياري)</Muted><TextInput value={note} onChangeText={setNote} maxLength={140} placeholder="مثال: السيارة على الطريق الدولي" placeholderTextColor={C.muted} style={inp} /></View>
      {!!err && <T style={{ color: C.danger }}>{err}</T>}
      <Btn label={busy ? 'جاري الإرسال…' : 'أرسل الطلب'} disabled={busy} onPress={send} />
      <Btn label="إلغاء" kind="secondary" onPress={() => router.back()} />
    </>
  );
}

function Track({ a, onReset }: { a: { id: string; targets: number | null }; onReset: () => void }) {
  const [r, setR] = useState<Req | null>(null);
  const [crane, setCrane] = useState<Info | null>(null);
  const [trk, setTrk] = useState<Trk>(null);
  const [askCancel, setAskCancel] = useState(false);
  const prev = useRef('');
  const prevArr = useRef<boolean | null>(null);
  const poll = useCallback(async () => {
    const { data } = await supabase.from('requests').select('*').eq('id', a.id).maybeSingle();
    if (!data) { onReset(); return; }
    const q = data as Req;
    if (q.accepted_crane_id && ['accepted', 'completed'].includes(q.status)) {
      const [cr, ct] = await Promise.all([
        supabase.from('cranes').select('id,name,type,verified').eq('id', q.accepted_crane_id).maybeSingle(),
        supabase.from('crane_contacts').select('phone').eq('crane_id', q.accepted_crane_id).maybeSingle(),
      ]);
      if (cr.data) setCrane({ ...(cr.data as Omit<Info, 'phone'>), phone: (ct.data as { phone?: string } | null)?.phone ?? '' });
    }
    if (q.status === 'accepted') { const t = await supabase.rpc('track_request', { p_request_id: q.id }); setTrk((t.data as Trk) ?? null); }
    if (prev.current && prev.current !== q.status && q.status === 'accepted') Alert.alert('كرين قبل طلبك!', 'اتصل بالسائق وتفاهم على السعر.');
    if (q.arrived_at && prevArr.current === false) Alert.alert('وصل الكرين!', 'السائق وصل لموقعك.');
    prevArr.current = !!q.arrived_at;
    prev.current = q.status;
    setR(q);
  }, [a.id, onReset]);
  useLive(() => { poll().catch(() => {}); });
  useEffect(() => { poll().catch(() => {}); const t = setInterval(() => poll().catch(() => {}), 5000); return () => clearInterval(t); }, [poll]);

  if (!r) return <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />;
  const SC: Record<string, [string, string]> = { open: [C.warn, 'قيد البحث'], accepted: [C.ok, 'مؤكد'], completed: ['#60A5FA', 'مكتمل'], cancelled: [C.danger, 'ملغي'], expired: [C.danger, 'منتهي'] };
  const [col, lbl] = SC[r.status] ?? [C.muted, r.status];
  const idx = ({ open: 0, accepted: 1, completed: 2 } as Record<string, number>)[r.status];
  const head = (
    <>
      <View style={[rtl.row, { gap: 8 }]}>
        <T style={{ fontSize: 20, fontWeight: '800', flex: 1 }}>طلب #{r.number ?? ''}</T>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: R.pill, backgroundColor: col + '29' }}><T style={{ color: col, fontWeight: '800' }}>{lbl}</T></View>
      </View>
      {idx != null && (
        <View style={[rtl.row, { gap: 6 }]}>
          {['أُرسل', 'انقبل', 'اكتمل'].map((t, k) => (
            <View key={t} style={{ flex: 1, gap: 4 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: k <= idx ? C.accent : C.surface2 }} /><Muted style={{ textAlign: 'center', fontSize: 12 }}>{t}</Muted></View>
          ))}
        </View>
      )}
      <Muted>{issueName(r.issue)}{r.destination ? ' · إلى: ' + r.destination : ''}</Muted>
    </>
  );
  const cancel = async (reason: string) => { const { error } = await supabase.rpc('cancel_request', { p_request_id: r.id, p_reason: reason }); setAskCancel(false); if (error) Alert.alert('خطأ', 'تعذّر إلغاء الطلب.'); else onReset(); };
  const confirmDone = async (id: string, done: boolean) => { const { error } = await supabase.rpc('customer_confirm', { p_request_id: id, p_done: done }); if (error) Alert.alert('خطأ', 'تعذّر تأكيد الطلب.'); };
  const sheet = <CancelSheet visible={askCancel} title="ليش تلغي الطلب؟" reasons={CUSTOMER_REASONS} onClose={() => setAskCancel(false)} onConfirm={cancel} />;

  if (r.status === 'open') return (<>{head}<Card style={{ gap: 6 }}><T style={{ fontWeight: '800', fontSize: 17 }}>نبحث لك عن كرين…</T><Muted>أرسلنا طلبك إلى {a.targets ?? 'أقرب'} كرين. الطلب ينتهي بعد 15 دقيقة إذا ما انقبل.</Muted><ActivityIndicator color={C.accent} /></Card><CustomerOffers requestId={r.id} onAccepted={() => { poll().catch(() => {}); }} /><Btn label="إلغاء الطلب" kind="danger" onPress={() => setAskCancel(true)} />{sheet}<Btn label="إخفاء (الطلب يبقى شغال)" kind="secondary" onPress={() => router.back()} /></>);
  if (r.status === 'accepted') {
    const me = { latitude: r.lat, longitude: r.lng };
    const has = trk && trk.lat != null && trk.lng != null;
    const d = has ? distKm(me, { lat: trk!.lat!, lng: trk!.lng! }) : null;
    const wa = crane?.phone ? 'https://wa.me/' + waNum(crane.phone) + '?text=' + encodeURIComponent('السلام عليكم، أنا صاحب الطلب #' + (r.number ?? '') + '.\nموقعي: https://maps.google.com/?q=' + r.lat + ',' + r.lng) : '';
    return (
      <>{head}
        <Card style={{ gap: 8, backgroundColor: 'rgba(61,214,140,0.10)', borderColor: 'rgba(61,214,140,0.35)' }}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>انقبل طلبك</T>
          <T style={{ fontSize: 20, fontWeight: '800', color: C.accent }}>{crane?.name ?? 'كرين'}{crane?.verified ? ' ✓' : ''}</T>
          {r.agreed_price ? <T style={{ color: C.ok, fontWeight: '800' }}>السعر المتفق عليه: {r.agreed_price.toLocaleString('en-US')} د.ع</T> : null}
          <Muted>{crane?.type} — {r.agreed_price ? 'اتصل وتفاهم على وقت الوصول.' : 'اتصل وتفاهم على السعر ووقت الوصول.'}</Muted>
          {!!r.arrived_at && <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: R.pill, backgroundColor: C.ok + '29' }}><T style={{ color: C.ok, fontWeight: '800' }}>وصل الكرين ✓</T></View>}
          {has ? (
            <>
              <View style={{ height: 200, borderRadius: R.md, overflow: 'hidden' }}>
                <MapView style={{ flex: 1 }} region={{ latitude: (r.lat + trk!.lat!) / 2, longitude: (r.lng + trk!.lng!) / 2, latitudeDelta: Math.max(0.02, Math.abs(r.lat - trk!.lat!) * 2.4), longitudeDelta: Math.max(0.02, Math.abs(r.lng - trk!.lng!) * 2.4) }}>
                  <Marker coordinate={me} pinColor="orange" title="موقعك" />
                  <Marker coordinate={{ latitude: trk!.lat!, longitude: trk!.lng! }} pinColor="gold" title={crane?.name ?? 'الكرين'} />
                </MapView>
              </View>
              <Muted>{d! < 0.15 ? 'السائق وصل أو قريب جداً' : 'يبعد ' + d!.toFixed(1) + ' كم · يصل تقريباً خلال ' + Math.max(1, Math.round((d! / 35) * 60)) + ' دقيقة'}</Muted>
            </>
          ) : <Muted>الموقع المباشر للسائق يظهر هنا لما يفتح تطبيقه.</Muted>}
          {!!crane?.phone && (
            <>
              <Btn label="اتصل بالسائق" onPress={() => dial(crane.name, crane.phone, wa)} />
              <View style={[rtl.row, { gap: 8 }]}>
                <Btn label="واتساب + موقعي" kind="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(wa).catch(() => {})} />
                <Btn label="مشاركة الرقم" kind="secondary" style={{ flex: 1 }} onPress={() => Share.share({ message: crane.phone }).catch(() => {})} />
              </View>
              <Muted style={{ textAlign: 'center' }}>{crane.phone}</Muted>
            </>
          )}
        </Card>
        <Btn label="تمت الخدمة ✓" onPress={() => confirmDone(r.id, true)} />
        <Btn label="إبلاغ عن مشكلة" kind="secondary" onPress={() => report({ craneId: r.accepted_crane_id, requestId: r.id })} />
        <Btn label="حظر هذا السائق" kind="secondary" onPress={() => r.accepted_crane_id && askBlock(r.accepted_crane_id, crane?.name ?? 'السائق')} />
        <Btn label="إلغاء الطلب" kind="danger" onPress={() => setAskCancel(true)} />
        <Btn label="إخفاء" kind="secondary" onPress={() => router.back()} />
        {sheet}
      </>
    );
  }
  if (r.status === 'completed') return <>{head}<Rate r={r} crane={crane} onDone={onReset} /></>;
  return (<>{head}<Card style={{ gap: 6 }}><T style={{ fontWeight: '800', fontSize: 17 }}>{r.status === 'expired' ? 'انتهى وقت الطلب' : r.cancelled_by === 'crane' ? 'السائق ألغى الطلب' : 'تم إلغاء الطلب'}</T>{r.status === 'cancelled' && !!r.cancel_reason && <Muted>السبب: {r.cancel_reason}</Muted>}<Muted>{r.status === 'expired' ? 'ما قبل أي كرين بالوقت المحدد. جرّب مرة ثانية أو اتصل بالكرينات من القائمة.' : 'تكدر ترسل طلب جديد بأي وقت.'}</Muted></Card><Btn label="طلب جديد" onPress={onReset} /><Btn label="إغلاق" kind="secondary" onPress={() => { onReset(); router.back(); }} /></>);
}

function Rate({ r, crane, onDone }: { r: Req; crane: Info | null; onDone: () => void }) {
  const [v, setV] = useState(0);
  const [cm, setCm] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const send = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('ratings').insert({ request_id: r.id, crane_id: r.accepted_crane_id, customer_id: u.user?.id, stars: v, comment: [...tags, cm.trim()].filter(Boolean).join(' · ').slice(0, 140) || null });
    if (error) { setErr('تعذّر إرسال التقييم.'); return; }
    Alert.alert('شكراً', 'وصل تقييمك.'); onDone(); router.back();
  };
  return (
    <Card style={{ gap: 10 }}>
      <T style={{ fontWeight: '800', fontSize: 17 }}>انتهى الطلب</T>
      <Pressable onPress={() => supabase.rpc('customer_confirm', { p_request_id: r.id, p_done: false }).then(() => Alert.alert('وصلتنا ملاحظتك', 'ما راح يُحسب هذا الطلب على السائق، وراجعناه.'), () => {})}><Muted style={{ textDecorationLine: 'underline' }}>الخدمة ما تمت فعلياً؟ اضغط هنا</Muted></Pressable>
      <Muted>كيف كانت خدمة {crane?.name ?? 'الكرين'}؟</Muted>
      <View style={[rtl.row, { justifyContent: 'center', gap: 6 }]}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setV(n)} hitSlop={8}><T style={{ fontSize: 38, color: C.warn }}>{n <= v ? '★' : '☆'}</T></Pressable>)}</View>
      {v > 0 && (
        <View style={[rtl.row, { flexWrap: 'wrap', gap: 8, justifyContent: 'center' }]}>
          {(v >= 4 ? ['وصل بسرعة', 'محترم', 'سعر عادل', 'شغل نظيف'] : ['تأخر', 'السعر تغيّر', 'تعامل سيء', 'ما وصل']).map((t) => (
            <Pressable key={t} onPress={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: tags.includes(t) ? C.accent : C.surface2 }}>
              <T style={{ color: tags.includes(t) ? C.onAccent : C.text, fontWeight: '700', fontSize: 13 }}>{t}</T>
            </Pressable>
          ))}
        </View>
      )}
      <TextInput value={cm} onChangeText={setCm} maxLength={100} placeholder="تعليق (اختياري)" placeholderTextColor={C.muted} style={inp} />
      {!!err && <T style={{ color: C.danger }}>{err}</T>}
      <Btn label="إرسال التقييم" disabled={!v} onPress={send} />
      <Btn label="تخطّي" kind="secondary" onPress={() => { onDone(); router.back(); }} />
    </Card>
  );
}

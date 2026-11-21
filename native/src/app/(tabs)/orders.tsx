import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { SkeletonList } from '@/components/skeleton';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ago } from '@/lib/data';
import { useLive } from '@/lib/live';
import { supabase } from '@/lib/supabase';
import { C, fontFor, R } from '@/lib/theme';

const AK = 'sanad_active_req';
const ISSUE: Record<string, string> = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح مقفلة', accident: 'حادث', other: 'أخرى' };
const ST: Record<string, [string, string]> = { open: [C.warn, 'قيد البحث'], accepted: [C.ok, 'مؤكد'], completed: ['#60A5FA', 'مكتمل'], cancelled: [C.danger, 'ملغي'], expired: [C.muted, 'منتهي'] };
const FILTERS: [string, string][] = [['all', 'الكل'], ['live', 'جارية'], ['completed', 'مكتملة'], ['cancelled', 'ملغية']];

type Row = { id: string; number: number | null; issue: string; destination: string | null; status: string; created_at: string; agreed_price: number | null; who: string; reason: string | null; cancelled_by: string | null; stars: number | null; incoming?: boolean; distance?: number | null; role: 'me' | 'job' };
type Raw = { id: string; number: number | null; issue: string; destination: string | null; status: string; created_at: string; agreed_price: number | null; cancel_reason: string | null; cancelled_by: string | null; accepted_crane_id: string | null; customer_id: string };
const SEL = 'id,number,issue,destination,status,created_at,agreed_price,cancel_reason,cancelled_by,accepted_crane_id,customer_id';

function OrderCard({ o, open, onToggle, onGo }: { o: Row; open: boolean; onToggle: () => void; onGo: () => void }) {
  const [col, lbl] = o.incoming ? [C.accent, 'طلب وارد'] : (ST[o.status] ?? [C.muted, o.status]);
  const live = o.incoming || o.status === 'open' || o.status === 'accepted';
  return (
    <Pressable onPress={onToggle}>
      <Card style={{ gap: 8, borderColor: live ? col : C.line }}>
        <View style={[rtl.row, { gap: 10 }]}>
          <Icon name={(ISSUE[o.issue] ? o.issue : 'other') as IconName} size={30} />
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontWeight: '800', fontSize: 16 }}>{ISSUE[o.issue] ?? o.issue}</T>
            <Muted style={{ fontSize: 12.5 }}>{ago(o.created_at)}{o.who ? ' · ' + o.who : ''}</Muted>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: col + '29' }}><T style={{ color: col, fontWeight: '800', fontSize: 12.5 }}>{lbl}</T></View>
        </View>
        {!!o.agreed_price && <T style={{ color: C.ok, fontWeight: '800' }}>السعر المتفق: {o.agreed_price.toLocaleString('en-US')} د.ع</T>}
        {open && (
          <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
            {!!o.destination && <Muted>إلى: {o.destination}</Muted>}
            {o.incoming && o.distance != null && <Muted>يبعد عنك {o.distance.toFixed(1)} كم</Muted>}
            <Muted>{o.role === 'me' ? 'السائق' : 'الزبون'}: {o.who || '—'}</Muted>
            {!!o.number && <Muted>رقم الطلب: #{o.number}</Muted>}
            <Muted>التاريخ: {new Date(o.created_at).toLocaleString('ar-IQ')}</Muted>
            {o.status === 'cancelled' && <Muted>ألغاه: {o.cancelled_by === 'crane' ? 'السائق' : o.cancelled_by === 'customer' ? 'الزبون' : '—'}{o.reason ? ' · السبب: ' + o.reason : ''}</Muted>}
            {o.stars != null && <T style={{ color: C.warn, fontWeight: '800' }}>{'★'.repeat(o.stars)}{'☆'.repeat(5 - o.stars)} تقييم الزبون</T>}
            {live && <Btn small label={o.role === 'job' ? (o.incoming ? 'افتح وقبّل' : 'تفاصيل الشغل') : 'تفاصيل الطلب'} onPress={onGo} style={{ marginTop: 4 }} />}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

export default function Orders() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [tab, setTab] = useState<'me' | 'job'>('me');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [mine, setMine] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    try {
      const [rq, cr] = await Promise.all([
        supabase.from('requests').select(SEL).eq('customer_id', uid).order('created_at', { ascending: false }).limit(60),
        supabase.from('cranes').select('id').eq('owner_id', uid).limit(10),
      ]);
      const mineRaw = (rq.data ?? []) as Raw[];
      const cids = [...new Set(mineRaw.map((x) => x.accepted_crane_id).filter(Boolean))] as string[];
      const [names, rts] = await Promise.all([
        cids.length ? supabase.from('cranes').select('id,name').in('id', cids) : Promise.resolve({ data: [] }),
        mineRaw.length ? supabase.from('ratings').select('request_id,stars').in('request_id', mineRaw.map((x) => x.id)) : Promise.resolve({ data: [] }),
      ]);
      const nm = new Map(((names.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name]));
      const st = new Map(((rts.data ?? []) as { request_id: string; stars: number }[]).map((x) => [x.request_id, x.stars]));
      setMine(mineRaw.map((x) => ({ id: x.id, number: x.number, issue: x.issue, destination: x.destination, status: x.status, created_at: x.created_at, agreed_price: x.agreed_price, who: x.accepted_crane_id ? nm.get(x.accepted_crane_id) ?? '' : '', reason: x.cancel_reason, cancelled_by: x.cancelled_by, stars: st.get(x.id) ?? null, role: 'me' as const })));

      const ids = ((cr.data ?? []) as { id: string }[]).map((x) => x.id);
      setIsDriver(ids.length > 0);
      if (ids.length) {
        const [done, inc] = await Promise.all([
          supabase.from('requests').select(SEL).in('accepted_crane_id', ids).order('created_at', { ascending: false }).limit(60),
          supabase.from('request_targets').select('distance_km,requests!inner(' + SEL + ')').in('crane_id', ids).eq('status', 'sent').eq('requests.status', 'open').limit(30),
        ]);
        const doneRaw = (done.data ?? []) as Raw[];
        const incRaw = ((inc.data ?? []) as unknown as { distance_km: number; requests: Raw }[]);
        const custIds = [...new Set([...doneRaw.map((x) => x.customer_id), ...incRaw.map((x) => x.requests.customer_id)])].slice(0, 40);
        const ps = custIds.length ? await supabase.from('profiles').select('id,full_name').in('id', custIds) : { data: [] };
        const pn = new Map(((ps.data ?? []) as { id: string; full_name: string | null }[]).map((x) => [x.id, x.full_name ?? '']));
        const rr = doneRaw.length ? await supabase.from('ratings').select('request_id,stars').in('request_id', doneRaw.map((x) => x.id)) : { data: [] };
        const rs = new Map(((rr.data ?? []) as { request_id: string; stars: number }[]).map((x) => [x.request_id, x.stars]));
        const toRow = (x: Raw, extra?: Partial<Row>): Row => ({ id: x.id, number: x.number, issue: x.issue, destination: x.destination, status: x.status, created_at: x.created_at, agreed_price: x.agreed_price, who: pn.get(x.customer_id) ?? '', reason: x.cancel_reason, cancelled_by: x.cancelled_by, stars: rs.get(x.id) ?? null, role: 'job', ...extra });
        const incRows = incRaw.map((x) => toRow(x.requests, { incoming: true, distance: Number(x.distance_km), who: '' }));
        const seen = new Set(incRows.map((x) => x.id));
        setJobs([...incRows, ...doneRaw.filter((x) => !seen.has(x.id)).map((x) => toRow(x))]);
      } else setJobs([]);
    } finally { setLoading(false); }
  }, [uid]);
  useFocusEffect(useCallback(() => { load().catch(() => setLoading(false)); const t = setInterval(() => load().catch(() => {}), 15000); return () => clearInterval(t); }, [load]));

  useLive(() => { load().catch(() => {}); });

  const list = useMemo(() => {
    const src = tab === 'job' && isDriver ? jobs : mine;
    const n = q.replace(/\D/g, '');
    return src.filter((o) => {
      if (filter === 'live' && !(o.incoming || o.status === 'open' || o.status === 'accepted')) return false;
      if (filter === 'completed' && o.status !== 'completed') return false;
      if (filter === 'cancelled' && !['cancelled', 'expired'].includes(o.status)) return false;
      if (n && !String(o.number ?? '').includes(n)) return false;
      return true;
    });
  }, [tab, isDriver, jobs, mine, filter, q]);

  const go = async (o: Row) => {
    if (o.role === 'job') { router.navigate('/driver' as never); return; }
    await AsyncStorage.setItem(AK, JSON.stringify({ id: o.id, targets: null })).catch(() => {});
    router.push('/request');
  };

  if (!session) return <View style={{ flex: 1, backgroundColor: C.bg, padding: 20, justifyContent: 'center', gap: 12 }}><T style={{ fontSize: 22, fontWeight: '800' }}>الطلبات</T><Muted>سجّل دخول حتى تشوف طلباتك.</Muted><Btn label="دخول / حساب جديد" onPress={() => router.push('/login')} /></View>;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => { load().catch(() => {}); }} tintColor={C.accent} />}
      contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 16, paddingBottom: 40, gap: 10 }} keyboardShouldPersistTaps="handled">
      <T style={{ fontSize: 26, fontWeight: '800', color: C.accent }}>الطلبات</T>
      {isDriver && (
        <View style={[rtl.row, { gap: 8 }]}>
          {([['me', 'طلباتي'], ['job', 'شغلي كسائق']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => { setTab(k); setOpenId(null); }} style={{ flex: 1, padding: 12, borderRadius: R.md, backgroundColor: tab === k ? C.accent : C.surface2 }}><T style={{ textAlign: 'center', fontWeight: '800', color: tab === k ? C.onAccent : C.text }}>{l}</T></Pressable>
          ))}
        </View>
      )}
      <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
        {FILTERS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: filter === k ? C.accent : C.surface2 }}><T style={{ fontWeight: '700', fontSize: 13.5, color: filter === k ? C.onAccent : C.text }}>{l}</T></Pressable>
        ))}
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="ابحث برقم الطلب" placeholderTextColor={C.muted} keyboardType="number-pad" style={{ fontFamily: fontFor('400'), backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, textAlign: 'right', borderWidth: 1, borderColor: C.line }} />
      {loading ? <SkeletonList n={4} kind="row" /> : list.length === 0 ? (
        <Card style={{ gap: 8, alignItems: 'center' }}><T style={{ fontWeight: '800' }}>ما اكو طلبات هنا</T><Muted style={{ textAlign: 'center' }}>{tab === 'job' && isDriver ? 'الطلبات الواردة وشغلك السابق يظهر هنا.' : 'طلباتك الحالية والسابقة تظهر هنا مع التفاصيل.'}</Muted></Card>
      ) : list.map((o) => <OrderCard key={o.role + o.id} o={o} open={openId === o.role + o.id} onToggle={() => setOpenId(openId === o.role + o.id ? null : o.role + o.id)} onGo={() => go(o)} />)}
    </ScrollView>
  );
}

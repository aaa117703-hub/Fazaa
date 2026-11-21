import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { SkeletonList } from '@/components/skeleton';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ago } from '@/lib/data';
import { useLive } from '@/lib/live';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

const ISSUE: Record<string, string> = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح مقفلة', accident: 'حادث', other: 'أخرى' };
type Open = { id: string; number: number | null; issue: string; destination: string | null; note: string | null; distance_km: number; created_at: string; joined: boolean; offers: number };
type Job = { id: string; number: number | null; issue: string; status: string; agreed_price: number | null; created_at: string; completed_at: string | null; arrived_at: string | null };

const money = (n: number | null) => (n ? n.toLocaleString('en-US') + ' د.ع' : 'بدون سعر');

/** رئيسية صاحب الكرين: الطلبات المتاحة بمنطقته، شغله الجاري، وما أنجزه اليوم مع الأسعار. */
export function OwnerFeed() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [crane, setCrane] = useState<{ id: string; name: string; status: string } | null>(null);
  const [open, setOpen] = useState<Open[]>([]);
  const [live, setLive] = useState<Job[]>([]);
  const [done, setDone] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const { data: cr } = await supabase.from('cranes').select('id,name,status').eq('owner_id', uid).order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (!cr) { setLoading(false); return; }
      setCrane(cr as typeof crane);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const SEL = 'id,number,issue,status,agreed_price,created_at,completed_at,arrived_at';
      const [o, l, d] = await Promise.all([
        supabase.rpc('open_requests_nearby', { p_crane_id: cr.id, p_limit: 30 }),
        supabase.from('requests').select(SEL).eq('accepted_crane_id', cr.id).eq('status', 'accepted').order('created_at', { ascending: false }).limit(10),
        supabase.from('requests').select(SEL).eq('accepted_crane_id', cr.id).eq('status', 'completed').gte('completed_at', today.toISOString()).order('completed_at', { ascending: false }).limit(30),
      ]);
      setOpen((o.data ?? []) as Open[]);
      setLive((l.data ?? []) as Job[]);
      setDone((d.data ?? []) as Job[]);
    } finally { setLoading(false); }
  }, [uid]);
  useLive(() => { load().catch(() => {}); });
  useEffect(() => { load().catch(() => setLoading(false)); const t = setInterval(() => load().catch(() => {}), 10000); return () => clearInterval(t); }, [load]);

  async function take(o: Open) {
    if (!crane || busy) return;
    setBusy(o.id);
    const { error } = await supabase.rpc('join_request', { p_request_id: o.id, p_crane_id: crane.id });
    setBusy(null);
    if (error) { Alert.alert('ما كدرنا نفتح الطلب', /too far/.test(error.message) ? 'الطلب بعيد عنك.' : 'يمكن انقبل أو انلغى.'); load().catch(() => {}); return; }
    router.navigate('/driver' as never);
  }

  const total = done.reduce((a, x) => a + (x.agreed_price ?? 0), 0);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => { load().catch(() => {}); }} tintColor={C.accent} />}
      contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 16, paddingBottom: 120, gap: 12 }}>
      <View style={[rtl.row, { gap: 8 }]}>
        <T style={{ fontSize: 26, fontWeight: '800', color: C.accent, flex: 1 }}>الطلبات</T>
        <Btn small kind="secondary" label="المساعد" onPress={() => router.push('/assist')} />
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="الإعدادات" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}><Icon name="settings" size={24} /></Pressable>
      </View>
      {!crane && !loading && (
        <Card style={{ gap: 8, borderColor: C.accent }}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>سجّل كرينك حتى تبدأ</T>
          <Muted>حسابك صاحب كرين. سجّل كرينك وارفع الوثائق من تبويب «سائق»، وبعد التوثيق تجيك الطلبات.</Muted>
          <Btn label="سجّل كرينك" onPress={() => router.navigate('/driver' as never)} />
        </Card>
      )}
      {crane && (
        <Card style={{ gap: 6 }}>
          <View style={[rtl.row, { gap: 8 }]}>
            <T style={{ fontWeight: '800', flex: 1 }}>{crane.name}</T>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: (crane.status === 'available' ? C.ok : C.warn) + '29' }}><T style={{ color: crane.status === 'available' ? C.ok : C.warn, fontWeight: '800', fontSize: 12.5 }}>{crane.status === 'available' ? 'متاح' : 'مشغول'}</T></View>
          </View>
          <Muted style={{ fontSize: 12.5 }}>غيّر حالتك ووثائقك من تبويب «سائق».</Muted>
        </Card>
      )}

      {live.length > 0 && (
        <View style={{ gap: 8 }}>
          <T style={{ fontWeight: '800', fontSize: 17 }}>شغل جاري</T>
          {live.map((j) => (
            <Card key={j.id} style={{ gap: 8, borderColor: C.ok }}>
              <View style={[rtl.row, { gap: 10 }]}>
                <Icon name={(ISSUE[j.issue] ? j.issue : 'other') as IconName} size={28} />
                <T style={{ fontWeight: '800', flex: 1 }}>{ISSUE[j.issue] ?? j.issue}</T>
                <T style={{ color: C.ok, fontWeight: '800' }}>{money(j.agreed_price)}</T>
              </View>
              <Btn label={j.arrived_at ? 'أنهِ الطلب' : 'وضع التوجيه'} onPress={() => router.push({ pathname: '/job', params: { id: j.id } })} />
            </Card>
          ))}
        </View>
      )}

      <View style={{ gap: 8 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>طلبات متاحة بمنطقتك</T>
        {loading ? <SkeletonList n={3} kind="row" /> : open.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 6 }}><T style={{ fontWeight: '800' }}>ما اكو طلبات هسه</T><Muted style={{ textAlign: 'center' }}>أي طلب جديد قريب منك يطلع هنا تلقائياً.</Muted></Card>
        ) : open.map((o) => (
          <Card key={o.id} style={{ gap: 8 }}>
            <View style={[rtl.row, { gap: 10 }]}>
              <Icon name={(ISSUE[o.issue] ? o.issue : 'other') as IconName} size={30} />
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: '800', fontSize: 16 }}>{ISSUE[o.issue] ?? o.issue}</T>
                <Muted style={{ fontSize: 12.5 }}>يبعد {Number(o.distance_km).toFixed(1)} كم · {ago(o.created_at)}</Muted>
              </View>
              {o.joined && <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: C.accent + '29' }}><T style={{ color: C.accent, fontWeight: '800', fontSize: 12.5 }}>{o.offers > 0 ? 'قدّمت عرض' : 'مفتوح'}</T></View>}
            </View>
            {!!o.destination && <Muted>إلى: {o.destination}</Muted>}
            {!!o.note && <Muted numberOfLines={2}>{o.note}</Muted>}
            <Btn label={busy === o.id ? '...' : o.joined ? 'تابع الطلب' : 'افتح وقدّم عرضك'} disabled={busy === o.id} onPress={() => (o.joined ? router.navigate('/driver' as never) : take(o))} />
          </Card>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <View style={[rtl.row, { gap: 8 }]}>
          <T style={{ fontWeight: '800', fontSize: 17, flex: 1 }}>أنجزت اليوم</T>
          <T style={{ color: C.accent, fontWeight: '800' }}>{done.length} طلب · {total.toLocaleString('en-US')} د.ع</T>
        </View>
        {done.length === 0 ? <Muted>ما أنجزت طلبات اليوم بعد.</Muted> : done.map((j) => (
          <Card key={j.id} style={{ gap: 4 }}>
            <View style={[rtl.row, { gap: 10 }]}>
              <Icon name={(ISSUE[j.issue] ? j.issue : 'other') as IconName} size={24} />
              <T style={{ fontWeight: '700', flex: 1 }}>{ISSUE[j.issue] ?? j.issue}</T>
              <T style={{ color: C.ok, fontWeight: '800' }}>{money(j.agreed_price)}</T>
            </View>
            {!!j.completed_at && <Muted style={{ fontSize: 12.5 }}>{ago(j.completed_at)}</Muted>}
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

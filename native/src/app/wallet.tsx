import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { tierOf } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

type Plan = { tier: string; price: number; free_period: boolean; free_until: string | null; quota: number | null; unlimited: boolean; used: number; over: number; extra_fee: number; shadow_extra: number; sub_expires_at: string | null; guarantee_eligible: boolean; guarantee_used: boolean };
type Row = { id: string; price: number | null; amount: number; status: string; created_at: string; requests?: { number: number | null } | null };
const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const fmtDate = (iso: string) => { const d = new Date(iso); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
const n = (v: number) => v.toLocaleString('en-US');

// اشتراكي ومحفظتي: الباقة الحالية، استهلاك الشهر، الرسوم (ظلّية حالياً)
export default function Wallet() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [bal, setBal] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!session) { setLoading(false); return; }
    Promise.all([
      supabase.rpc('my_plan'),
      supabase.from('fee_ledger').select('id,price,amount,status,created_at,requests(number)').order('created_at', { ascending: false }).limit(20),
      supabase.from('driver_wallets').select('balance').maybeSingle(),
    ]).then(([p, l, w]) => {
      setPlan((p.data as Plan) ?? null);
      setRows((l.data as unknown as Row[]) ?? []);
      setBal((w.data as { balance: number } | null)?.balance ?? 0);
    }, () => {}).finally(() => setLoading(false));
  }, [session]));

  const [gBusy, setGBusy] = useState(false);
  const claim = async () => {
    setGBusy(true);
    const { error } = await supabase.rpc('claim_guarantee');
    setGBusy(false);
    if (error) { Alert.alert('خطأ', 'تعذّر تفعيل الضمانة.'); return; }
    Alert.alert('تم', 'مدّدنا اشتراكك شهر مجاناً.');
    const { data } = await supabase.rpc('my_plan'); if (data) setPlan(data as Plan);
  };
  const t = tierOf(plan?.tier);
  const pct = plan && plan.quota ? Math.min(1, plan.used / plan.quota) : 0;
  const days = plan?.free_until ? Math.max(0, Math.ceil((Date.parse(plan.free_until) - Date.now()) / 86400000)) : 0;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 12, paddingBottom: 60, gap: 12 }}>
      <BackBar /><T style={{ fontSize: 26, fontWeight: '800' }}>اشتراكي ومحفظتي</T>
      {loading ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} /> : !plan ? (
        <Card style={{ gap: 8 }}><T style={{ fontWeight: '800' }}>سجّل كرينك أولاً</T><Muted>الاشتراك والمحفظة تظهر بعد تسجيل كرين بحسابك.</Muted><Btn label="تسجيل كرين" onPress={() => router.replace('/driver' as never)} /></Card>
      ) : (
        <>
          <Card style={{ gap: 10, borderColor: t.color, borderWidth: 1.5 }}>
            <View style={[rtl.row, { gap: 8 }]}>
              <View style={{ flex: 1 }}><Muted style={{ fontSize: 12.5 }}>باقتك</Muted><T style={{ fontSize: 22, fontWeight: '800', color: t.color }}>{t.name}</T></View>
              {plan.free_period && <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: C.ok + '29' }}><T style={{ color: C.ok, fontWeight: '800', fontSize: 12.5 }}>فترة إطلاق مجانية</T></View>}
            </View>
            {plan.free_period ? (
              <Muted>كل السائقين على الباقة المجانية حتى {plan.free_until ? fmtDate(plan.free_until) : ''} (باقي {days} يوم). ما تدفع شي، وراح نبلغك قبل 30 يوم من أي رسوم.</Muted>
            ) : plan.unlimited ? <Muted>طلبات مكتملة بدون حد بباقتك.</Muted> : null}
            {!plan.unlimited && plan.quota != null && (
              <>
                <View style={[rtl.row, { justifyContent: 'space-between' }]}>
                  <T style={{ fontWeight: '800' }}>الطلبات المكتملة هذا الشهر</T>
                  <T style={{ fontWeight: '800', color: pct >= 1 ? C.warn : C.accent }}>{plan.used} / {plan.quota}</T>
                </View>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: C.surface2, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: pct >= 1 ? C.warn : C.ok }} />
                </View>
                {plan.over > 0 && (
                  <Muted>تجاوزت الحد بـ {plan.over} طلب. {plan.free_period ? 'خلال فترة الإطلاق ما يُحسب عليك شي.' : 'كل طلب إضافي ' + n(plan.extra_fee) + ' د.ع.'}</Muted>
                )}
              </>
            )}
            {plan.unlimited && <T style={{ fontWeight: '800' }}>{plan.used} طلب مكتمل هذا الشهر</T>}
            <Muted style={{ fontSize: 12 }}>يُحسب الطلب عند اكتماله وتأكيد الزبون. الطلب الملغي أو المتنازع عليه ما ينحسب.</Muted>
            <Btn label="شوف الباقات" kind="secondary" onPress={() => router.push('/packages')} />
          </Card>

          {plan.guarantee_eligible && (
            <Card style={{ gap: 8, borderColor: C.ok, backgroundColor: C.ok + '14' }}>
              <T style={{ fontWeight: '800', fontSize: 16 }}>ضمانة أول شهر</T>
              <Muted>ما انكمل لك أي طلب بأول شهر مدفوع. تكدر تمدد اشتراكك شهر مجاناً، لمرة واحدة.</Muted>
              <Btn label="مدّد اشتراكي شهر" onPress={claim} disabled={gBusy} />
            </Card>
          )}

          <Card style={{ gap: 8 }}>
            <View style={[rtl.row, { gap: 8 }]}>
              <T style={{ fontWeight: '800', fontSize: 17, flex: 1 }}>المحفظة</T>
              <T style={{ fontWeight: '800', fontSize: 20, color: C.accent }}>{n(bal)} د.ع</T>
            </View>
            <Muted>شحن الرصيد غير متاح حالياً. راح يُفعَّل بعد فترة الإطلاق مع إشعار مسبق.</Muted>
            {!plan.free_period && plan.shadow_extra > 0 && <Muted>رسوم الطلبات الإضافية لهذا الشهر: {n(plan.shadow_extra)} د.ع.</Muted>}
          </Card>

          <Card style={{ gap: 8 }}>
            <T style={{ fontWeight: '800', fontSize: 17 }}>سجل الرسوم</T>
            <Muted style={{ fontSize: 12.5 }}>حساب تجريبي يوضح شكل الرسوم مستقبلاً. لا يُخصم منك شي حالياً.</Muted>
            {rows.length === 0 ? <Muted>ما كو حركات بعد.</Muted> : rows.map((r) => (
              <View key={r.id} style={[rtl.row, { gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }]}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>طلب {r.requests?.number != null ? '#' + r.requests.number : ''}</T>
                  <Muted style={{ fontSize: 12 }}>{fmtDate(r.created_at)}{r.price ? ' · سعر متفق ' + n(r.price) : ''}{r.status === 'void' ? ' · ملغي' : ''}</Muted>
                </View>
                <T style={{ fontWeight: '800', color: r.status === 'void' ? C.muted : C.text }}>{n(r.amount)}</T>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

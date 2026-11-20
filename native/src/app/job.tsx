import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, View, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { CancelSheet, CRANE_REASONS } from '@/components/cancel-reason';
import { Btn, Muted, T, rtl } from '@/components/ui';
import { dial } from '@/lib/contact';
import { fmtDist } from '@/lib/data';
import { getFix } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

type LL = { latitude: number; longitude: number };
type Cust = { full_name: string | null; phone: string | null };
type Req = { id: string; number: number | null; lat: number; lng: number; issue: string; destination: string | null; note: string | null; status: string; customer_id: string; agreed_price: number | null; arrived_at: string | null };
const ISSUE: Record<string, string> = { tow: 'سحب', battery: 'بطارية', tire: 'إطار', fuel: 'وقود', locked: 'مفاتيح مقفلة', accident: 'حادث', other: 'أخرى' };

function km(a: LL, b: LL) {
  const r = Math.PI / 180, dLa = (b.latitude - a.latitude) * r, dLo = (b.longitude - a.longitude) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

/** وضع التوجيه للسائق: خريطة للزبون، «وصلت»، «تم الإنجاز»، وبعدها ملخص يومك. */
export default function Job() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [r, setR] = useState<Req | null>(null);
  const [cust, setCust] = useState<Cust | null>(null);
  const [me, setMe] = useState<LL | null>(null);
  const [line, setLine] = useState<LL[] | null>(null);
  const [info, setInfo] = useState<{ km: number; min: number } | null>(null);
  const [done, setDone] = useState<{ today: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const map = useRef<MapView>(null);
  const lastRoute = useRef<LL | null>(null);
  const dead = useRef(false);

  const poll = useCallback(async () => {
    const { data } = await supabase.from('requests').select('id,number,lat,lng,issue,destination,note,status,customer_id,agreed_price,arrived_at').eq('id', id).maybeSingle();
    if (dead.current) return;
    if (!data) { router.back(); return; }
    setR(data as Req);
  }, [id]);

  useEffect(() => {
    dead.current = false;
    poll().catch(() => {});
    const t = setInterval(() => poll().catch(() => {}), 5000);
    return () => { dead.current = true; clearInterval(t); };
  }, [poll]);

  useEffect(() => {
    if (!r?.customer_id || cust) return;
    supabase.from('profiles').select('full_name,phone').eq('id', r.customer_id).maybeSingle().then(({ data }) => { if (data) setCust(data as Cust); });
  }, [r?.customer_id, cust]);

  // موقع السائق الحي
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null, off = false;
    (async () => {
      try { const p = await getFix(); if (!off) setMe({ latitude: p.latitude, longitude: p.longitude }); } catch { /* */ }
      try {
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 40, timeInterval: 10000 }, (l) => { if (!off) setMe({ latitude: l.coords.latitude, longitude: l.coords.longitude }); });
      } catch { /* */ }
    })();
    return () => { off = true; sub?.remove(); };
  }, []);

  // مسار الطريق (يتحدّث إذا تحرّك السائق أكثر من 300م)
  useEffect(() => {
    if (!me || !r) return;
    const dest = { latitude: r.lat, longitude: r.lng };
    setInfo((x) => x ?? { km: km(me, dest), min: Math.round((km(me, dest) / 40) * 60) });
    if (lastRoute.current && km(lastRoute.current, me) < 0.3) return;
    lastRoute.current = me;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    fetch(`https://router.project-osrm.org/route/v1/driving/${me.longitude},${me.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`, { signal: ctl.signal })
      .then((x) => x.json()).then((j) => {
        const rt = j?.routes?.[0];
        if (rt) { setLine((rt.geometry.coordinates as [number, number][]).map(([lo, la]) => ({ latitude: la, longitude: lo }))); setInfo({ km: rt.distance / 1000, min: Math.max(1, Math.round(rt.duration / 60)) }); }
      }).catch(() => { setInfo({ km: km(me, dest), min: Math.round((km(me, dest) / 40) * 60) }); }).finally(() => clearTimeout(t));
  }, [me, r]);

  useEffect(() => {
    if (me && r) setTimeout(() => map.current?.fitToCoordinates([me, { latitude: r.lat, longitude: r.lng }], { edgePadding: { top: 110, right: 50, bottom: 300, left: 50 }, animated: true }), 400);
  }, [!!me, !!r, line]); // eslint-disable-line react-hooks/exhaustive-deps

  async function arrived() {
    if (!r || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('mark_arrived', { p_request_id: r.id });
    setBusy(false);
    if (error) { Alert.alert('خطأ', 'جرّب مرة ثانية.'); return; }
    supabase.functions.invoke('notify', { body: { kind: 'arrived', request_id: r.id } }).catch(() => {});
    poll().catch(() => {});
  }
  async function finish() {
    if (!r || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('complete_request', { p_request_id: r.id });
    if (error) { setBusy(false); Alert.alert('خطأ', 'تعذّر إنهاء الطلب. جرّب مرة ثانية.'); return; }
    const { data } = await supabase.rpc('driver_earnings');
    const m: Record<string, { jobs: number; total: number }> = {};
    for (const x of (data ?? []) as { period: string; jobs: number; total: number }[]) m[x.period] = { jobs: x.jobs, total: Number(x.total) };
    setDone({ today: m.today?.jobs ?? 1, total: m.today?.total ?? 0 });
    setBusy(false);
    poll().catch(() => {});
  }
  async function cancel(reason: string) {
    if (!r) return;
    const { error } = await supabase.rpc('crane_cancel_request', { p_request_id: r.id, p_reason: reason });
    setAskCancel(false);
    if (error) Alert.alert('خطأ', 'تعذّر إلغاء الطلب.'); else router.back();
  }

  if (!r) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;
  const dest = { latitude: r.lat, longitude: r.lng };
  const name = cust?.full_name || 'الزبون';
  const near = info && info.km < 0.15;
  const sheet: ViewStyle = { position: 'absolute', left: 14, right: 14, bottom: insets.bottom + 14, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MapView ref={map} style={{ flex: 1 }} showsUserLocation initialRegion={{ ...dest, latitudeDelta: 0.06, longitudeDelta: 0.06 }}>
        <Marker coordinate={dest} title={name} pinColor={C.accent} />
        {me && <Polyline coordinates={line ?? [me, dest]} strokeColor={C.accent} strokeWidth={5} lineDashPattern={line ? undefined : [10, 8]} />}
      </MapView>
      <BackBar style={{ position: 'absolute', right: 14, top: insets.top + 10 }} />

      {done ? (
        <View style={sheet}>
          <T style={{ fontSize: 22, fontWeight: '800', color: C.ok }}>تم إنجاز الطلب ✓</T>
          <T style={{ fontWeight: '800' }}>أنجزت اليوم {done.today} {done.today === 1 ? 'طلب' : 'طلبات'}</T>
          {!!r.agreed_price && <Muted>هذا الطلب: {r.agreed_price.toLocaleString('en-US')} د.ع · أرباح اليوم: {done.total.toLocaleString('en-US')} د.ع</Muted>}
          <Muted>الزبون راح يقيّم خدمتك.</Muted>
          <Btn label="رجوع" onPress={() => router.back()} />
        </View>
      ) : r.status === 'cancelled' || r.status === 'expired' ? (
        <View style={sheet}>
          <T style={{ fontSize: 19, fontWeight: '800', color: C.danger }}>الطلب انلغى</T>
          <Muted>الزبون ألغى الطلب. ترجع لقائمتك.</Muted>
          <Btn label="رجوع" onPress={() => router.back()} />
        </View>
      ) : r.status === 'completed' ? (
        <View style={sheet}><T style={{ fontWeight: '800' }}>الطلب مكتمل.</T><Btn label="رجوع" onPress={() => router.back()} /></View>
      ) : (
        <View style={sheet}>
          <View style={[rtl.row, { gap: 8 }]}>
            <T style={{ fontSize: 18, fontWeight: '800', flex: 1 }}>{name}{r.number ? ' · #' + r.number : ''}</T>
            {!!r.agreed_price && <T style={{ color: C.ok, fontWeight: '800' }}>{r.agreed_price.toLocaleString('en-US')} د.ع</T>}
          </View>
          <Muted>{ISSUE[r.issue] ?? r.issue}{r.destination ? ' · إلى: ' + r.destination : ''}{r.note ? ' · ' + r.note : ''}</Muted>
          {r.arrived_at ? (
            <T style={{ color: C.ok, fontWeight: '800' }}>وصلت للزبون ✓ — خلّص الشغل وبعدها اضغط «تم الإنجاز»</T>
          ) : info ? (
            <T style={{ fontWeight: '700' }}>{near ? 'أنت قريب جداً من الزبون' : fmtDist(info.km) + ' · حوالي ' + info.min + ' دقيقة'}</T>
          ) : <View style={[rtl.row, { gap: 8 }]}><ActivityIndicator color={C.accent} /><Muted>جاري تحديد موقعك…</Muted></View>}
          <View style={[rtl.row, { gap: 8 }]}>
            {!!cust?.phone && <Btn small label="اتصل" style={{ flex: 1, backgroundColor: C.ok }} onPress={() => dial(name, cust.phone ?? '')} />}
            <Btn small kind="secondary" label="خرائط" style={{ flex: 1 }} onPress={() => Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + r.lat + ',' + r.lng).catch(() => {})} />
            <Btn small kind="ghost" label="إلغاء" style={{ flex: 1 }} onPress={() => setAskCancel(true)} />
          </View>
          {r.arrived_at
            ? <Btn label={busy ? '...' : 'تم الإنجاز'} disabled={busy} onPress={finish} style={{ minHeight: 54 }} />
            : <Btn label={busy ? '...' : 'وصلت للزبون'} disabled={busy} onPress={arrived} style={{ minHeight: 54, backgroundColor: C.ok }} />}
        </View>
      )}
      <CancelSheet visible={askCancel} title="ليش تلغي الطلب؟" reasons={CRANE_REASONS} onClose={() => setAskCancel(false)} onConfirm={cancel} />
    </View>
  );
}

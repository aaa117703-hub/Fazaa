import { OwnerFeed } from '@/components/owner-feed';
import { useIsOwner } from '@/lib/owner';
import { SkeletonList } from '@/components/skeleton';
import { Icon, type IconName } from '@/components/icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StripeRing } from '@/components/stripe-ring';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CraneCard, statusOf } from '@/components/crane-card';
import { CountUp, FadeIn, Pulse, Radar } from '@/components/fx';
import { geoAlert, getFix } from '@/lib/geo';
import { HomeMap } from '@/components/home-map';
import { Select } from '@/components/select';
import { useBlocks } from '@/lib/blocks';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { contact } from '@/lib/contact';
import { Crane, distKm, fmtDist, GOVS, TYPES } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

type Pos = { latitude: number; longitude: number };
const BAGHDAD: Pos = { latitude: 33.3152, longitude: 44.3661 };

export default function Home() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [pos, setPos] = useState<Pos | null>(null);
  const [src, setSrc] = useState<'default' | 'gps' | 'manual'>('default');
  const [cranes, setCranes] = useState<Crane[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [offline, setOffline] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);
  const [type, setType] = useState('');
  const [gov, setGov] = useState('');
  const [hasReq, setHasReq] = useState(false);
  const isOwner = useIsOwner();
  const [shown, setShown] = useState(20);
  const { blocks, reload: reloadBlocks } = useBlocks();
  useFocusEffect(useCallback(() => { reloadBlocks(); AsyncStorage.getItem('sanad_active_req').then((v) => setHasReq(!!v)).catch(() => {}); }, []));

  const load = useCallback(async (p: Pos) => {
    setLoading(true); setErr(false);
    const { data, error } = await supabase.rpc('nearby_cranes', { p_lat: p.latitude, p_lng: p.longitude, p_radius_km: 2000, p_limit: 100 });
    if (error) {
      // بدون إنترنت: نعرض آخر قائمة محفوظة
      const raw = await AsyncStorage.getItem('sanad_cranes_cache').catch(() => null);
      let cached: Crane[] = [];
      try { cached = raw ? JSON.parse(raw) : []; } catch { /* */ }
      if (cached.length) { setCranes(cached); setOffline(true); } else setErr(true);
    } else {
      setOffline(false);
      setCranes((data ?? []) as Crane[]);
      AsyncStorage.setItem('sanad_cranes_cache', JSON.stringify(data ?? [])).catch(() => {});
    }
    setLoading(false);
  }, []);

  const useGps = useCallback(async () => {
    try {
      const f = await getFix();
      const p = { latitude: f.latitude, longitude: f.longitude };
      setPos(p); setSrc('gps'); load(p);
    } catch (e) { geoAlert(e); }
  }, [load]);

  useEffect(() => {
    // نعرض آخر قائمة محفوظة فوراً (بدون شاشة فارغة) وبعدها نحدّثها من السيرفر
    AsyncStorage.getItem('sanad_cranes_cache').then((raw) => {
      try { const c = raw ? (JSON.parse(raw) as Crane[]) : []; if (c.length) { setCranes((x) => (x.length ? x : c)); setLoading(false); } } catch { /* */ }
    }).catch(() => {});
  }, []);
  useEffect(() => { setShown(20); }, [onlyFree, type, gov, pos]);

  useEffect(() => {
    setPos(BAGHDAD); load(BAGHDAD);
    Location.getForegroundPermissionsAsync().then((p) => { if (p.status === 'granted') useGps(); }).catch(() => {});
  }, [load, useGps]);

  const chooseGov = (name: string) => {
    const g = GOVS.find((x) => x.name === name);
    if (!g) return;
    const p = { latitude: g.lat, longitude: g.lng };
    setPos(p); setSrc('manual'); load(p);
  };

  const list = useMemo(() => {
    const me = pos ?? BAGHDAD;
    let a = cranes.filter((c) => !blocks[c.id]).map((c) => ({ c, d: distKm(me, c) }));
    if (onlyFree) a = a.filter((x) => x.c.status === 'available');
    if (type) a = a.filter((x) => x.c.type === type);
    if (gov) a = a.filter((x) => x.c.governorate === gov);
    a.sort((x, y) => ((x.c.status === 'available' ? 0 : 1) - (y.c.status === 'available' ? 0 : 1)) || x.d - y.d);
    return a;
  }, [cranes, pos, onlyFree, type, gov, blocks]);

  const go = () => router.push('/login');
  const call = (c: Crane, how: 'tel' | 'wa') => contact(c, how, src === 'default' ? null : pos, !!session, go);
  const route = (c: Crane) => router.push({ pathname: '/route', params: { lat: String(c.lat), lng: String(c.lng), name: c.name } });
  const best = list.find((x) => x.c.status === 'available');
  const filtered = onlyFree || !!type || !!gov;
  const request = () => (session ? router.push('/request') : go());
  const shareLoc = () => {
    if (!pos || src === 'default') { Alert.alert('حدّد موقعك أولاً', 'اضغط «موقعي» أو اختر محافظتك.'); return; }
    Share.share({ message: 'موقعي: https://maps.google.com/?q=' + pos.latitude.toFixed(6) + ',' + pos.longitude.toFixed(6) + '\n(من تطبيق سند جايك)' }).catch(() => {});
  };

  const header = (
    <View style={{ gap: 12 }}>
      <View style={[rtl.row, { gap: 8 }]}>
        <T style={{ fontSize: 26, fontWeight: '800', color: C.accent, flex: 1 }}>سند جايك</T>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="الإعدادات" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="settings" size={24} />
        </Pressable>
      </View>
      <Muted>{src === 'gps' ? 'موقعك: من الجهاز' : src === 'manual' ? 'موقعك: يدوي (حسب المحافظة)' : 'موقعك غير محدد — اضغط «حدّد موقعي» أو «اختر يدوياً».'}</Muted>
      <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Btn label="مساعد ذكي" small onPress={() => router.push('/assist')} />
        <Btn label="حدّد موقعي" kind="secondary" small onPress={useGps} />
        <Select label="اختر محافظتك" value="" allLabel="اختر يدوياً" options={GOVS.map((g) => g.name)} onChange={chooseGov} />
      </View>

      {offline && <Card style={{ borderColor: C.warn, padding: 10 }}><Muted>أنت بدون إنترنت. تظهر آخر قائمة محفوظة وقد لا تكون محدّثة.</Muted></Card>}
      {hasReq && !!session && <Btn label="طلبك الحالي — اضغط للتفاصيل" kind="secondary" onPress={() => router.push('/request')} />}
      <FadeIn>
      <Card style={{ backgroundColor: 'rgba(255,201,60,0.10)', borderColor: 'rgba(255,201,60,0.4)', gap: 8, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: -30, top: -30 }}><Radar size={150} /></View>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: C.accent, opacity: 0.9 }} />
        <T style={{ fontSize: 18, fontWeight: '800', marginTop: 4 }}>{best ? 'سيارتي تعطلت — أقرب كرين متاح' : 'سيارتي تعطلت'}</T>
        {best ? (
          <>
            <T style={{ fontSize: 20, fontWeight: '800', color: C.accent }}>{best.c.name}</T>
            <View style={[rtl.row, { gap: 6, flexWrap: 'wrap' }]}>
              <Muted>{best.c.type} ·</Muted>
              <CountUp key={best.c.id} to={best.d} fmt={fmtDist} style={{ color: C.text, fontSize: 13, fontWeight: '700' }} />
              <Muted>عنك · {statusOf(best.c).txt}</Muted>
            </View>
          </>
        ) : (
          <Muted>{loading ? 'جاري البحث عن الكرينات…' : err ? 'تعذّر تحميل الكرينات. تأكد من الإنترنت.' : 'ما لكينا كرين متاح هسه' + (filtered ? ' بهذا الفلتر' : '') + '. شوف القائمة وجرّب تتصل.'}</Muted>
        )}
        {!isOwner && <Btn label="أرسل طلب لأقرب 5 كرينات" onPress={request} />}
        {best && <Btn label="أو اتصل مباشرة بأقرب كرين" kind="secondary" onPress={() => call(best.c, 'tel')} />}
      </Card>
      </FadeIn>

      <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Pulse style={{ flexGrow: 1 }}><Btn label="طوارئ SOS" kind="danger" small onPress={() => router.push('/sos')} /></Pulse>
        <Btn label="شنو أسوي؟" kind="secondary" small onPress={() => router.push('/guide')} style={{ flexGrow: 1 }} />
        <Btn label="أرسل موقعي" kind="secondary" small onPress={shareLoc} style={{ flexGrow: 1 }} />
      </View>

      {pos && <HomeMap pos={pos} src={src} cranes={list.map((x) => x.c)} />}

      <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Pressable onPress={() => setOnlyFree((v) => !v)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: onlyFree ? C.accent : C.surface2 }}>
          <T style={{ fontWeight: '700', color: onlyFree ? C.onAccent : C.muted }}>متاح فقط</T>
        </Pressable>
        <Select label="المحافظة" value={gov} allLabel="كل المحافظات" options={GOVS.map((g) => g.name)} onChange={setGov} />
        <Select label="نوع الكرين" value={type} allLabel="كل الأنواع" options={TYPES} onChange={setType} />
        <Muted style={{ flex: 1, minWidth: 60 }}>{list.length} كرين</Muted>
      </View>
    </View>
  );

  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => { setRefreshing(true); try { if (pos) await load(pos); } catch { /* */ } finally { setRefreshing(false); } };

  if (isOwner) return <OwnerFeed />;

  return (
    <>
    <FlatList
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 10 }}
      data={list.slice(0, shown)}
      onEndReachedThreshold={0.6}
      onEndReached={() => { if (shown < list.length) setShown((n) => n + 20); }}
      ListFooterComponent={shown < list.length ? <Btn label={'عرض المزيد (' + (list.length - shown) + ')'} kind="secondary" onPress={() => setShown((n) => n + 20)} /> : undefined}
      keyExtractor={(x) => x.c.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" />}
      ListEmptyComponent={loading ? <SkeletonList n={4} /> : (
        <View style={{ alignItems: 'center', gap: 10, marginTop: 20 }}>
          <Muted style={{ textAlign: 'center' }}>{err ? 'تعذّر تحميل الكرينات. تأكد من الإنترنت.' : filtered ? 'ما كو كرينات تطابق الفلتر.' : 'ما كو كرينات مسجّلة قريبة منك هسه.'}</Muted>
          {err ? <Btn label="إعادة المحاولة" kind="secondary" onPress={() => pos && load(pos)} /> : filtered ? <Btn label="إلغاء الفلاتر" kind="secondary" onPress={() => { setOnlyFree(false); setType(''); setGov(''); }} /> : null}
        </View>
      )}
      renderItem={({ item: x, index }) => (
        <FadeIn delay={Math.min(index, 8) * 60}><CraneCard c={x.c} d={x.d} onCall={() => call(x.c, 'tel')} onWa={() => call(x.c, 'wa')} onRoute={() => route(x.c)} onOpen={() => router.push('/crane/' + x.c.id)} onRequest={isOwner ? undefined : () => (session ? router.push({ pathname: '/request', params: { craneId: x.c.id } }) : go())} /></FadeIn>
      )}
    />
    <StripeRing visible={refreshing} />
    </>
  );
}

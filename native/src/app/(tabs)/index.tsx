import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, Share, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CraneCard, statusOf } from '@/components/crane-card';
import { Select } from '@/components/select';
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
  const [onlyFree, setOnlyFree] = useState(false);
  const [type, setType] = useState('');
  const [gov, setGov] = useState('');
  const [hasReq, setHasReq] = useState(false);
  useFocusEffect(useCallback(() => { AsyncStorage.getItem('sanad_active_req').then((v) => setHasReq(!!v)).catch(() => {}); }, []));

  const load = useCallback(async (p: Pos) => {
    setLoading(true); setErr(false);
    const { data, error } = await supabase.rpc('nearby_cranes', { p_lat: p.latitude, p_lng: p.longitude, p_radius_km: 2000, p_limit: 200 });
    if (error) setErr(true); else setCranes((data ?? []) as Crane[]);
    setLoading(false);
  }, []);

  const useGps = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('الموقع مغلق', 'فعّل الموقع من إعدادات الجهاز، أو اختر محافظتك يدوياً.'); return; }
      const r = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { latitude: r.coords.latitude, longitude: r.coords.longitude };
      setPos(p); setSrc('gps'); load(p);
    } catch { Alert.alert('تعذّر تحديد موقعك', 'جرّب مرة ثانية أو اختر محافظتك يدوياً.'); }
  }, [load]);

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
    let a = cranes.map((c) => ({ c, d: distKm(me, c) }));
    if (onlyFree) a = a.filter((x) => x.c.status === 'available');
    if (type) a = a.filter((x) => x.c.type === type);
    if (gov) a = a.filter((x) => x.c.governorate === gov);
    a.sort((x, y) => ((x.c.status === 'available' ? 0 : 1) - (y.c.status === 'available' ? 0 : 1)) || x.d - y.d);
    return a;
  }, [cranes, pos, onlyFree, type, gov]);

  const go = () => router.push('/login');
  const call = (c: Crane, how: 'tel' | 'wa') => contact(c, how, src === 'default' ? null : pos, !!session, go);
  const route = (c: Crane) => Linking.openURL('http://maps.apple.com/?daddr=' + c.lat + ',' + c.lng).catch(() => {});
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
        <Btn label="موقعي" kind="secondary" small onPress={useGps} />
        <Select label="اختر محافظتك" value="" allLabel="يدوي" options={GOVS.map((g) => g.name)} onChange={chooseGov} />
      </View>
      <Muted>{src === 'gps' ? 'موقعك: من الـ GPS' : src === 'manual' ? 'موقعك: يدوي (حسب المحافظة)' : 'موقعك غير محدد — فعّل الـ GPS أو اختر محافظتك.'}</Muted>

      {hasReq && !!session && <Btn label="طلبك الحالي — اضغط للتفاصيل" kind="secondary" onPress={() => router.push('/request')} />}
      <Card style={{ backgroundColor: 'rgba(255,107,44,0.12)', borderColor: 'rgba(255,107,44,0.35)', gap: 8 }}>
        <T style={{ fontSize: 18, fontWeight: '800' }}>{best ? 'سيارتي تعطلت — أقرب كرين متاح' : 'سيارتي تعطلت'}</T>
        {best ? (
          <>
            <T style={{ fontSize: 20, fontWeight: '800', color: C.accent }}>{best.c.name}</T>
            <Muted>{best.c.type} · {fmtDist(best.d)} عنك · {statusOf(best.c).txt}</Muted>
          </>
        ) : (
          <Muted>{loading ? 'جاري البحث عن الكرينات…' : err ? 'تعذّر تحميل الكرينات. تأكد من الإنترنت.' : 'ما لكينا كرين متاح هسه' + (filtered ? ' بهذا الفلتر' : '') + '. شوف القائمة وجرّب تتصل.'}</Muted>
        )}
        <Btn label="أرسل طلب لأقرب 3 كرينات" onPress={request} />
        {best && <Btn label="أو اتصل مباشرة بأقرب كرين" kind="secondary" onPress={() => call(best.c, 'tel')} />}
      </Card>

      <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Btn label="طوارئ SOS" kind="danger" small onPress={() => router.push('/sos')} style={{ flexGrow: 1 }} />
        <Btn label="شنو أسوي؟" kind="secondary" small onPress={() => router.push('/guide')} style={{ flexGrow: 1 }} />
        <Btn label="أرسل موقعي" kind="secondary" small onPress={shareLoc} style={{ flexGrow: 1 }} />
      </View>

      <View style={{ height: 260, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
        {pos && (
          <MapView key={src + (pos.latitude + pos.longitude).toFixed(2)} style={{ flex: 1 }} initialRegion={{ ...pos, latitudeDelta: src === 'default' ? 4 : 0.4, longitudeDelta: src === 'default' ? 4 : 0.4 }} showsUserLocation={src === 'gps'}>
            {list.map(({ c }) => {
              const sz = c.tier === 'diamond' ? 34 : c.tier === 'gold' ? 28 : 20;
              return (
                <Marker key={c.id} coordinate={{ latitude: c.lat, longitude: c.lng }} tracksViewChanges={false} onCalloutPress={() => router.push('/crane/' + c.id)} title={c.name} description={c.type}>
                  <View style={{ width: sz, height: sz, borderRadius: sz / 2, backgroundColor: c.status === 'available' ? C.ok : C.warn, borderWidth: 3, borderColor: c.tier === 'diamond' ? '#6EE7F9' : c.tier === 'gold' ? '#FFC21A' : '#fff' }} />
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>

      <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Pressable onPress={() => setOnlyFree((v) => !v)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: onlyFree ? C.accent : C.surface2 }}>
          <T style={{ fontWeight: '700', color: onlyFree ? '#fff' : C.muted }}>متاح فقط</T>
        </Pressable>
        <Select label="المحافظة" value={gov} allLabel="كل المحافظات" options={GOVS.map((g) => g.name)} onChange={setGov} />
        <Select label="نوع الكرين" value={type} allLabel="كل الأنواع" options={TYPES} onChange={setType} />
        <Muted style={{ flex: 1, minWidth: 60 }}>{list.length} كرين</Muted>
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 10 }}
      data={list}
      keyExtractor={(x) => x.c.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={loading} tintColor={C.accent} onRefresh={() => pos && load(pos)} />}
      ListEmptyComponent={loading ? <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} /> : (
        <View style={{ alignItems: 'center', gap: 10, marginTop: 20 }}>
          <Muted style={{ textAlign: 'center' }}>{err ? 'تعذّر تحميل الكرينات. تأكد من الإنترنت.' : filtered ? 'ما كو كرينات تطابق الفلتر.' : 'ما كو كرينات مسجّلة قريبة منك هسه.'}</Muted>
          {err ? <Btn label="إعادة المحاولة" kind="secondary" onPress={() => pos && load(pos)} /> : filtered ? <Btn label="إلغاء الفلاتر" kind="secondary" onPress={() => { setOnlyFree(false); setType(''); setGov(''); }} /> : null}
        </View>
      )}
      renderItem={({ item: x }) => (
        <CraneCard c={x.c} d={x.d} onCall={() => call(x.c, 'tel')} onWa={() => call(x.c, 'wa')} onRoute={() => route(x.c)} onOpen={() => router.push('/crane/' + x.c.id)} />
      )}
    />
  );
}

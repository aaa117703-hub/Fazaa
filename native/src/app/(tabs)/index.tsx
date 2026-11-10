import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { tap } from '@/lib/safe';
import { C, R } from '@/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORY_KEY } from '@/lib/story-key';

type Crane = {
  id: string; name: string; type: string; lat: number; lng: number; status: string;
  verified: boolean; rating_avg: number | null; rating_count: number | null; distance_km: number | null; governorate: string | null;
};
const BAGHDAD = { latitude: 33.3152, longitude: 44.3661 };

export default function Home() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [pos, setPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [asked, setAsked] = useState(false);
  const [cranes, setCranes] = useState<Crane[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (p: { latitude: number; longitude: number }) => {
    setLoading(true); setErr('');
    const { data, error } = await supabase.rpc('nearby_cranes', { p_lat: p.latitude, p_lng: p.longitude, p_radius_km: 2000, p_limit: 100 });
    if (error) setErr('تعذّر تحميل الكرينات. تأكد من الإنترنت.');
    else setCranes((data ?? []) as Crane[]);
    setLoading(false);
  }, []);

  const locate = useCallback(async () => {
    setAsked(true);
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') { setPos(BAGHDAD); load(BAGHDAD); return; }
    try {
      const r = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { latitude: r.coords.latitude, longitude: r.coords.longitude };
      setPos(p); load(p);
    } catch { setPos(BAGHDAD); load(BAGHDAD); }
  }, [load]);

  useEffect(() => {
    AsyncStorage.getItem(STORY_KEY).then((v) => { if (!v) router.push('/story'); }).catch(() => {});
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((p) => { if (p.status === 'granted') locate(); else { setPos(BAGHDAD); load(BAGHDAD); } });
  }, [locate, load]);

  const list = useMemo(() => (onlyFree ? cranes.filter((c) => c.status === 'available') : cranes), [cranes, onlyFree]);

  async function call(c: Crane) {
    tap();
    if (!session) { router.push('/login'); return; }
    const { data } = await supabase.from('crane_contacts').select('phone').eq('crane_id', c.id).maybeSingle();
    if (!data?.phone) { Alert.alert('ما كو رقم', 'هذا السائق ما سجّل رقم بعد.'); return; }
    Linking.openURL('tel:' + data.phone);
  }

  const header = (
    <View style={{ gap: 12 }}>
      <T style={{ fontSize: 26, fontWeight: '800', color: C.accent }}>سند جايك</T>
      <Card style={{ backgroundColor: 'rgba(255,107,44,0.12)', borderColor: 'rgba(255,107,44,0.35)', gap: 8 }}>
        <T style={{ fontSize: 18, fontWeight: '800' }}>سيارتي تعطلت</T>
        <Muted>اختار أقرب كرين متاح واتصل بيه مباشرة.</Muted>
        {!session && <Btn label="سجّل دخول لإرسال طلب" onPress={() => router.push('/login')} />}
      </Card>
      {!asked && (
        <Card style={{ gap: 8 }}>
          <T style={{ fontWeight: '800' }}>حدّد موقعك</T>
          <Muted>حتى نعرض لك أقرب كرين ونوصّل طلبك للسائقين القريبين.</Muted>
          <Btn label="استخدم موقعي" kind="secondary" onPress={locate} />
        </Card>
      )}
      <View style={{ height: 240, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
        {pos && (
          <MapView
            style={{ flex: 1 }}
            initialRegion={{ ...pos, latitudeDelta: 0.35, longitudeDelta: 0.35 }}
            showsUserLocation={asked}>
            {list.map((c) => (
              <Marker key={c.id} coordinate={{ latitude: c.lat, longitude: c.lng }} title={c.name} description={c.type} pinColor={c.status === 'available' ? 'green' : 'orange'} />
            ))}
          </MapView>
        )}
      </View>
      <View style={[rtl.row, { gap: 8 }]}>
        <Pressable onPress={() => setOnlyFree((v) => !v)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: onlyFree ? C.accent : C.surface2 }}>
          <T style={{ fontWeight: '700', color: onlyFree ? '#fff' : C.muted }}>متاح فقط</T>
        </Pressable>
        <Muted style={{ flex: 1 }}>{list.length} كرين</Muted>
      </View>
      {!!err && <T style={{ color: C.danger }}>{err}</T>}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 10 }}
      data={list}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={loading} tintColor={C.accent} onRefresh={() => { if (pos) load(pos); }} />}
      ListEmptyComponent={loading ? <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} /> : <Muted style={{ textAlign: 'center', marginTop: 24 }}>ما كو كرينات مسجّلة قريبة منك هسه.</Muted>}
      renderItem={({ item: c }) => (
        <Card style={{ gap: 8 }}>
          <View style={[rtl.row, { gap: 8 }]}>
            <T style={{ flex: 1, fontSize: 17, fontWeight: '800' }}>{c.name}</T>
            {c.verified && <Ionicons name="shield-checkmark" size={18} color={C.ok} />}
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill, backgroundColor: c.status === 'available' ? 'rgba(34,197,94,0.16)' : 'rgba(245,158,11,0.16)' }}>
              <T style={{ fontSize: 12, fontWeight: '800', color: c.status === 'available' ? C.ok : C.warn }}>{c.status === 'available' ? 'متاح' : 'مشغول'}</T>
            </View>
          </View>
          <View style={[rtl.row, { gap: 12 }]}>
            <Muted>{c.type}</Muted>
            {c.distance_km != null && <Muted>{c.distance_km.toFixed(1)} كم</Muted>}
            {c.rating_avg != null && <Muted>★ {Number(c.rating_avg).toFixed(1)} ({c.rating_count ?? 0})</Muted>}
            {!!c.governorate && <Muted>{c.governorate}</Muted>}
          </View>
          <Btn label={session ? 'اتصال' : 'سجّل دخول للاتصال'} small onPress={() => call(c)} />
        </Card>
      )}
    />
  );
}

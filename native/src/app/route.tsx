import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Muted, T, rtl } from '@/components/ui';
import { fmtDist } from '@/lib/data';
import { C, R } from '@/lib/theme';

type LL = { latitude: number; longitude: number };

function km(a: LL, b: LL) {
  const r = Math.PI / 180, dLa = (b.latitude - a.latitude) * r, dLo = (b.longitude - a.longitude) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

/** مسار داخل التطبيق: خريطتنا نفسها، من موقعك للوجهة (مسار الطريق إذا توفّر، وإلا خط مباشر). */
export default function RouteScreen() {
  const { lat, lng, name } = useLocalSearchParams<{ lat: string; lng: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const dest = useMemo<LL>(() => ({ latitude: Number(lat), longitude: Number(lng) }), [lat, lng]);
  const [me, setMe] = useState<LL | null>(null);
  const [line, setLine] = useState<LL[] | null>(null);
  const [info, setInfo] = useState<{ km: number; min: number } | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'noloc'>('loading');
  const map = useRef<MapView>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') { if (!off) setState('noloc'); return; }
        const p = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (off || !p) { if (!off) setState('noloc'); return; }
        const a = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        setMe(a); setState('ok');
        setInfo({ km: km(a, dest), min: Math.round((km(a, dest) / 40) * 60) });
        try {
          const ctl = new AbortController();
          const t = setTimeout(() => ctl.abort(), 8000);
          const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.longitude},${a.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`, { signal: ctl.signal });
          clearTimeout(t);
          const j = await r.json();
          const rt = j?.routes?.[0];
          if (rt && !off) {
            setLine((rt.geometry.coordinates as [number, number][]).map(([lo, la]) => ({ latitude: la, longitude: lo })));
            setInfo({ km: rt.distance / 1000, min: Math.max(1, Math.round(rt.duration / 60)) });
          }
        } catch { /* نبقى على الخط المباشر */ }
      } catch { if (!off) setState('noloc'); }
    })();
    return () => { off = true; };
  }, [dest]);

  useEffect(() => {
    if (me) setTimeout(() => map.current?.fitToCoordinates([me, dest], { edgePadding: { top: 90, right: 50, bottom: 200, left: 50 }, animated: true }), 400);
  }, [me, dest, line]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MapView ref={map} style={{ flex: 1 }} showsUserLocation initialRegion={{ ...dest, latitudeDelta: 0.1, longitudeDelta: 0.1 }}>
        <Marker coordinate={dest} title={name ?? 'الوجهة'} pinColor={C.accent} />
        {me && <Polyline coordinates={line ?? [me, dest]} strokeColor={C.accent} strokeWidth={5} lineDashPattern={line ? undefined : [10, 8]} />}
      </MapView>
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: insets.bottom + 14, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 }}>
        <T style={{ fontSize: 17, fontWeight: '800' }}>{name ?? 'الوجهة'}</T>
        {state === 'loading' && <View style={[rtl.row, { gap: 8 }]}><ActivityIndicator color={C.accent} /><Muted>جاري تحديد موقعك…</Muted></View>}
        {state === 'noloc' && <Muted>فعّل الموقع للتطبيق حتى نرسم لك الطريق. الخريطة تعرض الوجهة فقط.</Muted>}
        {state === 'ok' && info && <Muted>{fmtDist(info.km)} · حوالي {info.min} دقيقة بالسيارة{line ? '' : ' (خط مباشر تقريبي)'}</Muted>}
        <Btn label="إغلاق" kind="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

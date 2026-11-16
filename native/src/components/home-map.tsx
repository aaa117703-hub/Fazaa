import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { T } from '@/components/ui';
import { dial } from '@/lib/contact';
import { Crane } from '@/lib/data';
import { KINDS, Shop, shopsIn } from '@/lib/shops';
import { C, R } from '@/lib/theme';

type Pos = { latitude: number; longitude: number };
const K_SHOPS = 'sanad_map_shops', K_SPEED = 'sanad_map_speed';

function Fab({ icon, on, onPress, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; on: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.accent : 'rgba(20,23,26,0.88)', borderWidth: 1, borderColor: on ? C.accent : C.line }}>
      <Ionicons name={icon} size={22} color={on ? C.onAccent : C.text} />
    </Pressable>
  );
}

// الخريطة الرئيسية: الكرينات + طبقة المحلات + عداد السرعة (نفس الموقع).
export function HomeMap({ pos, src, cranes, height = 260 }: { pos: Pos; src: 'default' | 'gps' | 'manual'; cranes: Crane[]; height?: number }) {
  const [shopsOn, setShopsOn] = useState(false);
  const [speedOn, setSpeedOn] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [kmh, setKmh] = useState(0);
  const [hint, setHint] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const region = useRef<Region | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([K_SHOPS, K_SPEED]).then((r) => { setShopsOn(r[0][1] === '1'); setSpeedOn(r[1][1] === '1'); }).catch(() => {});
  }, []);

  const loadShops = useCallback((rg: Region | null) => {
    if (!rg) return;
    if (rg.latitudeDelta > 1.5) { setHint('قرّب الخريطة حتى تظهر المحلات.'); return; }
    setHint('');
    shopsIn([rg.longitude - rg.longitudeDelta / 2, rg.latitude - rg.latitudeDelta / 2, rg.longitude + rg.longitudeDelta / 2, rg.latitude + rg.latitudeDelta / 2]).then(setShops).catch(() => {});
  }, []);

  const toggleShops = () => {
    const v = !shopsOn;
    setShopsOn(v); AsyncStorage.setItem(K_SHOPS, v ? '1' : '0').catch(() => {});
    if (v) loadShops(region.current ?? { ...pos, latitudeDelta: 0.4, longitudeDelta: 0.4 }); else { setShops([]); setHint(''); }
  };
  const toggleSpeed = () => { const v = !speedOn; setSpeedOn(v); AsyncStorage.setItem(K_SPEED, v ? '1' : '0').catch(() => {}); };

  useEffect(() => {
    if (shopsOn) loadShops(region.current ?? { ...pos, latitudeDelta: 0.4, longitudeDelta: 0.4 });
  }, [shopsOn, loadShops, pos]);

  // عداد السرعة من GPS مع تنعيم حتى ما يقفز الرقم
  useEffect(() => {
    if (!speedOn) { setKmh(0); return; }
    let sub: Location.LocationSubscription | null = null, off = false, sm = 0;
    (async () => {
      try {
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status !== 'granted' || off) return;
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 }, (l) => {
          const ms = l.coords.speed;
          if (ms == null || ms < 0) return;
          sm = sm * 0.55 + ms * 3.6 * 0.45;
          setKmh(ms * 3.6 < 1 ? 0 : Math.round(sm));
        });
        if (off) sub.remove();
      } catch { /* بدون إذن الموقع */ }
    })();
    return () => { off = true; sub?.remove(); };
  }, [speedOn]);

  return (
    <View style={{ height, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
      <MapView
        key={src + (pos.latitude + pos.longitude).toFixed(2)} style={{ flex: 1 }}
        initialRegion={{ ...pos, latitudeDelta: src === 'default' ? 4 : 0.4, longitudeDelta: src === 'default' ? 4 : 0.4 }}
        showsUserLocation={src === 'gps'}
        onRegionChangeComplete={(rg) => {
          region.current = rg;
          if (!shopsOn) return;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => loadShops(rg), 600);
        }}>
        {shopsOn && shops.map((s) => {
          const k = KINDS[s.kind] ?? ['محل', C.muted];
          return (
            <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} tracksViewChanges={false} title={s.name || k[0]} description={k[0] + (s.phone ? ' · اضغط للاتصال' : '')} onCalloutPress={() => { if (s.phone) dial(s.name || k[0], s.phone); }}>
              <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: k[1], borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="build" size={12} color="#14171A" />
              </View>
            </Marker>
          );
        })}
        {cranes.map((c) => {
          const sz = c.tier === 'diamond' ? 34 : c.tier === 'gold' ? 28 : 20;
          return (
            <Marker key={c.id} coordinate={{ latitude: c.lat, longitude: c.lng }} tracksViewChanges={false} onCalloutPress={() => router.push('/crane/' + c.id)} title={c.name} description={c.type}>
              <View style={{ width: sz, height: sz, borderRadius: sz / 2, backgroundColor: c.status === 'available' ? C.ok : C.warn, borderWidth: 3, borderColor: c.tier === 'diamond' ? C.info : c.tier === 'gold' ? C.accent : '#fff' }} />
            </Marker>
          );
        })}
      </MapView>
      <View style={{ position: 'absolute', top: 10, right: 10, gap: 8 }}>
        <Fab icon="build-outline" on={shopsOn} onPress={toggleShops} label="محلات التصليح" />
        <Fab icon="speedometer-outline" on={speedOn} onPress={toggleSpeed} label="عداد السرعة" />
      </View>
      {speedOn && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 10, bottom: 10, minWidth: 78, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 24, alignItems: 'center', backgroundColor: 'rgba(20,23,26,0.9)', borderWidth: 2, borderColor: kmh >= 120 ? C.danger : kmh < 2 ? C.line : C.accent }}>
          <T style={{ fontSize: 28, fontWeight: '800', color: kmh >= 120 ? C.danger : C.text, lineHeight: 32 }}>{kmh}</T>
          <T style={{ fontSize: 11, color: C.muted }}>كم/س</T>
        </View>
      )}
      {!!hint && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 10, left: 10, right: 66, padding: 8, borderRadius: 14, backgroundColor: 'rgba(20,23,26,0.9)' }}>
          <T style={{ fontSize: 12, color: C.muted }}>{hint}</T>
        </View>
      )}
    </View>
  );
}

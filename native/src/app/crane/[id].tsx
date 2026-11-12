import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Badge } from '@/components/crane-card';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { contact } from '@/lib/contact';
import { tierOf } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type P = {
  id: string; name: string; type: string; governorate: string | null; crane_make: string | null; crane_model: string | null; verified: boolean; tier: string;
  since: string; avatar: string | null; rating_avg: number | null; rating_count: number; jobs: number; reviews: { stars: number; comment: string; created_at: string }[];
};

export default function CraneProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<P | null | undefined>(undefined);
  const [pos, setPos] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    supabase.rpc('crane_profile', { p_id: id }).then(({ data }) => setP((data as P) ?? null), () => setP(null));
    supabase.rpc('track_crane_view', { p_id: id }).then(() => {}, () => {});
    Location.getForegroundPermissionsAsync().then(async (r) => { if (r.status === 'granted') { const x = await Location.getLastKnownPositionAsync(); if (x) setPos(x.coords); } }).catch(() => {});
  }, [id]);

  if (p === undefined) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;
  if (!p) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 }}><T style={{ textAlign: 'center' }}>الملف غير متاح.</T><Btn label="رجوع" kind="secondary" onPress={() => router.back()} style={{ marginTop: 16 }} /></View>;
  const t = tierOf(p.tier);
  const since = p.since ? new Date(p.since).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' }) : '';
  const c = { id: p.id, name: p.name };
  const go = () => router.push('/login');
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingTop: 24, paddingBottom: insets.bottom + 30, gap: 14, alignItems: 'center' }}>
      <Avatar c={p} size={92} />
      <T style={{ fontSize: 22, fontWeight: '800' }}>{p.name}</T>
      <View style={[rtl.row, { gap: 8 }]}>{p.verified && <Badge txt="موثق" color={C.ok} />}<Badge txt={t.name} color={t.color} /></View>
      <Muted>{p.type}{p.governorate ? ' · ' + p.governorate : ''}</Muted>
      {!!p.crane_make && <Muted>🚛 {[p.crane_make === 'غير مذكور' ? '' : p.crane_make, p.crane_model].filter(Boolean).join(' ')}</Muted>}
      <View style={[rtl.row, { gap: 10, alignSelf: 'stretch' }]}>
        <Card style={{ flex: 1, alignItems: 'center' }}><T style={{ color: C.warn, fontWeight: '800', fontSize: 18 }}>{p.rating_avg != null ? '★ ' + Number(p.rating_avg).toFixed(1) : '—'}</T><Muted>{p.rating_count ? p.rating_count + ' تقييم' : 'بدون تقييم'}</Muted></Card>
        <Card style={{ flex: 1, alignItems: 'center' }}><T style={{ fontWeight: '800', fontSize: 18 }}>{p.jobs}</T><Muted>مشوار مكتمل</Muted></Card>
        <Card style={{ flex: 1, alignItems: 'center' }}><T style={{ fontWeight: '800', fontSize: 14 }}>{since || '—'}</T><Muted>عضو منذ</Muted></Card>
      </View>
      <View style={[rtl.row, { gap: 8, alignSelf: 'stretch' }]}>
        <Btn label="اتصال" onPress={() => contact(c, 'tel', pos, !!session, go)} style={{ flex: 1 }} />
        <Btn label="واتساب" kind="secondary" onPress={() => contact(c, 'wa', pos, !!session, go)} style={{ flex: 1 }} />
      </View>
      {p.reviews?.length > 0 && (
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          <T style={{ fontWeight: '800', fontSize: 16 }}>آخر التقييمات</T>
          {p.reviews.map((r, i) => (
            <Card key={i} style={{ gap: 4 }}><T style={{ color: C.warn }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</T><T>{r.comment}</T></Card>
          ))}
        </View>
      )}
      <Btn label="إغلاق" kind="ghost" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
    </ScrollView>
  );
}

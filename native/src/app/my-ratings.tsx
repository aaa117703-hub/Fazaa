import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { StarsView } from '@/components/stars';
import { Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ago } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/lib/theme';

type Rt = { request_id: string; stars: number; comment: string | null; created_at: string };

// تقييمات الزبائن لكرينك: المتوسط = مجموع كل التقييمات ÷ عددها
export default function MyRatings() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [rows, setRows] = useState<Rt[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!uid) { setLoading(false); return; }
    (async () => {
      const { data: cr } = await supabase.from('cranes').select('id').eq('owner_id', uid).limit(20);
      const ids = (cr ?? []).map((x) => x.id as string);
      const { data } = ids.length ? await supabase.from('ratings').select('request_id,stars,comment,created_at').in('crane_id', ids).order('created_at', { ascending: false }).limit(300) : { data: [] };
      setRows(((data ?? []) as Rt[]).map((x) => ({ ...x, stars: Number(x.stars) })));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [uid]));

  const n = rows.length;
  const avg = n ? rows.reduce((a, x) => a + x.stars, 0) / n : 0;
  const dist = [5, 4, 3, 2, 1].map((k) => ({ k, c: rows.filter((x) => Math.ceil(x.stars) === k).length }));
  const withText = rows.filter((x) => x.comment && x.comment.trim());

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 12, paddingBottom: 60, gap: 12 }}>
      <BackBar /><T style={{ fontSize: 26, fontWeight: '800' }}>تقييماتي</T>
      {loading ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} /> : !n ? (
        <Card><Muted>ما وصلك أي تقييم بعد. التقييمات تظهر بعد ما يكمل الزبون الطلب ويقيّمك.</Muted></Card>
      ) : (
        <>
          <Card style={{ alignItems: 'center', gap: 6 }}>
            <T style={{ fontSize: 44, fontWeight: '800', color: C.warn }}>{avg.toFixed(1)}</T>
            <StarsView value={avg} size={24} />
            <Muted>متوسط {n} {n === 1 ? 'تقييم' : 'تقييمات'}</Muted>
          </Card>
          <Card style={{ gap: 8 }}>
            {dist.map((d) => (
              <View key={d.k} style={[rtl.row, { gap: 8, alignItems: 'center' }]}>
                <T style={{ width: 22, fontWeight: '700' }}>{d.k}★</T>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden', flexDirection: 'row-reverse' }}>
                  <View style={{ width: (n ? (d.c / n) * 100 : 0) + '%', backgroundColor: C.warn, borderRadius: 4 }} />
                </View>
                <Muted style={{ width: 30, textAlign: 'left' }}>{d.c}</Muted>
              </View>
            ))}
          </Card>
          <T style={{ fontWeight: '800', fontSize: 17 }}>التعليقات</T>
          {!withText.length ? <Muted>ما كو تعليقات مكتوبة بعد.</Muted> : withText.map((x) => (
            <Card key={x.request_id} style={{ gap: 6, borderRadius: R.lg }}>
              <View style={[rtl.row, { gap: 8, alignItems: 'center' }]}><StarsView value={x.stars} size={15} /><Muted>{ago(x.created_at)}</Muted></View>
              <T>{x.comment}</T>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

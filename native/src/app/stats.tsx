import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { Card, Muted, T, rtl } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Stats = {
  totals: { requests: number; completed: number; cranes: number; users: number };
  governorates: { name: string; n: number }[];
  top_users: { n: number }[];
};

const num = (x: number) => x.toLocaleString('en-US');

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: d, error } = await supabase.rpc('public_stats');
        if (error) setErr(true);
        else setData(d as Stats);
      } catch {
        setErr(true);
      }
    })();
  }, []);

  const maxGov = Math.max(1, ...(data?.governorates ?? []).map((g) => g.n));
  const maxUser = Math.max(1, ...(data?.top_users ?? []).map((u) => u.n));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 12, paddingBottom: 40, gap: 12 }}>
      <BackBar />
      <T style={{ fontSize: 24, fontWeight: '800' }}>الإحصائيات</T>

      {err && <Card><Muted>تعذّر تحميل الإحصائيات. تأكد من الإنترنت.</Muted></Card>}
      {!err && !data && <Card><Muted>جاري التحميل…</Muted></Card>}

      {data && (
        <>
          <View style={[rtl.row, { gap: 10, flexWrap: 'wrap' }]}>
            {[
              ['الطلبات', data.totals.requests],
              ['المكتملة', data.totals.completed],
              ['الكرينات', data.totals.cranes],
              ['المستخدمين', data.totals.users],
            ].map(([label, v]) => (
              <Card key={String(label)} style={{ flexGrow: 1, flexBasis: '45%', alignItems: 'center', gap: 4 }}>
                <T style={{ fontSize: 26, fontWeight: '800', color: C.accent }}>{num(Number(v))}</T>
                <Muted>{String(label)}</Muted>
              </Card>
            ))}
          </View>

          <Card style={{ gap: 10 }}>
            <T style={{ fontWeight: '800', fontSize: 17 }}>أكثر المحافظات استخداماً</T>
            {data.governorates.length === 0 && <Muted>ما كو بيانات بعد.</Muted>}
            {data.governorates.map((g) => (
              <View key={g.name} style={{ gap: 4 }}>
                <View style={[rtl.row, { justifyContent: 'space-between' }]}>
                  <T style={{ fontWeight: '700' }}>{g.name}</T>
                  <Muted>{num(g.n)}</Muted>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden' }}>
                  <View style={{ height: 8, width: `${(g.n / maxGov) * 100}%`, backgroundColor: C.accent }} />
                </View>
              </View>
            ))}
          </Card>

          <Card style={{ gap: 10 }}>
            <T style={{ fontWeight: '800', fontSize: 17 }}>أكثر المستخدمين استخداماً</T>
            {data.top_users.length === 0 && <Muted>ما كو بيانات بعد.</Muted>}
            {data.top_users.map((u, i) => (
              <View key={i} style={{ gap: 4 }}>
                <View style={[rtl.row, { justifyContent: 'space-between' }]}>
                  <T style={{ fontWeight: '700' }}>مستخدم {i + 1}</T>
                  <Muted>{num(u.n)} طلب</Muted>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden' }}>
                  <View style={{ height: 8, width: `${(u.n / maxUser) * 100}%`, backgroundColor: C.ok }} />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

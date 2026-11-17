import { router } from 'expo-router';
import { geoAlert, getFix } from '@/lib/geo';
import { BackBar } from '@/components/back-bar';
import React from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { STEPS } from '@/lib/guide-steps';
import { C } from '@/lib/theme';

export default function Guide() {
  const insets = useSafeAreaInsets();
  const [more, setMore] = React.useState(false);
  const share = async () => {
    try {
      const r = await getFix();
      await Share.share({ message: 'أحتاج مساعدة — سيارتي متعطلة.\nموقعي' + (r.approx ? ' (تقريبي)' : '') + ': https://www.google.com/maps?q=' + r.latitude.toFixed(6) + ',' + r.longitude.toFixed(6) });
    } catch (e) { geoAlert(e, 'حتى نكدر نرسل موقعك.'); }
  };
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: 22, paddingBottom: insets.bottom + 28, gap: 12 }}>
      <BackBar /><T style={{ fontSize: 24, fontWeight: '800' }}>شنو أسوي إذا تعطلت سيارتي؟</T>
      <Muted>اتبع هالخطوات بالترتيب. سلامتك أهم من أي شي.</Muted>
      {STEPS.filter((_, i) => more || i < 3).map(([t, d], i) => (
        <Card key={i} style={[rtl.row, { gap: 12, alignItems: 'flex-start' }]}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: C.onAccent, fontWeight: '800' }}>{i + 1}</T></View>
          <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: '800', fontSize: 16 }}>{t}</T><Muted style={{ fontSize: 14, lineHeight: 22 }}>{d}</Muted></View>
        </Card>
      ))}
      {!more && STEPS.length > 3 && <Btn label={'باقي الخطوات (' + (STEPS.length - 3) + ')'} kind="secondary" onPress={() => setMore(true)} />}
      <Btn label="أرسل موقعي" onPress={share} />
      <Btn label="إغلاق" kind="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

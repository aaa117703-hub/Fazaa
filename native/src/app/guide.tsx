import { router } from 'expo-router';
import * as Location from 'expo-location';
import React from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { STEPS } from '@/lib/guide-steps';
import { C } from '@/lib/theme';

export default function Guide() {
  const insets = useSafeAreaInsets();
  const [more, setMore] = React.useState(false);
  const share = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('الموقع مغلق', 'فعّل الموقع من إعدادات الجهاز حتى نرسل موقعك.'); return; }
      const r = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await Share.share({ message: 'أحتاج مساعدة — سيارتي متعطلة.\nموقعي: https://www.google.com/maps?q=' + r.coords.latitude.toFixed(6) + ',' + r.coords.longitude.toFixed(6) });
    } catch { Alert.alert('تعذّر', 'ما كدرنا نحدد موقعك. جرّب مرة ثانية.'); }
  };
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: 22, paddingBottom: insets.bottom + 28, gap: 12 }}>
      <T style={{ fontSize: 24, fontWeight: '800' }}>شنو أسوي إذا تعطلت سيارتي؟</T>
      <Muted>اتبع هالخطوات بالترتيب. سلامتك أهم من أي شي.</Muted>
      {STEPS.filter((_, i) => more || i < 3).map(([t, d], i) => (
        <Card key={i} style={[rtl.row, { gap: 12, alignItems: 'flex-start' }]}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#fff', fontWeight: '800' }}>{i + 1}</T></View>
          <View style={{ flex: 1, gap: 2 }}><T style={{ fontWeight: '800', fontSize: 16 }}>{t}</T><Muted style={{ fontSize: 14, lineHeight: 22 }}>{d}</Muted></View>
        </Card>
      ))}
      {!more && STEPS.length > 3 && <Btn label={'باقي الخطوات (' + (STEPS.length - 3) + ')'} kind="secondary" onPress={() => setMore(true)} />}
      <Btn label="أرسل موقعي" onPress={share} />
      <Btn label="إغلاق" kind="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

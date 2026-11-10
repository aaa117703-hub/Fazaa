import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { warn } from '@/lib/safe';
import { C } from '@/lib/theme';

const NUMS = [
  { n: '104', label: 'الشرطة', icon: 'shield-checkmark' as const },
  { n: '122', label: 'الإسعاف', icon: 'medkit' as const },
  { n: '115', label: 'الإطفاء', icon: 'flame' as const },
];

export default function Sos() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 + insets.top * 0.3, gap: 12, paddingBottom: insets.bottom + 24 }} style={{ backgroundColor: C.bg }}>
      <T style={{ fontSize: 24, fontWeight: '800', color: C.danger }}>طوارئ SOS</T>
      <Muted>إذا كو خطر فوري أو إصابات، اتصل بجهات الطوارئ أول شي.</Muted>
      {NUMS.map((x) => (
        <Pressable
          key={x.n}
          onPress={() => { warn(); Linking.openURL('tel:' + x.n).catch(() => {}); }}>
          <Card style={[rtl.row, { gap: 14 }]}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={x.icon} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '800', fontSize: 17 }}>{x.label}</T>
              <Muted>اضغط للاتصال</Muted>
            </View>
            <T style={{ fontWeight: '800', fontSize: 22, color: C.accent2 }}>{x.n}</T>
          </Card>
        </Pressable>
      ))}
      <Card>
        <T style={{ fontWeight: '800', marginBottom: 6 }}>نصيحة</T>
        <Muted>إذا تعطلت سيارتك شغّل إشارات الطوارئ (الفلاشر) فوراً، وانزل من جهة الرصيف وابتعد عن الطريق.</Muted>
      </Card>
      <Btn label="إغلاق" kind="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { Btn, Muted, T, rtl } from '@/components/ui';
import { supportWa } from '@/lib/contact';
import { LEGAL } from '@/lib/legal';
import { C } from '@/lib/theme';

// الشروط / الخصوصية / الدعم داخل التطبيق (k = terms | privacy | support)
export default function Legal() {
  const insets = useSafeAreaInsets();
  const { k } = useLocalSearchParams<{ k?: string }>();
  const blocks = LEGAL[k ?? 'privacy'] ?? LEGAL.privacy;
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40, gap: 8, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
      <BackBar />
      {blocks.map(([t, txt], i) =>
        t === 'h1' ? <T key={i} style={{ fontSize: 26, fontWeight: '800', marginTop: 8 }}>{txt}</T>
        : t === 'h2' ? <T key={i} style={{ fontSize: 18, fontWeight: '800', color: C.accent, marginTop: 14 }}>{txt}</T>
        : t === 'li' ? <View key={i} style={[rtl.row, { gap: 8, alignItems: 'flex-start' }]}><T style={{ color: C.accent }}>•</T><T style={{ flex: 1, lineHeight: 24 }}>{txt}</T></View>
        : <Muted key={i} style={{ fontSize: 14, lineHeight: 24 }}>{txt}</Muted>)}
      {k === 'support' && <Btn label="راسلنا على واتساب" onPress={() => supportWa('مرحباً، أحتاج مساعدة بتطبيق سند جايك')} style={{ marginTop: 12 }} />}
    </ScrollView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Muted, T, rtl } from '@/components/ui';
import { C } from '@/lib/theme';

const TIERS = [
  { id: 'bronze', name: 'برونزي', price: 0, color: '#CD7F32', features: ['الظهور بالقائمة والخريطة', 'اتصال مباشر من الزبائن', 'ملف شخصي وتقييم بالنجوم'] },
  { id: 'silver', name: 'فضي', price: 10000, color: '#C9D1DB', features: ['كل مميزات البرونزي', 'ترتيب أعلى بالقائمة', 'إطار فضي حول صورتك'] },
  { id: 'gold', name: 'ذهبي', price: 25000, color: '#FFC21A', features: ['كل مميزات الفضي', 'أولوية أعلى بالنتائج', 'إطار ذهبي متوهج'] },
  { id: 'diamond', name: 'ماسي', price: 50000, color: '#6EE7F9', features: ['كل مميزات الذهبي', 'أعلى أولوية بمحافظتك', 'إطار ماسي مميز'] },
];

export default function Packages() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 12 }}>
      <T style={{ fontSize: 26, fontWeight: '800' }}>الباقات</T>
      <Muted>للسائقين فقط. الزبون يستخدم سند جايك مجاناً دائماً.</Muted>
      {TIERS.map((p) => (
        <Card key={p.id} style={{ borderColor: p.color, gap: 8 }}>
          <View style={[rtl.row, { gap: 10 }]}>
            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: p.color, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="diamond" size={20} color={p.color} />
            </View>
            <T style={{ fontSize: 19, fontWeight: '800', flex: 1 }}>{p.name}</T>
            <T style={{ fontSize: 20, fontWeight: '800', color: C.accent2 }}>{Platform.OS === 'ios' ? (p.price ? '' : 'مجاناً') : p.price ? p.price.toLocaleString('en-US') + ' د.ع/شهر' : 'مجاناً'}</T>
          </View>
          {p.features.map((f) => (
            <View key={f} style={[rtl.row, { gap: 8 }]}>
              <Ionicons name="checkmark-circle" size={18} color={C.ok} />
              <T style={{ flex: 1 }}>{f}</T>
            </View>
          ))}
        </Card>
      ))}
      <Muted>{Platform.OS === 'ios' ? 'مزايا الباقات تُفعّل من الإدارة. للتفاصيل تواصل مع الدعم من «حسابي».' : 'لا يوجد دفع إلكتروني حالياً. الاشتراك يُفعّل من الإدارة بعد التواصل معك.'}</Muted>
    </ScrollView>
  );
}

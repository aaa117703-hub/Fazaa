import { router } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Muted, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { C } from '@/lib/theme';

export default function Driver() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 12 }}>
      <T style={{ fontSize: 26, fontWeight: '800' }}>لوحة السائق</T>
      <Muted>سجّل كرينك حتى يوصلك الزبائن القريبين منك.</Muted>
      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800' }}>عندك كرين أو سيارة سحب؟</T>
        <Muted>التسجيل كسائق وإدارة الطلبات الواردة والموقع المباشر تنتقل لهذا التطبيق بالمرحلة الجاية. هسه تكدر تستخدمها من الموقع.</Muted>
        {!session && <Btn label="دخول / حساب جديد" onPress={() => router.push('/login')} />}
      </Card>
    </ScrollView>
  );
}

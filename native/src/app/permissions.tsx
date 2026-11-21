import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PermissionRows } from '@/components/permission-rows';
import { Btn, Muted, T } from '@/components/ui';
import { markAsked } from '@/lib/permissions';
import { C } from '@/lib/theme';

/** شاشة شرح الأذونات: تظهر مرة وحدة أول ما يدخل المستخدم. */
export default function Permissions() {
  const insets = useSafeAreaInsets();
  const done = async () => { await markAsked(); router.back(); };
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 30, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <T style={{ fontSize: 26, fontWeight: '800', color: C.accent }}>قبل ما نبدأ</T>
      <Muted style={{ fontSize: 15 }}>سند جايك يحتاج إذنين حتى يشتغل صح. تكدر تغيّرهم بأي وقت من الإعدادات.</Muted>
      <PermissionRows />
      <View style={{ gap: 10, marginTop: 6 }}>
        <Btn label="تم، يلا نبدأ" onPress={done} />
        <Btn label="لاحقاً" kind="ghost" onPress={done} />
      </View>
    </ScrollView>
  );
}

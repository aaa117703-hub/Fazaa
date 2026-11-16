import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';

import { T } from '@/components/ui';
import { C } from '@/lib/theme';

// زر رجوع موحّد (هلالي) لكل الصفحات الداخلية. يعمل على أندرويد وآيفون.
export function BackBar({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button" accessibilityLabel="رجوع" hitSlop={10}
      style={({ pressed }) => [{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.7 : 1 }, style]}>
      <Ionicons name="chevron-forward" size={18} color={C.accent} />
      <T style={{ fontWeight: '700', fontSize: 14 }}>رجوع</T>
    </Pressable>
  );
}

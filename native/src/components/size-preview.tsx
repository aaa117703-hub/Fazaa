import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, T } from '@/components/ui';
import { C, R } from '@/lib/theme';

// نموذج يظهر عند تغيير حجم الخط/الأزرار: نفس المكوّنات الحقيقية بنفس الحجم المختار.
const listeners = new Set<() => void>();
export const showSizePreview = () => listeners.forEach((f) => f());

export function SizePreview() {
  const insets = useSafeAreaInsets();
  const [on, setOn] = useState(false);
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const f = () => {
      setOn(true);
      Animated.timing(v, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => Animated.timing(v, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setOn(false)), 3000);
    };
    listeners.add(f);
    return () => { listeners.delete(f); if (timer.current) clearTimeout(timer.current); };
  }, [v]);
  if (!on) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 92, maxWidth: 520, alignSelf: 'center', width: '96%', opacity: v,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }], backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.accent, padding: 16, gap: 6, zIndex: 50 }}>
      <View style={{ position: 'absolute', top: -12, right: 16, backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 99 }}><T style={{ color: C.onAccent, fontSize: 12, fontWeight: '800' }}>نموذج الحجم</T></View>
      <T style={{ fontSize: 18, fontWeight: '800' }}>هذا شكل العنوان</T>
      <T style={{ fontSize: 14, color: C.muted }}>وهذا شكل النص العادي بالتطبيق، حتى تشوف إذا مريح لعينك.</T>
      <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 6 }}>
        <Btn label="زر رئيسي" style={{ flex: 1 }} />
        <Btn label="ثانوي" kind="secondary" />
      </View>
    </Animated.View>
  );
}

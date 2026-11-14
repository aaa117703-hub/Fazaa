import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { tap } from '@/lib/safe';
import { C } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'الرئيسية', icon: 'home' },
  driver: { label: 'سائق', icon: 'car-sport' },
  packages: { label: 'الباقات', icon: 'diamond' },
  profile: { label: 'حسابي', icon: 'person' },
};

function Item({ label, icon, active, onPress, tint }: { label: string; icon: IconName; active: boolean; onPress: () => void; tint?: string }) {
  const lift = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(lift, { toValue: active ? 1 : 0, useNativeDriver: true, friction: 6, tension: 120 }).start();
  }, [active, lift]);
  const y = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const orb = lift.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  return (
    <Pressable onPress={onPress} hitSlop={6} style={s.item} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={[s.orb, { opacity: lift, transform: [{ translateY: -17 }, { scale: orb }] }]} />
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        <Ionicons name={icon} size={24} color={active ? '#fff' : tint ?? C.muted} />
      </Animated.View>
      <T style={[s.label, { color: active ? C.accent : C.muted, fontWeight: active ? '800' : '600' }]}>{label}</T>
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const routes: { key: string; name: string }[] = state.routes;
  const cells: React.ReactNode[] = [];
  routes.forEach((r, i) => {
    const m = META[r.name];
    if (!m) return;
    cells.push(
      <Item
        key={r.key}
        label={m.label}
        icon={m.icon}
        active={state.index === i}
        onPress={() => {
          tap();
          const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (state.index !== i && !ev.defaultPrevented) navigation.navigate(r.name);
        }}
      />,
    );
    if (r.name === 'driver') {
      cells.push(
        <Item key="sos" label="طوارئ" icon="alert-circle" active={false} tint={C.muted} onPress={() => router.push('/sos')} />,
      );
    }
  });
  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.bar}>{cells}</View>
    </View>
  );
}

const s = StyleSheet.create({
  // داخل التدفق (مو absolute) حتى تكون اللمسات داخل حدود الأب بالكامل على iOS
  wrap: { paddingHorizontal: 12, paddingTop: 22, alignItems: 'center', backgroundColor: C.bg },
  bar: {
    flexDirection: 'row-reverse', width: '100%', maxWidth: 560, height: 66, borderRadius: 26, backgroundColor: 'rgba(24,27,31,0.97)',
    borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 4 },
  orb: {
    position: 'absolute', top: 0, width: 50, height: 50, borderRadius: 25, backgroundColor: C.accent, borderWidth: 5, borderColor: C.bg,
    shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  label: { fontSize: 11 },
});

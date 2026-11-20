import { Icon, type IconName } from '@/components/icon';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { evt } from '@/lib/debuglog';
import { useAttentionCount } from '@/lib/orders';
import { tap } from '@/lib/safe';
import { C } from '@/lib/theme';

const META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'الرئيسية', icon: 'home' },
  driver: { label: 'سائق', icon: 'driver' },
  orders: { label: 'الطلبات', icon: 'doc' },
  packages: { label: 'العضوية', icon: 'diamond' },
  profile: { label: 'حسابي', icon: 'profile' },
};

function Item({ label, icon, active, onPress, tint, badge }: { label: string; icon: IconName; active: boolean; onPress: () => void; tint?: string; badge?: number }) {
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
        <Icon name={icon} size={26} {...(active ? { mono: C.onAccent } : tint ? { mono: tint } : { color: '#F5F5F0' })} />
        {!!badge && <View style={s.badge}><T style={s.badgeTxt}>{badge > 9 ? '9+' : String(badge)}</T></View>}
      </Animated.View>
      <T numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[s.label, { color: active ? C.accent : C.muted, fontWeight: active ? '800' : '600' }]}>{label}</T>
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TabBar(props: any) {
  const { state } = props;
  const attn = useAttentionCount();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insets = useSafeAreaInsets();
  if (!(globalThis as any).__tbLogged) { (globalThis as any).__tbLogged = 1; evt('tabbar props:', Object.keys(props).join(',')); }
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
        badge={r.name === 'orders' ? attn : 0}
        onPress={() => {
          evt('tab:', m.label);
          tap();
          // التنقل عبر expo-router مباشرة (بعض إصدارات React Navigation ما تمرّر navigation لشريط مخصص)
          if (state.index === i) return;
          try { router.navigate((r.name === 'index' ? '/' : '/' + r.name) as never); }
          catch (e) { evt('tab nav failed', e); props.navigation?.navigate?.(r.name); }
        }}
      />,
    );
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
    flexDirection: 'row-reverse', width: '100%', maxWidth: 560, height: 66, borderRadius: 26, backgroundColor: 'rgba(28,32,36,0.98)',
    borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 4 },
  orb: {
    position: 'absolute', top: 0, width: 50, height: 50, borderRadius: 25, backgroundColor: C.accent, borderWidth: 5, borderColor: C.bg,
    shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  label: { fontSize: 11 },
  badge: { position: 'absolute', top: -6, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(28,32,36,0.98)' },
  badgeTxt: { color: '#fff', fontSize: 10.5, fontWeight: '800', lineHeight: 13 },
});

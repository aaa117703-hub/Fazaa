import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';

import { T } from '@/components/ui';
import { C } from '@/lib/theme';

// ظهور متدرّج (يطلع من تحت مع تلاشي). delay بالملّي ثانية.
export function FadeIn({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>{children}</Animated.View>
  );
}

// نبض خفيف (للزر الحرج SOS)
export function Pulse({ children, color = C.danger, style }: { children: React.ReactNode; color?: string; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <View style={style}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 16, borderWidth: 2, borderColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }} />
      {children}
    </View>
  );
}

// دوائر رادار تتوسّع خلف البطاقة
export function Radar({ size = 120, color = C.accent }: { size?: number; color?: string }) {
  const vs = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const anims = vs.map((v, i) => Animated.loop(Animated.sequence([Animated.delay(i * 800), Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true })])));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [vs]);
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {vs.map((v, i) => (
        <Animated.View key={i} style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }] }} />
      ))}
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
    </View>
  );
}

// عدّاد يعدّ من الصفر للقيمة (نص منسّق)
export function CountUp({ to, fmt, style }: { to: number; fmt: (n: number) => string; style?: object }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t0 = Date.now(), D = 700;
    const id = setInterval(() => {
      const q = Math.min(1, (Date.now() - t0) / D);
      setN(to * (1 - Math.pow(1 - q, 3)));
      if (q >= 1) clearInterval(id);
    }, 33);
    return () => clearInterval(id);
  }, [to]);
  return <T style={style}>{fmt(n)}</T>;
}

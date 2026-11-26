import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { C } from '@/lib/theme';

// دائرة التحديث: تدور بخطوط صفراء وسوداء (هوية سند جايك)
export function StripeRing({ visible, size = 40 }: { visible: boolean; size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(op, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    if (!visible) return;
    spin.setValue(0);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [visible, spin, op]);

  const r = size / 2 - 5;
  const sw = 7;
  const seg = (2 * Math.PI * r) / 8;
  return (
    <Animated.View pointerEvents="none" style={[st.wrap, { opacity: op }]}>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r + sw / 2 + 1} stroke="#2A3139" strokeWidth={1} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.accent} strokeWidth={sw} fill="none" strokeDasharray={[seg, seg]} strokeDashoffset={0} />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#0B0D0F" strokeWidth={sw} fill="none" strokeDasharray={[seg, seg]} strokeDashoffset={seg} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
});

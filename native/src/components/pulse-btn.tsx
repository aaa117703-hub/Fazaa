import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { T } from '@/components/ui';
import { C, R } from '@/lib/theme';

// زر أخضر بإطار متوهّج: الوهج يخرج من الإطار ويتلاشى ويتكرر
export function PulseBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [a]);
  const ring = (delay: number) => ({
    position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0, borderRadius: R.md, borderWidth: 2.5, borderColor: C.ok,
    opacity: a.interpolate({ inputRange: [0, delay, 1], outputRange: [0, 0.85, 0] }),
    transform: [{ scaleX: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) }, { scaleY: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
  });
  return (
    <View style={{ paddingVertical: 10 }}>
      <View>
      <Animated.View pointerEvents="none" style={ring(0.08)} />
      <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: C.ok, borderRadius: R.md, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: '#9BF0C0', opacity: pressed ? 0.85 : 1 })}>
        <T style={{ color: '#06210F', fontWeight: '800', fontSize: 17 }}>{label}</T>
      </Pressable>
      </View>
    </View>
  );
}

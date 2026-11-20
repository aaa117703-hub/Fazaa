import React, { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { C, R } from '@/lib/theme';

/** مستطيل رمادي ينبض بدل الشاشة الفارغة أثناء التحميل. */
export function Bone({ w, h = 14, r = 8, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: ViewStyle }) {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(o, { toValue: 0.45, duration: 700, useNativeDriver: true })]));
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: C.surface2, opacity: o }, style]} />;
}

export function CraneSkeleton() {
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
        <Bone w={52} h={52} r={26} />
        <View style={{ flex: 1, gap: 8 }}><Bone w="55%" h={16} /><Bone w="80%" /><Bone w="65%" /></View>
      </View>
      <View style={{ flexDirection: 'row-reverse', gap: 8 }}><Bone h={36} r={14} style={{ flex: 2 }} /><Bone h={36} r={14} style={{ flex: 1.4 }} /><Bone h={36} r={14} style={{ flex: 1.2 }} /></View>
    </View>
  );
}

export function RowSkeleton() {
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 14, flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
      <Bone w={30} h={30} r={15} />
      <View style={{ flex: 1, gap: 8 }}><Bone w="50%" h={16} /><Bone w="35%" /></View>
      <Bone w={58} h={24} r={12} />
    </View>
  );
}

export function SkeletonList({ n = 4, kind = 'crane' }: { n?: number; kind?: 'crane' | 'row' }) {
  return <View style={{ gap: 10 }}>{Array.from({ length: n }, (_, i) => (kind === 'row' ? <RowSkeleton key={i} /> : <CraneSkeleton key={i} />))}</View>;
}

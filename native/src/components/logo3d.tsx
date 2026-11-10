import React from 'react';
import { Animated, View } from 'react-native';

// لوكو سند جايك مرسوم بـ Views (بدون مكتبات إضافية). القطع منفصلة حتى نحرّكها لوحدها.
// العمق: نسخ مكدّسة مزاحة قليلاً بتدرّج لون (بثوب 2.5D)، والمشهد كله يميل بـ perspective.
const mix = (a: string, b: string, t: number) => {
  const p = (c: string, i: number) => parseInt(c.substr(1 + i * 2, 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0')).join('');
};

type PieceProps = { u: number; color: string };
export const Arch = ({ u, color }: PieceProps) => (
  <View style={{ position: 'absolute', left: 0, top: 0, width: 100 * u, height: 100 * u }}>
    <View style={{ position: 'absolute', left: 10.5 * u, top: 11.5 * u, width: 79 * u, height: 74.5 * u, borderColor: color, borderTopWidth: 17 * u, borderLeftWidth: 17 * u, borderRightWidth: 17 * u, borderTopLeftRadius: 39.5 * u, borderTopRightRadius: 39.5 * u }} />
    <View style={{ position: 'absolute', left: 10.5 * u, top: 77.5 * u, width: 17 * u, height: 17 * u, borderRadius: 8.5 * u, backgroundColor: color }} />
    <View style={{ position: 'absolute', left: 72.5 * u, top: 77.5 * u, width: 17 * u, height: 17 * u, borderRadius: 8.5 * u, backgroundColor: color }} />
  </View>
);
export const Dot = ({ u, color }: PieceProps) => (
  <View style={{ position: 'absolute', left: 43.5 * u, top: 33.5 * u, width: 13 * u, height: 13 * u, borderRadius: 6.5 * u, backgroundColor: color }} />
);
export const Chev = ({ u, color }: PieceProps) => (
  <View style={{ position: 'absolute', left: 0, top: 0, width: 100 * u, height: 100 * u }}>
    <View style={{ position: 'absolute', left: (42.75 - 15.6) * u, top: (65.25 - 5) * u, width: 31.2 * u, height: 10 * u, borderRadius: 5 * u, backgroundColor: color, transform: [{ rotate: '-47deg' }] }} />
    <View style={{ position: 'absolute', left: (57.25 - 15.6) * u, top: (65.25 - 5) * u, width: 31.2 * u, height: 10 * u, borderRadius: 5 * u, backgroundColor: color, transform: [{ rotate: '47deg' }] }} />
  </View>
);

const SPEC = {
  arch: { C: Arch, front: '#FF6B2C', back: '#6e2a10', n: 7 },
  dot: { C: Dot, front: '#FF8A55', back: '#8a3a18', n: 4 },
  chev: { C: Chev, front: '#F5F5F0', back: '#77777a', n: 4 },
} as const;
export type PieceKey = keyof typeof SPEC;

/** قطعة واحدة بعمق: نسخ مكدّسة. style يستقبل transform متحرّك. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Piece({ k, size, style }: { k: PieceKey; size: number; style?: any }) {
  const u = size / 100, s = SPEC[k];
  const layers = [];
  for (let i = s.n - 1; i >= 0; i--) {
    const t = i / (s.n - 1);
    layers.push(
      <View key={i} style={{ position: 'absolute', left: i * 0.9, top: -i * 0.9 }}>
        <s.C u={u} color={mix(s.front, s.back, t)} />
      </View>,
    );
  }
  return <Animated.View style={[{ position: 'absolute', width: size, height: size }, style]}>{layers}</Animated.View>;
}

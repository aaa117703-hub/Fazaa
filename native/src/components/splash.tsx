import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { T } from '@/components/ui';
import { randomTip } from '@/lib/tips';
import { C } from '@/lib/theme';

// افتتاحية سند جايك (نفس الموقع): القوس يترسم، السهم يطلع، النقطة تنط من داخل السهم
// لبداية القوس وتطلع عليه مع نسبة التحميل، وكلمة SANAD JAIK تترسم هندسياً.
const AP = Animated.createAnimatedComponent(Path);
const AC = Animated.createAnimatedComponent(Circle);
const AR = Animated.createAnimatedComponent(Rect);
const ARCH = 'M19 86V51a31 31 0 0 1 62 0V86';
const AL = 35 + Math.PI * 31 + 35;
const DUR = 5000;

function at(d: number): [number, number] {
  if (d <= 35) return [19, 86 - d];
  if (d <= 35 + Math.PI * 31) { const a = Math.PI - (d - 35) / 31; return [50 + 31 * Math.cos(a), 51 - 31 * Math.sin(a)]; }
  return [81, 51 + (d - 35 - Math.PI * 31)];
}
const LETTERS: [number, string, boolean][] = [
  [0, 'M28 5H5V22H27V39H4', false], [42, 'M3 42L16 4L29 42M9 28H23', false], [84, 'M4 42V4L28 42V4', false], [126, 'M3 42L16 4L29 42M9 28H23', false],
  [168, 'M4 4V42H15A13 13 0 0 0 28 29V17A13 13 0 0 0 15 4Z', false],
  [236, 'M26 4V29A13 13 0 0 1 13 42H4', true], [278, 'M3 42L16 4L29 42M9 28H23', true], [320, 'M16 4V42', true], [362, 'M4 4V42M27 4L4 26M13 18L28 42', true],
];

export function Splash({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const { width } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const [tip] = useState(randomTip);
  const [finished, setFinished] = useState(false);
  const size = Math.min(width * 0.46, 190);
  const wordW = Math.min(width * 0.8, 380);

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: DUR, easing: Easing.linear, useNativeDriver: false }).start(() => setFinished(true));
  }, [t]);
  useEffect(() => {
    if (!finished || !ready) return;
    Animated.timing(out, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => onDone());
  }, [finished, ready, out, onDone]);

  // t بين 0 و1 => ثواني = t*5
  const k = (a: number, b: number, from: number, to: number) => t.interpolate({ inputRange: [a / 5, b / 5], outputRange: [from, to], extrapolate: 'clamp' });
  const archOff = k(0.25, 1.15, AL, 0);
  const chevOp = k(1.15, 1.45, 0, 1);
  const chevY = k(1.15, 1.65, 8, 0);
  const tagOp = k(1.4, 2.0, 0, 1);
  const tipOp = k(2.0, 2.7, 0, 1);
  const glow = k(0.1, 1.1, 0, 1);
  const bar = k(0, 5, 0, 1);
  const wordOp = k(0.9, 1.1, 0, 1);

  // مسار النقطة: دخول، قفزة، ثم صعود على القوس
  const dot = useMemo(() => {
    const ins: number[] = [], xs: number[] = [], ys: number[] = [], os: number[] = [];
    const P0 = at(0);
    const push = (sec: number, x: number, y: number, o: number) => { ins.push(sec / 5); xs.push(x); ys.push(y); os.push(o); };
    push(0, 50, 67, 0); push(1.7, 50, 67, 0); push(2.1, 50, 67, 1);
    for (let i = 1; i <= 8; i++) { const u = i / 8, e = u * u * (3 - 2 * u); push(2.1 + 0.5 * u, 50 + (P0[0] - 50) * e, 67 + (P0[1] - 67) * e - Math.sin(Math.PI * u) * 24, 1); }
    for (let i = 1; i <= 40; i++) { const q = i / 40, p = at(q * AL); push(2.6 + 2.3 * q, p[0], p[1], 1); }
    push(5, at(AL)[0], at(AL)[1], 1);
    const m = (arr: number[]) => t.interpolate({ inputRange: ins, outputRange: arr, extrapolate: 'clamp' });
    return { cx: m(xs), cy: m(ys), op: m(os) };
  }, [t]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: out }]} pointerEvents={finished && ready ? 'none' : 'auto'}>
      <Animated.View style={[s.glow, { opacity: glow }]} />
      <View style={{ width: size, height: size }}>
        <Svg viewBox="0 0 100 100" width={size} height={size}>
          <AP d={ARCH} fill="none" stroke={C.accent} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[AL, AL]} strokeDashoffset={archOff as unknown as number} />
          <AP d="M35.5 73L50 57.5L64.5 73" fill="none" stroke="#F5F5F0" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={chevOp as unknown as number} />
          <AC cx={dot.cx as unknown as number} cy={dot.cy as unknown as number} r={5.2} fill="#F5F5F0" opacity={dot.op as unknown as number} />
        </Svg>
      </View>
      <Animated.View style={{ marginTop: 18, opacity: wordOp, width: wordW, height: (wordW * 72) / 410 }}>
        <Svg viewBox="-6 -14 410 72" width={wordW} height={(wordW * 72) / 410}>
          {LETTERS.map(([x, d, o], i) => {
            const off = t.interpolate({ inputRange: [(0.9 + i * 0.11) / 5, (1.5 + i * 0.11) / 5], outputRange: [140, 0], extrapolate: 'clamp' });
            return <AP key={i} d={d} transform={`translate(${x} 0)`} fill="none" stroke={o ? C.accent : '#F5F5F0'} strokeWidth={6.5} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit={2.2} strokeDasharray={[140, 140]} strokeDashoffset={off as unknown as number} />;
          })}
          <AR x={-6} y={-11} width={6} height={6} fill={C.accent} opacity={wordOp as unknown as number} />
          <AR x={398} y={49} width={6} height={6} fill={C.accent} opacity={wordOp as unknown as number} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ opacity: tagOp, marginTop: 14 }}>
        <T style={{ color: C.accent2, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>سندك بضغطة</T>
      </Animated.View>
      <Animated.View style={[s.tip, { opacity: tipOp }]}>
        <View style={s.tipIc}><T style={{ fontSize: 22 }}>💡</T></View>
        <View style={{ flex: 1 }}>
          <T style={{ color: C.accent2, fontSize: 12.5, fontWeight: '800', marginBottom: 4 }}>معلومة تنقذك</T>
          <T style={{ fontSize: 15, lineHeight: 25 }}>{tip}</T>
        </View>
      </Animated.View>
      <View style={s.barTrack}><Animated.View style={[s.barFill, { transform: [{ scaleX: bar }] }]} /></View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: '#0d1012', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  glow: { position: 'absolute', width: '140%', height: '70%', top: '12%', borderRadius: 999, backgroundColor: 'rgba(255,107,44,0.10)' },
  tip: { position: 'absolute', bottom: 70, left: 20, right: 20, maxWidth: 440, alignSelf: 'center', flexDirection: 'row-reverse', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,107,44,0.12)', borderWidth: 1, borderColor: 'rgba(255,138,61,0.35)', borderRightWidth: 4, borderRightColor: C.accent },
  tipIc: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent },
  barTrack: { position: 'absolute', bottom: 38, left: 40, right: 40, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: 3, width: '100%', backgroundColor: C.accent, transformOrigin: 'right' },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { C } from '@/lib/theme';

// افتتاحية سند جايك (نفس الموقع): القوس يترسم، السهم يطلع، النقطة تنط من داخل السهم
// لبداية القوس وتطلع عليه مع نسبة التحميل، وكلمة SANAD JAIK تترسم هندسياً.
const AP = Animated.createAnimatedComponent(Path);
const AC = Animated.createAnimatedComponent(Circle);
const ARCH = 'M19 86V51a31 31 0 0 1 62 0V86';
const AL = 35 + Math.PI * 31 + 35;
const DUR = 3000;

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
  const { width, height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const [finished, setFinished] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const size = Math.min(width * 0.42, 180);
  const wordW = Math.min(width * 0.62, 300);

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: DUR, easing: Easing.linear, useNativeDriver: false }).start(() => setFinished(true));
  }, [t]);
  // حماية نهائية: مهما صار، السبلاش يختفي ويترك اللمس
  useEffect(() => {
    const id = setTimeout(() => doneRef.current(), DUR + 3000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!finished || !ready) return;
    Animated.timing(out, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => doneRef.current());
    const id = setTimeout(() => doneRef.current(), 700);
    return () => clearTimeout(id);
  }, [finished, ready, out]);

  // الخط الزمني: 3 ثواني
  const k = (a: number, b: number, from: number, to: number, easing?: (x: number) => number) =>
    t.interpolate({ inputRange: [a / 3, b / 3], outputRange: [from, to], extrapolate: 'clamp', easing });
  const ease = Easing.out(Easing.cubic);
  const archOff = k(0.15, 1.5, AL, 0, ease);
  const chevOp = k(1.3, 1.7, 0, 1);
  const scale = k(0, 1.6, 0.82, 1, Easing.out(Easing.back(1.4)));
  const logoOp = k(0, 0.5, 0, 1);
  const glow = k(0, 1.4, 0, 1);
  const wordOp = k(1.7, 2.4, 0, 1);
  const wordY = k(1.7, 2.4, 10, 0, ease);
  // النقطة تطلع على القوس
  const dot = useMemo(() => {
    const ins: number[] = [], xs: number[] = [], ys: number[] = [], os: number[] = [];
    const push = (sec: number, x: number, y: number, o: number) => { ins.push(sec / 3); xs.push(x); ys.push(y); os.push(o); };
    push(0, 50, 67, 0); push(1.2, 50, 67, 0); push(1.5, 50, 67, 1);
    for (let i = 1; i <= 24; i++) { const q = i / 24, p = at(q * AL), e = 1 - Math.pow(1 - q, 2); const pe = at(e * AL); void p; push(1.5 + 1.4 * q, pe[0], pe[1], 1); }
    push(3, at(AL)[0], at(AL)[1], 1);
    const m = (arr: number[]) => t.interpolate({ inputRange: ins, outputRange: arr, extrapolate: 'clamp' });
    return { cx: m(xs), cy: m(ys), op: m(os) };
  }, [t]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: out }]} pointerEvents={finished && ready ? 'none' : 'auto'}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#1d2329" />
            <Stop offset="0.55" stopColor="#12161a" />
            <Stop offset="1" stopColor="#0a0c0e" />
          </LinearGradient>
          <RadialGradient id="gl" cx="50%" cy="42%" rx="60%" ry="40%">
            <Stop offset="0" stopColor="#FF6B2C" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#FF6B2C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#bg)" />
      </Svg>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width={width} height={height}><Rect x="0" y="0" width={width} height={height} fill="url(#gl)" /></Svg>
      </Animated.View>
      <Animated.View style={{ width: size, height: size, opacity: logoOp, transform: [{ scale }] }}>
        <Svg viewBox="0 0 100 100" width={size} height={size}>
          <AP d={ARCH} fill="none" stroke={C.accent} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[AL, AL]} strokeDashoffset={archOff as unknown as number} />
          <AP d="M35.5 73L50 57.5L64.5 73" fill="none" stroke="#F5F5F0" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={chevOp as unknown as number} />
          <AC cx={dot.cx as unknown as number} cy={dot.cy as unknown as number} r={5.2} fill="#F5F5F0" opacity={dot.op as unknown as number} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ marginTop: 22, opacity: wordOp, transform: [{ translateY: wordY }], width: wordW, height: (wordW * 72) / 410 }}>
        <Svg viewBox="-6 -14 410 72" width={wordW} height={(wordW * 72) / 410}>
          {LETTERS.map(([x, d, o], i) => (
            <Path key={i} d={d} transform={`translate(${x} 0)`} fill="none" stroke={o ? C.accent : '#F5F5F0'} strokeWidth={6.5} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit={2.2} />
          ))}
          <Rect x={-6} y={-11} width={6} height={6} fill={C.accent} />
          <Rect x={398} y={49} width={6} height={6} fill={C.accent} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});

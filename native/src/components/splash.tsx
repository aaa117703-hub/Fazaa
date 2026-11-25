import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Diamond, Hook } from '@/components/logo-mark';
import { C, fontFor } from '@/lib/theme';

// افتتاحية سند جايك، قصة الخدمة بثلاث ثوانٍ:
// موقعك (الألماسة) ينبض → الخطاف ينزل على سلسلة ويتأرجح → يلتقطك بضربة (اهتزاز + موجة)
// → يرفعك ويستقر شعاراً → «سند جايك» على الطريق. كلها native driver.
const DUR = 3400;
const T0 = { drop: 300, catch: 1100, lift: 1500, word: 1950, sub: 2250 };

const clampAt = (v: number) => v / DUR;

// سلسلة: حلقات متناوبة (عمودية وأفقية) تبدأ من رأس الخطاف وتطلع لفوق
function Chain({ u, length }: { u: number; length: number }) {
  const lw = 6.2 * u; // عرض الحلقة
  const ll = 14 * u; // طول الحلقة
  const step = 9 * u; // المسافة بين الحلقات
  const sw = 2.3 * u; // سُمك الحديد
  const n = Math.ceil(length / step) + 1;
  const links: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const c = length - ll / 2 - i * step; // مركز الحلقة (الأسفل يلتقط الخطاف)
    if (c < -ll) break;
    links.push(
      i % 2 === 0 ? (
        <Rect key={i} x={ll / 2 - lw / 2} y={c - ll / 2} width={lw} height={ll} rx={lw / 2} fill="none" stroke={C.accent} strokeWidth={sw} />
      ) : (
        <Rect key={i} x={0} y={c - lw / 2} width={ll} height={lw} rx={lw / 2} fill="none" stroke={C.accent} strokeWidth={sw} />
      ),
    );
  }
  return <Svg width={ll} height={length}>{links}</Svg>;
}

export function Splash({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const { width, height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const [finished, setFinished] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const M = Math.min(width * 0.62, 260);
  const u = M / 120;
  const dia = 22.7 * u; // قطر الألماسة
  const extra = M * 0.7; // مساحة الكلمة تحت الشعار
  const boxH = M + extra;
  const off = extra / 2; // بداية الشعار: الألماسة بمنتصف الشاشة مثل سبلاش النظام
  const offX = 5 * u;
  // نقطة تعليق الخطاف (رأسه) داخل مربع الشعار، بعد الإزاحة (-1، -5) للشبكة 120
  const Px = 96 * u;
  const Py = 17 * u;
  const chainLen = height * 1.4 + M; // السلسلة تطلع لفوق خارج الشاشة
  const linkL = 14 * u;

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: DUR, easing: Easing.linear, useNativeDriver: true }).start(() => setFinished(true));
    const buzz = (style: Haptics.ImpactFeedbackStyle) => { try { Haptics.impactAsync(style).catch(() => {}); } catch { /* */ } };
    const a = setTimeout(() => buzz(Haptics.ImpactFeedbackStyle.Heavy), T0.catch);
    const b = setTimeout(() => buzz(Haptics.ImpactFeedbackStyle.Light), T0.lift + 420);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [t]);
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

  // مساعدات الخط الزمني
  const seg = (a: number, b: number, from: number, to: number, easing?: (x: number) => number) =>
    t.interpolate({ inputRange: [clampAt(a), clampAt(b)], outputRange: [from, to], extrapolate: 'clamp', easing });
  const keys = (pts: [number, number][]) =>
    t.interpolate({ inputRange: pts.map((p) => clampAt(p[0])), outputRange: pts.map((p) => p[1]), extrapolate: 'clamp' });

  // الخطاف: نزول متسارع + ارتداد «بلعة» عند الالتقاط
  const dropY = Animated.add(
    seg(T0.drop, T0.catch, -(height / 2 + M), 0, Easing.in(Easing.quad)),
    keys([[T0.catch, 0], [T0.catch + 110, 14], [T0.catch + 300, -3], [T0.catch + 460, 0]]),
  );
  // التأرجح يتناقص حول رأس الخطاف
  const swing = t.interpolate({
    inputRange: [T0.drop, 520, 780, 960, T0.catch].map(clampAt),
    outputRange: ['16deg', '-11deg', '6deg', '-2deg', '0deg'],
    extrapolate: 'clamp',
  });
  const hookOp = seg(T0.drop - 50, T0.drop + 10, 0, 1);

  // السلسلة تنسحب لفوق بعد الرفع
  const chainOp = seg(T0.lift, T0.lift + 350, 1, 0);

  // الرفع: الشعار كله يطلع من مكان الالتقاط لمكانه النهائي مع تجاوز بسيط
  const back = Easing.out(Easing.back(1.7));
  const liftY = seg(T0.lift, T0.lift + 750, off, 0, back);
  const liftX = seg(T0.lift, T0.lift + 750, offX, 0, back);
  const liftS = keys([[T0.lift, 1], [T0.lift + 300, 1.07], [T0.lift + 800, 1]]);

  // الألماسة: نبض الموقع ثم ضربة الالتقاط
  const diaS = keys([[0, 1], [250, 1.22], [500, 1], [750, 1.22], [1000, 1], [T0.catch, 0.88], [T0.catch + 150, 1.5], [T0.catch + 420, 1]]);

  // موجات النبض (قبل الالتقاط) وموجة الصدمة (عند الالتقاط)
  const ring = (a: number, b: number, from: number, to: number, o: number) => ({
    transform: [{ scale: seg(a, b, from, to, Easing.out(Easing.quad)) }],
    opacity: t.interpolate({ inputRange: [clampAt(a), clampAt(a + 60), clampAt(b)], outputRange: [0, o, 0], extrapolate: 'clamp' }),
  });
  const r1 = ring(60, 820, 1, 6, 0.55);
  const r2 = ring(420, 1200, 1, 6, 0.4);
  const shock = ring(T0.catch, T0.catch + 650, 1, 11, 0.9);
  const glowS = seg(T0.catch, T0.catch + 700, 0.3, 1.5, Easing.out(Easing.cubic));
  const glowO = keys([[T0.catch - 10, 0], [T0.catch + 90, 0.5], [T0.catch + 700, 0]]);

  // اهتزاز الشاشة عند الالتقاط
  const shake = keys([[T0.catch, 0], [T0.catch + 50, -7], [T0.catch + 100, 7], [T0.catch + 160, -4], [T0.catch + 220, 3], [T0.catch + 300, 0]]);

  // الطريق + الكلمة
  const dashes = [0, 1, 2, 3, 4, 5, 6];
  const wordOp = seg(T0.word, T0.word + 500, 0, 1);
  const wordY = seg(T0.word, T0.word + 600, 18, 0, Easing.out(Easing.cubic));
  const subOp = seg(T0.sub, T0.sub + 450, 0, 1);

  const ringBase = { position: 'absolute' as const, left: -dia / 2, top: -dia / 2, width: dia, height: dia, borderRadius: dia / 2, borderColor: C.accent, borderWidth: 2 };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, { opacity: out }]} pointerEvents={finished && ready ? 'none' : 'auto'}>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', transform: [{ translateX: shake }] }]}>
        {/* موجات النبض والصدمة: مركزها موقع الألماسة بمنتصف الشاشة */}
        <View style={{ position: 'absolute', left: width / 2, top: height / 2, width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', left: -M * 0.45, top: -M * 0.45, width: M * 0.9, height: M * 0.9, borderRadius: M * 0.45, backgroundColor: C.accent, opacity: glowO, transform: [{ scale: glowS }] }} />
          <Animated.View style={[ringBase, r1]} />
          <Animated.View style={[ringBase, r2]} />
          <Animated.View style={[ringBase, { borderWidth: 4 }, shock]} />
        </View>

        <View style={{ width: M, height: boxH, alignItems: 'center' }}>
          <Animated.View style={{ width: M, height: M, transform: [{ translateX: liftX }, { translateY: liftY }, { scale: liftS }] }}>
            {/* الخطاف والسلسلة: نقطة الدوران هي رأس الخطاف، فتتأرجح السلسلة معه */}
            <Animated.View style={{ position: 'absolute', left: Px, top: Py, width: 0, height: 0, opacity: hookOp, transform: [{ translateY: dropY }, { rotate: swing }] }}>
              <Animated.View style={{ position: 'absolute', left: -linkL / 2, top: -chainLen, width: linkL, height: chainLen, opacity: chainOp }}>
                <Chain u={u} length={chainLen} />
              </Animated.View>
              <View style={{ position: 'absolute', left: -Px, top: -Py, width: M, height: M }}>
                <Hook size={M} />
              </View>
            </Animated.View>
            {/* الألماسة فوق الخطاف */}
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: M, height: M, transform: [{ scale: diaS }] }}>
              <Diamond size={M} />
            </Animated.View>
          </Animated.View>

          {/* الطريق: خط متقطع يمشي */}
          <View style={{ position: 'absolute', top: M + M * 0.04, flexDirection: 'row-reverse', gap: M * 0.04 }}>
            {dashes.map((i) => {
              const a = T0.lift + 250 + i * 70;
              return (
                <Animated.View key={i} style={{ width: M * 0.07, height: 3, borderRadius: 2, backgroundColor: i === 0 ? C.accent : 'rgba(245,245,240,0.22)', opacity: seg(a, a + 260, 0, 1), transform: [{ translateX: seg(a, a + 360, M * 0.12, 0, Easing.out(Easing.cubic)) }] }} />
              );
            })}
          </View>

          <View style={{ position: 'absolute', top: M + M * 0.12, alignItems: 'center' }}>
            <Animated.Text style={{ color: '#F5F5F0', fontFamily: fontFor('700'), fontSize: M * 0.2, lineHeight: M * 0.3, opacity: wordOp, transform: [{ translateY: wordY }] }}>
              سند جايك
            </Animated.Text>
            <Animated.Text style={{ color: C.accent, fontFamily: fontFor('600'), fontSize: 13, letterSpacing: 6, opacity: subOp, marginTop: 2 }}>
              SANAD JAIK
            </Animated.Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100, backgroundColor: C.bg },
});

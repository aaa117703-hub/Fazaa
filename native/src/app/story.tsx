import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Piece } from '@/components/logo3d';
import { T, Muted } from '@/components/ui';
import { STORY_KEY } from '@/lib/story-key';
import { C } from '@/lib/theme';

const A = { x: 0, y: 0, rx: 0, rz: 0, s: 1 };
// مشاهد القصة: كل مرحلة تمهّد للي بعدها (نفس منطق الموقع)
const STOPS = [
  { p: 0.0, rx: -8, ry: -35, sc: 0.9, arch: A, dot: A, chev: A },
  { p: 0.16, rx: -10, ry: 18, sc: 1, arch: A, dot: A, chev: A },
  { p: 0.38, rx: -18, ry: 0, sc: 0.95, arch: { x: 0, y: 30, rx: 72, rz: 0, s: 1.25 }, dot: { x: 0, y: -46, rx: 0, rz: 0, s: 1.5 }, chev: { x: -26, y: 34, rx: 72, rz: -18, s: 1 } },
  { p: 0.62, rx: -16, ry: 0, sc: 0.95, arch: { x: 0, y: 30, rx: 72, rz: 0, s: 1.25 }, dot: { x: 0, y: -46, rx: 0, rz: 0, s: 1.5 }, chev: { x: 0, y: -22, rx: 0, rz: 0, s: 1.3 } },
  { p: 0.82, rx: -8, ry: 180, sc: 0.9, arch: { ...A, s: 1.12 }, dot: { ...A, s: 1.12 }, chev: { ...A, s: 1.12 } },
  { p: 1.0, rx: -6, ry: 360, sc: 1.05, arch: A, dot: A, chev: A },
];
const CAPS = [
  { a: 0.0, b: 0.16, h: 'سند جايك', t: 'سندك بضغطة. اسحب لتحت وشوف شلون يشتغل.' },
  { a: 0.2, b: 0.38, h: 'الخريطة تدلك', t: 'القوس يصير طريق، وتشوف أقرب كرين لموقعك بالعراق كله.' },
  { a: 0.42, b: 0.62, h: 'اتصل مباشرة', t: 'السهم يوصل للكرين بدقيقة، ضغطة وحدة واتصال بدون وسيط.' },
  { a: 0.66, b: 0.8, h: 'وكرينك يبرز', t: 'للسائقين: باقات تطلّعك أول القائمة وتزيد طلباتك.' },
  { a: 0.86, b: 1.0, h: 'جاهز؟ يلا', t: 'سندك دايماً قريب منك.' },
];

export default function Story() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(0)).current;
  const size = Math.round(Math.min(width * 0.62, height * 0.32, 300));
  const max = height * 5;
  const inp = STOPS.map((s) => s.p * max);
  const I = (f: (s: (typeof STOPS)[number]) => number | string) =>
    y.interpolate({ inputRange: inp, outputRange: STOPS.map(f) as never, extrapolate: 'clamp' });

  const piece = (k: 'arch' | 'dot' | 'chev') => ({
    transform: [
      { translateX: I((s) => (s[k].x * size) / 100) },
      { translateY: I((s) => (s[k].y * size) / 100) },
      { rotateX: I((s) => s[k].rx + 'deg') },
      { rotateZ: I((s) => s[k].rz + 'deg') },
      { scale: I((s) => s[k].s) },
    ],
  });
  const world = {
    transform: [
      { perspective: 900 },
      { rotateX: I((s) => s.rx + 'deg') },
      { rotateY: I((s) => s.ry + 'deg') },
      { scale: I((s) => s.sc) },
    ],
  };
  const close = () => { AsyncStorage.setItem(STORY_KEY, '1').catch(() => {}); router.back(); };
  const floor = y.interpolate({ inputRange: [0.14, 0.3, 0.7, 0.8].map((v) => v * max), outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
  const ct = y.interpolate({ inputRange: [0.9 * max, 0.97 * max], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0c0e' }}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}>
        <View style={{ height: height * 6 }} />
      </Animated.ScrollView>

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: height * 0.12 }]} pointerEvents="none">
          <Animated.View style={[{ position: 'absolute', width: size * 2, height: size * 2, opacity: floor, transform: [{ perspective: 900 }, { rotateX: '72deg' }, { translateY: size * 0.3 }] }]}>
            {[...Array(11)].map((_, i) => (
              <React.Fragment key={i}>
                <View style={{ position: 'absolute', left: 0, right: 0, top: (i / 10) * size * 2, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: (i / 10) * size * 2, width: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              </React.Fragment>
            ))}
          </Animated.View>
          <Animated.View style={[{ width: size, height: size }, world]}>
            <Piece k="arch" size={size} style={piece('arch')} />
            <Piece k="dot" size={size} style={piece('dot')} />
            <Piece k="chev" size={size} style={piece('chev')} />
          </Animated.View>
        </View>

        {CAPS.map((c, i) => {
          const last = i === CAPS.length - 1;
          const op = y.interpolate({
            inputRange: [(c.a - 0.001) * max, (c.a + 0.035) * max, (c.b - 0.03) * max, c.b * max + 1].map((v, j, arr) => (j && v <= arr[j - 1] ? arr[j - 1] + 1 : v)),
            outputRange: [0, 1, 1, last ? 1 : 0], extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + (last ? height * 0.17 : height * 0.09), alignItems: 'center', opacity: op }}>
              <T style={{ fontSize: 30, fontWeight: '800', textAlign: 'center', color: '#fff' }}>{c.h}</T>
              <Muted style={{ textAlign: 'center', marginTop: 8, fontSize: 16, lineHeight: 26 }}>{c.t}</Muted>
            </Animated.View>
          );
        })}

        <Pressable onPress={close} style={{ position: 'absolute', top: insets.top + 12, left: 16, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
          <T style={{ fontWeight: '700' }}>تخطّي</T>
        </Pressable>
        <Animated.View style={{ position: 'absolute', alignSelf: 'center', bottom: insets.bottom + height * 0.05, opacity: ct }}>
          <Pressable onPress={close} style={{ backgroundColor: C.accent, paddingHorizontal: 38, paddingVertical: 16, borderRadius: 18 }}>
            <T style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>ابدأ الآن</T>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

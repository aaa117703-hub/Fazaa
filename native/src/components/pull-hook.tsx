import React, { useMemo, useRef } from 'react';
import { Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Hook } from '@/components/logo-mark';
import { C } from '@/lib/theme';

// سحب للتحديث بالخطاف: الخطاف يتدلّى من أعلى الشاشة بسلسلة مع إصبعك، ويتأرجح وهو يحمّل،
// وبعد ما يخلص يطلع لفوق بنابض خفيف وتأرجح، ويختفي خلال ثانية تقريباً.
const HK = 52; // حجم الخطاف
const AX = (88 / 120) * HK; // نقطة ربط السلسلة داخل مربع الخطاف
const AY = (19 / 120) * HK;
const LW = 9; // عرض الحلقة
const LL = 16; // طول الحلقة
const STEP = 11; // المسافة بين الحلقات
const SW = 2.2; // سُمك الحديد
const T = 58; // عتبة التشغيل (~2 سم)

function ChainSvg({ h }: { h: number }) {
  const links = useMemo(() => {
    const out: React.ReactNode[] = [];
    const n = Math.ceil(h / STEP) + 1;
    for (let i = 0; i < n; i++) {
      const c = h - LL / 2 - i * STEP; // الأسفل يلتقط الخطاف
      if (c < -LL) break;
      out.push(
        i % 2 === 0 ? (
          <Rect key={i} x={LL / 2 - LW / 2} y={c - LL / 2} width={LW} height={LL} rx={LW / 2} fill="none" stroke={C.accent} strokeWidth={SW} />
        ) : (
          <Rect key={i} x={0} y={c - LW / 2} width={LL} height={LW} rx={LW / 2} fill="none" stroke={C.accent} strokeWidth={SW} />
        ),
      );
    }
    return out;
  }, [h]);
  return <Svg width={LL} height={h}>{links}</Svg>;
}

export function usePullHook(onRefresh: () => Promise<unknown> | void) {
  const { width, height } = useWindowDimensions();
  const HMAX = Math.min(height * 0.25, 240); // أقصى سحب: ربع الشاشة
  const HANG = HMAX * 0.7; // طول التدلي وهو يحمّل
  const CH = height + 200; // سلسلة كاملة تكفي أي سحب

  const L = useRef(new Animated.Value(0)).current; // موقع الخطاف
  const sw = useRef(new Animated.Value(0)).current; // زاوية التأرجح (درجات)
  const op = useRef(new Animated.Value(0)).current;
  const active = useRef(false);
  const loop = useRef<Animated.CompositeAnimation | null>(null);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const retract = () => {
    loop.current?.stop();
    sw.stopAnimation();
    L.stopAnimation();
    Animated.parallel([
      Animated.timing(L, { toValue: -(HK + 80), duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(sw, { toValue: 14, duration: 140, useNativeDriver: false }),
        Animated.timing(sw, { toValue: -10, duration: 240, useNativeDriver: false }),
        Animated.timing(sw, { toValue: 6, duration: 220, useNativeDriver: false }),
        Animated.timing(sw, { toValue: -2, duration: 170, useNativeDriver: false }),
        Animated.timing(sw, { toValue: 0, duration: 130, useNativeDriver: false }),
      ]),
    ]).start(() => {
      active.current = false;
      L.setValue(0);
      op.setValue(0);
      sw.setValue(0);
    });
  };

  const start = async () => {
    active.current = true;
    L.stopAnimation();
    sw.stopAnimation();
    Animated.timing(op, { toValue: 1, duration: 120, useNativeDriver: false }).start();
    Animated.spring(L, { toValue: HANG, friction: 6, tension: 90, useNativeDriver: false }).start();
    loop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(sw, { toValue: 5, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(sw, { toValue: -5, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.current.start();
    try { await Promise.resolve(refreshRef.current()); } catch { /* الخطأ يتعالج بالشاشة نفسها */ }
    retract();
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (active.current) return;
    const P = Math.max(0, -e.nativeEvent.contentOffset.y);
    // قبل العتبة 1:1، وبعدها مقاومة (نص السحب)، والسقف ربع الشاشة
    const v = P < T ? P : Math.min(HMAX, T + (P - T) * 0.5);
    L.setValue(v);
    op.setValue(Math.min(1, P / 14));
  };

  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (active.current) return;
    if (-e.nativeEvent.contentOffset.y >= T) start();
  };

  const overlay = (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity: op }]}>
      <Animated.View
        style={{
          position: 'absolute',
          left: width / 2,
          top: 0,
          width: 0,
          height: 0,
          transform: [{ rotate: sw.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }],
        }}
      >
        <Animated.View style={{ position: 'absolute', left: -LL / 2, top: 0, width: LL, height: CH, transform: [{ translateY: Animated.add(L, AY - CH) }] }}>
          <ChainSvg h={CH} />
          <View style={{ position: 'absolute', left: LL / 2 - AX, top: CH - AY, width: HK, height: HK }}>
            <Hook size={HK} />
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );

  return { overlay, scrollProps: { onScroll, onScrollEndDrag, scrollEventThrottle: 16 } as const };
}

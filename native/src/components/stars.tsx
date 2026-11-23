import React, { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';

import { T } from '@/components/ui';
import { C } from '@/lib/theme';

// نجوم بنصف نجمة. النجمة الأولى على اليمين (عربي)، والتعبئة من اليمين لليسار.
function Star({ fill, size }: { fill: number; size: number }) {
  const w = Math.round(size * 1.08);
  return (
    <View style={{ width: w, height: size * 1.25, alignItems: 'center' }}>
      <T style={{ position: 'absolute', fontSize: size, lineHeight: size * 1.25, width: w, textAlign: 'center', color: C.line }}>★</T>
      {fill > 0 && (
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: w * fill, overflow: 'hidden' }}>
          <T style={{ position: 'absolute', right: 0, fontSize: size, lineHeight: size * 1.25, width: w, textAlign: 'center', color: C.warn }}>★</T>
        </View>
      )}
    </View>
  );
}

export function StarsView({ value, size = 16 }: { value: number; size?: number }) {
  return <View style={{ flexDirection: 'row-reverse' }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill={Math.max(0, Math.min(1, value - (n - 1)))} />)}</View>;
}

/** اسحب بإصبعك على النجوم من اليمين لليسار حتى تحدد التقييم (بخطوات نصف نجمة). */
export function StarPicker({ value, onChange, size = 42 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const box = useRef<View>(null);
  const geo = useRef({ right: 0, w: 1 });
  const cb = useRef(onChange); cb.current = onChange;
  const pan = useMemo(() => {
    const upd = (pageX: number) => {
      const frac = Math.max(0, Math.min(1, (geo.current.right - pageX) / geo.current.w));
      cb.current(Math.max(0.5, Math.ceil(frac * 10) / 2));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const px = e.nativeEvent.pageX;
        box.current?.measureInWindow((x, _y, w) => { geo.current = { right: x + w, w: w || 1 }; upd(px); });
      },
      onPanResponderMove: (e) => upd(e.nativeEvent.pageX),
    });
  }, []);
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View ref={box} {...pan.panHandlers} collapsable={false} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
        <StarsView value={value} size={size} />
      </View>
      <T style={{ color: C.muted, fontSize: 13 }}>{value > 0 ? value.toFixed(1) + ' من 5' : 'اسحب على النجوم لتقييم الخدمة'}</T>
    </View>
  );
}

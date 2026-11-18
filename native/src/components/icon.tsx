import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { ICONS, type IconName } from '@/lib/icon-data';
import { C } from '@/lib/theme';

export type { IconName };

type Def = { w: readonly string[]; c: readonly (readonly [number, number, number])[]; y: readonly string[]; yc?: readonly (readonly [number, number, number])[]; yf?: readonly (readonly [number, number, number])[]; yf2?: readonly string[] };

// أيقونات سند جايك: أبيض + أصفر. mono = لون واحد (فوق خلفية صفراء أو ملوّنة).
export function Icon({ name, size = 24, color = '#F5F5F0', accent = C.accent, mono }: { name: IconName; size?: number; color?: string; accent?: string; mono?: string }) {
  const d = ICONS[name] as unknown as Def;
  const wc = mono ?? color, yc = mono ?? accent;
  const sw = 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill="none" stroke={wc} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        {d.c.map((c, i) => <Circle key={'c' + i} cx={c[0]} cy={c[1]} r={c[2]} />)}
        {d.w.map((p, i) => <Path key={'w' + i} d={p} />)}
      </G>
      <G fill="none" stroke={yc} strokeWidth={sw + 0.2} strokeLinecap="round" strokeLinejoin="round">
        {d.y.map((p, i) => <Path key={'y' + i} d={p} />)}
        {(d.yc ?? []).map((c, i) => <Circle key={'yc' + i} cx={c[0]} cy={c[1]} r={c[2]} />)}
      </G>
      {(d.yf || d.yf2) && (
        <G fill={yc} stroke="none">
          {(d.yf ?? []).map((c, i) => <Circle key={'yf' + i} cx={c[0]} cy={c[1]} r={c[2]} />)}
          {(d.yf2 ?? []).map((p, i) => <Path key={'yp' + i} d={p} />)}
        </G>
      )}
    </Svg>
  );
}

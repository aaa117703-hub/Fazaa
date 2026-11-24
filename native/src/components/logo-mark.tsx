import React from 'react';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

// شعار سند جايك: «الجيم الخطّاف». الخطاف أصفر والنقطة (موقعك) علامة طريق بيضاء. شبكة 120.
export const HOOK_D = 'M98 22C82 18 54 22 36 36C42 46 62 43 79 41C80 58 75 71 66 78C55 86 40 82 22 60C22 94 52 110 77 102C95 95 101 66 98 22Z';
export const YELLOW = '#FFC93C';
export const WHITE = '#F5F5F0';

export function Hook({ size, color = YELLOW }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G transform="translate(-1 -5)"><Path d={HOOK_D} fill={color} /></G>
    </Svg>
  );
}

// الألماسة وحدها داخل مربع بنفس شبكة الشعار (مركزها 55،61)
export function Diamond({ size, color = WHITE }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G transform="translate(-1 -5)"><Rect x={48} y={58} width={16} height={16} rx={2.5} fill={color} transform="rotate(45 56 66)" /></G>
    </Svg>
  );
}

export function Mark({ size, hook = YELLOW, dot = WHITE }: { size: number; hook?: string; dot?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G transform="translate(-1 -5)">
        <Path d={HOOK_D} fill={hook} />
        <Rect x={48} y={58} width={16} height={16} rx={2.5} fill={dot} transform="rotate(45 56 66)" />
      </G>
    </Svg>
  );
}

// لودر التحديث: الخطاف يمتلئ أصفر من تحت لفوق حسب النسبة، والألماسة بالنص.
export function HookLoader({ pct, size = 150 }: { pct: number; size?: number }) {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const top = 100 - 100 * p; // y في الشبكة (الخطاف من 13 إلى 100 تقريباً)
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <ClipPath id="fill"><Rect x={0} y={top + 4} width={120} height={120} /></ClipPath>
      </Defs>
      <G transform="translate(-1 -5)">
        <Path d={HOOK_D} fill="rgba(255,255,255,0.14)" />
        <G clipPath="url(#fill)"><Path d={HOOK_D} fill={YELLOW} /></G>
        <Rect x={48} y={58} width={16} height={16} rx={2.5} fill={WHITE} transform="rotate(45 56 66)" />
      </G>
    </Svg>
  );
}

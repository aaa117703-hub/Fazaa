import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';

import { tr } from '@/lib/i18n';
import { btnScale, fontScale, usePrefs } from '@/lib/prefs';
import { evt } from '@/lib/debuglog';
import { tap } from '@/lib/safe';
import { C, R, fontFor } from '@/lib/theme';

// تخطيط عربي ثابت (من اليمين لليسار) بغضّ النظر عن لغة الجهاز.
export const rtl = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  text: { textAlign: 'right', writingDirection: 'rtl' },
});

function trChildren(c: React.ReactNode, lang: 'ar' | 'en' | 'ckb'): React.ReactNode {
  if (lang === 'ar') return c;
  if (typeof c === 'string') return tr(c, lang);
  if (Array.isArray(c)) return c.map((x) => (typeof x === 'string' ? tr(x, lang) : x));
  return c;
}

export function T({ style, children, ...p }: TextProps) {
  const pr = usePrefs(), k = fontScale(pr);
  const f = StyleSheet.flatten(style) as TextStyle | undefined;
  const size = (f?.fontSize ?? 15) * k;
  const lh = f?.lineHeight ? f.lineHeight * k : undefined;
  const en = pr.lang === 'en';
  return (
    <Text {...p} style={[{ color: C.text }, rtl.text, style, { fontSize: size, lineHeight: lh, fontFamily: fontFor(f?.fontWeight), fontWeight: 'normal' }, en && { textAlign: 'left', writingDirection: 'ltr' }]}>
      {trChildren(children, pr.lang)}
    </Text>
  );
}

export function Muted({ style, ...p }: TextProps) {
  return <T {...p} style={[{ color: C.muted, fontSize: 13 }, style]} />;
}

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[s.card, style]}>{children}</View>;
}

type BtnProps = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  small?: boolean;
};

export function Btn({ label, onPress, kind = 'primary', disabled, style, textStyle, small }: BtnProps) {
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? C.danger : kind === 'secondary' ? C.surface2 : 'transparent';
  const border = kind === 'ghost' ? C.accent : kind === 'secondary' ? C.line : 'transparent';
  const fg = kind === 'primary' ? C.onAccent : kind === 'ghost' ? C.accent : '#fff';
  const bk = btnScale(usePrefs());
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        evt('btn:', label);
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        s.btn,
        small ? { paddingVertical: 8 * bk, paddingHorizontal: 16 * bk, minHeight: 38 * bk } : { paddingVertical: 13 * bk, paddingHorizontal: 20 * bk, minHeight: 48 * bk },
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}>
      <T style={[{ color: fg, fontWeight: '700', textAlign: 'center' }, textStyle]}>{label}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 14 },
  btn: { borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';

import { tap } from '@/lib/safe';
import { C, R } from '@/lib/theme';

// تخطيط عربي ثابت (من اليمين لليسار) بغضّ النظر عن لغة الجهاز.
export const rtl = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  text: { textAlign: 'right', writingDirection: 'rtl' },
});

export function T({ style, ...p }: TextProps) {
  return <Text {...p} style={[{ color: C.text, fontSize: 15 }, rtl.text, style]} />;
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
  const border = kind === 'ghost' ? C.accent : 'transparent';
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        s.btn,
        small && { paddingVertical: 8, paddingHorizontal: 14 },
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}>
      <T style={[{ color: kind === 'ghost' ? C.accent : '#fff', fontWeight: '800', textAlign: 'center' }, textStyle]}>{label}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 14 },
  btn: { borderRadius: R.md, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { T } from '@/components/ui';
import { C } from '@/lib/theme';

// خلفية كاملة لشاشات الدخول واختيار اللغة: غروب على طريق صحراوي مع سطحة سند جايك.
export function AuthBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 420 860" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0E1012" /><Stop offset="0.35" stopColor="#1B1D1C" />
            <Stop offset="0.58" stopColor="#5E4710" /><Stop offset="0.72" stopColor="#C8921E" /><Stop offset="0.8" stopColor="#FFC93C" />
          </LinearGradient>
          <RadialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><Stop offset="0" stopColor="#FFE9A8" stopOpacity="0.95" /><Stop offset="1" stopColor="#FFC93C" stopOpacity="0" /></RadialGradient>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#14171A" stopOpacity="0.1" /><Stop offset="1" stopColor="#14171A" stopOpacity="0.55" /></LinearGradient>
        </Defs>
        <Rect width="420" height="860" fill="url(#sky)" />
        <Circle cx="290" cy="640" r="190" fill="url(#sun)" />
        <Circle cx="290" cy="640" r="46" fill="#FFE08A" />
        <G fill="#fff" opacity="0.55">
          <Circle cx="60" cy="90" r="1.6" /><Circle cx="140" cy="150" r="1.2" /><Circle cx="250" cy="70" r="1.8" /><Circle cx="340" cy="130" r="1.2" /><Circle cx="380" cy="40" r="1.5" /><Circle cx="30" cy="220" r="1.2" /><Circle cx="200" cy="260" r="1.3" />
        </G>
        <Path d="M0 668 Q70 626 150 654 T300 648 T420 636 V860 H0Z" fill="#3A3426" />
        <Path d="M0 700 Q100 660 190 692 T360 684 T420 676 V860 H0Z" fill="#262A2D" />
        <Path d="M0 740 Q120 704 220 730 T420 722 V860 H0Z" fill="#1B1E21" />
        <Path d="M170 860 L205 700 L217 700 L330 860Z" fill="#0F1113" />
        <G stroke="#FFC93C" strokeLinecap="round">
          <Path d="M211 706 v8" strokeWidth="2.5" /><Path d="M213 724 v14" strokeWidth="3.5" /><Path d="M216 752 v22" strokeWidth="5" /><Path d="M221 792 v34" strokeWidth="7" />
        </G>
        <G transform="translate(36 690)" fill="#0A0B0C">
          <Rect x="0" y="22" width="92" height="12" rx="3" />
          <Path d="M60 22 V8 Q60 4 64 4 H78 L90 14 V22Z" />
          <Path d="M6 22 L40 22 L46 10 H12Z" fill="#14171A" />
          <Path d="M10 10 L30 2 L34 6" stroke="#0A0B0C" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Circle cx="20" cy="36" r="8" /><Circle cx="72" cy="36" r="8" />
          <Circle cx="20" cy="36" r="3" fill="#FFC93C" /><Circle cx="72" cy="36" r="3" fill="#FFC93C" />
          <Circle cx="68" cy="2" r="2.6" fill="#FFC93C" />
        </G>
        <Rect width="420" height="860" fill="url(#shade)" />
      </Svg>
    </View>
  );
}

export function LogoMark({ size = 46 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: '#14171A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
      <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 100 100">
        <Path d="M19 86V51a31 31 0 0 1 62 0V86" fill="none" stroke={C.accent} strokeWidth="15" strokeLinecap="round" />
        <Path d="M35.5 73L50 57.5L64.5 73" fill="none" stroke="#F5F5F0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function AuthBrand() {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
      <LogoMark />
      <T style={{ fontSize: 22, fontWeight: '700' }}>سند جايك</T>
    </View>
  );
}

// بطاقة زجاجية بزوايا هلالية
export const glass = {
  backgroundColor: 'rgba(20,23,26,0.78)',
  borderRadius: 34,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
  padding: 22,
} as const;

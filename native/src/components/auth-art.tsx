import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop, G } from 'react-native-svg';

import { T } from '@/components/ui';
import { C } from '@/lib/theme';

// الصورة العلوية لشاشات الدخول واختيار اللغة: غروب على طريق مع سطحة (نفس رسم الموقع).
export function AuthArt({ height = 270 }: { height?: number }) {
  return (
    <View style={{ height, overflow: 'hidden', borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}>
      <Svg width="100%" height="100%" viewBox="0 0 420 230" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#14171A" /><Stop offset="0.55" stopColor="#2A2A22" /><Stop offset="0.82" stopColor="#7A5A12" /><Stop offset="1" stopColor="#FFC93C" />
          </LinearGradient>
          <RadialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><Stop offset="0" stopColor="#FFE08A" /><Stop offset="1" stopColor="#FFC93C" stopOpacity="0" /></RadialGradient>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0.6" stopColor="#14171A" stopOpacity="0" /><Stop offset="1" stopColor="#1C2024" /></LinearGradient>
        </Defs>
        <Rect width="420" height="230" fill="url(#sky)" />
        <Circle cx="300" cy="150" r="70" fill="url(#sun)" />
        <Circle cx="300" cy="150" r="24" fill="#FFD76A" />
        <Path d="M0 160 Q60 132 120 150 T250 146 T420 140 V230 H0Z" fill="#2B3036" opacity="0.95" />
        <Path d="M0 178 Q90 150 170 170 T330 166 T420 160 V230 H0Z" fill="#20252A" />
        <Path d="M170 230 L206 168 L214 168 L268 230Z" fill="#101315" />
        <G stroke="#FFC93C" strokeLinecap="round" strokeWidth="3">
          <Path d="M210 171 v5" /><Path d="M211 184 v8" /><Path d="M212 200 v11" strokeWidth="4" /><Path d="M214 220 v10" strokeWidth="5" />
        </G>
        <G transform="translate(40 150)" fill="#0E1012">
          <Rect x="0" y="22" width="92" height="12" rx="3" />
          <Path d="M60 22 V8 Q60 4 64 4 H78 L90 14 V22Z" />
          <Path d="M6 22 L40 22 L46 10 H12Z" fill="#14171A" />
          <Path d="M10 10 L30 2 L34 6" stroke="#0E1012" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Circle cx="20" cy="36" r="8" /><Circle cx="72" cy="36" r="8" />
          <Circle cx="20" cy="36" r="3" fill="#FFC93C" /><Circle cx="72" cy="36" r="3" fill="#FFC93C" />
          <Circle cx="68" cy="2" r="2.6" fill="#FFC93C" />
        </G>
        <Rect width="420" height="230" fill="url(#fade)" />
      </Svg>
      <View style={{ position: 'absolute', top: 56, right: 20, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#14171A', alignItems: 'center', justifyContent: 'center' }}>
          <Svg width="26" height="26" viewBox="0 0 100 100"><Path d="M19 86V51a31 31 0 0 1 62 0V86" fill="none" stroke={C.accent} strokeWidth="15" strokeLinecap="round" /><Path d="M35.5 73L50 57.5L64.5 73" fill="none" stroke="#F5F5F0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </View>
        <T style={{ fontSize: 22, fontWeight: '700' }}>سند جايك</T>
      </View>
    </View>
  );
}

import { Icon, type IconName } from '@/components/icon';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBg, AuthBrand, glass } from '@/components/auth-art';
import { Btn, Muted, T, rtl } from '@/components/ui';
import { getPrefs, Lang, setPrefs } from '@/lib/prefs';
import { C } from '@/lib/theme';

const LANGS: [Lang, string, string][] = [['ar', 'العربية', 'Arabic'], ['en', 'English', 'الإنجليزية'], ['ckb', 'کوردی', 'Kurdish']];

// أول دخول: اختيار اللغة ثم «تم» ثم شاشة تسجيل الدخول.
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [pick, setPick] = useState<Lang>(getPrefs().lang);
  const choose = (k: Lang) => { setPick(k); setPrefs({ lang: k }); };
  const done = () => {
    setPrefs({ lang: pick, onboarded: true });
    router.replace('/');
    setTimeout(() => router.push('/login'), 250);
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AuthBg />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 18 }}>
        <View style={[glass, { gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' }]}>
          <AuthBrand />
          <T style={{ fontSize: 28, fontWeight: '800', marginTop: 10 }}>اختر لغتك</T>
          <Muted>تكدر تغيّرها بعدين من الإعدادات.</Muted>
          {LANGS.map(([k, name, sub]) => (
            <Pressable key={k} onPress={() => choose(k)} style={[rtl.row, { gap: 12, paddingVertical: 15, paddingHorizontal: 18, borderRadius: 99, borderWidth: 1.5, borderColor: pick === k ? C.accent : 'rgba(255,255,255,0.12)', backgroundColor: pick === k ? 'rgba(255,201,60,0.14)' : 'rgba(37,42,47,0.85)' }]}>
              <Icon name={pick === k ? 'radio-on' : 'radio-off'} size={24} />
              <T style={{ fontWeight: '700', flex: 1 }}>{name}</T>
              <Muted>{sub}</Muted>
            </Pressable>
          ))}
          <Btn label="تم" onPress={done} style={{ marginTop: 6, minHeight: 54 }} />
        </View>
      </ScrollView>
    </View>
  );
}

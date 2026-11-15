import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AuthArt } from '@/components/auth-art';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { getPrefs, Lang, setPrefs } from '@/lib/prefs';
import { C } from '@/lib/theme';

const LANGS: [Lang, string, string][] = [['ar', 'العربية', 'Arabic'], ['en', 'English', 'الإنجليزية'], ['ckb', 'کوردی', 'Kurdish']];

// أول دخول: اختيار اللغة ثم شاشة تسجيل الدخول.
export default function Onboarding() {
  const [pick, setPick] = useState<Lang>(getPrefs().lang);
  const done = () => {
    setPrefs({ lang: pick, onboarded: true });
    router.replace('/');
    setTimeout(() => router.push('/login'), 250);
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 30 }}>
      <AuthArt height={300} />
      <View style={{ marginTop: -56, paddingHorizontal: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Card style={{ padding: 20, gap: 10 }}>
          <T style={{ fontSize: 24, fontWeight: '800' }}>اختر لغتك</T>
          <Muted>تكدر تغيّرها بعدين من الإعدادات.</Muted>
          {LANGS.map(([k, name, sub]) => (
            <Pressable key={k} onPress={() => setPick(k)} style={[rtl.row, { gap: 12, padding: 14, borderRadius: 99, borderWidth: 1.5, borderColor: pick === k ? C.accent : C.line, backgroundColor: pick === k ? 'rgba(255,201,60,0.10)' : C.bg }]}>
              <Ionicons name={pick === k ? 'radio-button-on' : 'radio-button-off'} size={22} color={pick === k ? C.accent : C.muted} />
              <T style={{ fontWeight: '700', flex: 1 }}>{name}</T>
              <Muted>{sub}</Muted>
            </Pressable>
          ))}
          <Btn label="تم" onPress={done} style={{ marginTop: 6 }} />
        </Card>
      </View>
    </ScrollView>
  );
}

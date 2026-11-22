import { router, Stack, usePathname } from 'expo-router';
import { wasAsked } from '@/lib/permissions';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold, useFonts } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { I18nManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DebugConsole } from '@/components/debug-console';
import { ErrorBoundary } from '@/components/error-boundary';
import { SizePreview } from '@/components/size-preview';
import { Splash } from '@/components/splash';
import { UpdateGate } from '@/components/update-gate';
import { AuthProvider, useAuth } from '@/lib/auth';
import { evt, installDebug, notify, touchStat } from '@/lib/debuglog';
import { usePrefs } from '@/lib/prefs';
import { C } from '@/lib/theme';

// نثبّت اتجاه التخطيط ونرسم RTL يدوياً حتى يكون السلوك واحداً على كل الأجهزة.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// أي خطأ JS غير ممسوك يُسجَّل (ويظهر بلوحة التشخيص) بدل ما يطيّح التطبيق.
installDebug();

function Shell() {
  const { ready } = useAuth();
  const [fonts, fontErr] = useFonts({ IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold });
  const [splash, setSplash] = useState(true);
  const path = usePathname();
  const prefs = usePrefs();
  // أول تشغيل: اختيار اللغة ثم تسجيل الدخول
  useEffect(() => {
    if (!splash && prefs.loaded && !prefs.onboarded && path !== '/onboarding') router.push('/onboarding');
  }, [splash, prefs.loaded, prefs.onboarded, path]);
  // بعد الـ onboarding: شاشة الأذونات مرة وحدة
  useEffect(() => {
    if (splash || !prefs.loaded || !prefs.onboarded || path === '/onboarding' || path === '/permissions' || path === '/login') return;
    wasAsked().then((a) => { if (!a) router.push('/permissions'); });
  }, [splash, prefs.loaded, prefs.onboarded, path]);
  useEffect(() => { evt('route →', path); }, [path]);
  useEffect(() => { evt('auth ready =', ready); }, [ready]);
  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={(e) => {
        touchStat.n += 1; touchStat.x = Math.round(e.nativeEvent.pageX); touchStat.y = Math.round(e.nativeEvent.pageY);
        notify();
      }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sos" options={{ presentation: 'modal' }} />
        <Stack.Screen name="crane/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="guide" options={{ presentation: 'modal' }} />
        <Stack.Screen name="request" options={{ presentation: 'modal' }} />
        <Stack.Screen name="assist" options={{ presentation: 'modal' }} />
        <Stack.Screen name="route" options={{ presentation: 'modal' }} />
        <Stack.Screen name="job" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="permissions" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
      <UpdateGate />
      <SizePreview />
      {splash && <Splash ready={ready && (fonts || !!fontErr)} onDone={() => { evt('splash done'); setSplash(false); }} />}
      <DebugConsole />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

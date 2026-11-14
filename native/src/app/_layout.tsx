import { Stack, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DebugConsole } from '@/components/debug-console';
import { ErrorBoundary } from '@/components/error-boundary';
import { Splash } from '@/components/splash';
import { UpdateGate } from '@/components/update-gate';
import { AuthProvider, useAuth } from '@/lib/auth';
import { evt, installDebug, notify, touchStat } from '@/lib/debuglog';
import { C } from '@/lib/theme';

// نثبّت اتجاه التخطيط ونرسم RTL يدوياً حتى يكون السلوك واحداً على كل الأجهزة.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// أي خطأ JS غير ممسوك يُسجَّل (ويظهر بلوحة التشخيص) بدل ما يطيّح التطبيق.
installDebug();

function Shell() {
  const { ready } = useAuth();
  const [splash, setSplash] = useState(true);
  const path = usePathname();
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
      </Stack>
      <UpdateGate />
      {splash && <Splash ready={ready} onDone={() => { evt('splash done'); setSplash(false); }} />}
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

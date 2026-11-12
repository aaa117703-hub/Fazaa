import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { Splash } from '@/components/splash';
import { UpdateGate } from '@/components/update-gate';
import { AuthProvider, useAuth } from '@/lib/auth';
import { C } from '@/lib/theme';

// نثبّت اتجاه التخطيط ونرسم RTL يدوياً حتى يكون السلوك واحداً على كل الأجهزة.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// أي خطأ JS غير ممسوك يُسجَّل بدل ما يطيّح التطبيق.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EU = (globalThis as any).ErrorUtils;
if (EU?.setGlobalHandler) EU.setGlobalHandler((e: unknown) => { console.warn('unhandled', e); });

function Shell() {
  const { ready } = useAuth();
  const [splash, setSplash] = useState(true);
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sos" options={{ presentation: 'modal' }} />
        <Stack.Screen name="crane/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="guide" options={{ presentation: 'modal' }} />
        <Stack.Screen name="request" options={{ presentation: 'modal' }} />
        <Stack.Screen name="assist" options={{ presentation: 'modal' }} />
      </Stack>
      <UpdateGate />
      {splash && <Splash ready={ready} onDone={() => setSplash(false)} />}
    </>
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

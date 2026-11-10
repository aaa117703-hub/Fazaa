import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Muted, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!session) { setName(''); return; }
    supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle().then(({ data }) => setName(data?.full_name ?? ''));
  }, [session]);

  function confirmDelete() {
    Alert.alert('حذف حسابك نهائياً؟', 'راح نحذف حسابك وبياناتك وطلباتك من الخادم. ما يمكن التراجع.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم، احذف', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('delete_my_account');
          if (error) { Alert.alert('تعذّر الحذف', 'جرّب مرة ثانية.'); return; }
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 12 }}>
      <T style={{ fontSize: 26, fontWeight: '800' }}>حسابي</T>
      <Btn label="شاهد جولة سند جايك" kind="secondary" onPress={() => router.push('/story')} />
      {session ? (
        <>
          <Card style={{ gap: 4 }}>
            <T style={{ fontSize: 18, fontWeight: '800' }}>{name || 'مستخدم سند جايك'}</T>
            <Muted>{session.user.email}</Muted>
          </Card>
          <Btn label="تسجيل خروج" kind="secondary" onPress={() => supabase.auth.signOut()} />
          <View style={{ height: 8 }} />
          <Btn label="حذف حسابي وكل بياناتي" kind="danger" onPress={confirmDelete} />
        </>
      ) : (
        <Card style={{ gap: 10 }}>
          <T style={{ fontWeight: '800' }}>أنت تتصفح كزائر</T>
          <Muted>سجّل دخول حتى ترسل طلب أو تشوف أرقام الكرينات أو تسجّل كسائق.</Muted>
          <Btn label="دخول / حساب جديد" onPress={() => router.push('/login')} />
        </Card>
      )}
    </ScrollView>
  );
}

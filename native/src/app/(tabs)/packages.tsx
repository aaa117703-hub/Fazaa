import { Icon, type IconName } from '@/components/icon';
import React, { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/fx';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supportWa } from '@/lib/contact';
import { effTier, TIERS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

const PRIO = ['عادية', 'قبل الأساسي', 'عالية', 'الأعلى'];
const PIN = ['عادي', 'عادي', 'كبير', 'الأكبر'];

export default function Membership() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [mine, setMine] = useState<{ id: string; tier: string | null; sub_expires_at: string | null } | null>(null);
  useFocusEffect(useCallback(() => {
    if (!session) { setMine(null); return; }
    supabase.from('cranes').select('id,tier,sub_expires_at').eq('owner_id', session.user.id).limit(1).maybeSingle().then(({ data }) => setMine((data as typeof mine) ?? null), () => {});
  }, [session]));
  const cur = mine ? effTier(mine) : null;
  const ios = Platform.OS === 'ios';
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 12, paddingBottom: 130, gap: 12 }}>
      <T style={{ fontSize: 26, fontWeight: '800' }}>العضوية</T>
      <Muted>للسائقين فقط. الزبون يستخدم سند جايك مجاناً دائماً.</Muted>
      <Card style={{ backgroundColor: 'rgba(61,214,140,0.10)', borderColor: 'rgba(61,214,140,0.35)' }}>
        <T style={{ color: C.ok, fontSize: 14 }}>كل ترقية تعطيك طلبات أكثر وظهور أكبر. وشارة «موثّق» مجانية لكل سائق يرفع وثائقه.</T>
      </Card>
      {TIERS.map((p, i) => {
        const current = cur === p.id;
        return (
          <FadeIn key={p.id} delay={i * 90}>
            <Card style={{ borderColor: current ? p.color : p.color + '59', borderWidth: current ? 2 : 1, gap: 8 }}>
              <View style={[rtl.row, { gap: 12 }]}>
                <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: p.color, backgroundColor: p.color + '24', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="diamond" size={22} mono={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={[rtl.row, { gap: 8 }]}>
                    <T style={{ fontSize: 20, fontWeight: '800', color: p.color }}>{p.name}</T>
                    {current && <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: C.accent }}><T style={{ color: C.onAccent, fontSize: 11, fontWeight: '800' }}>عضويتك</T></View>}
                  </View>
                  <Muted style={{ fontSize: 12.5 }}>{p.tag}</Muted>
                </View>
                {/* آبل: ما نعرض أسعار داخل تطبيق iOS */}
                <T style={{ fontSize: 18, fontWeight: '800', color: C.accent }}>{ios ? (p.price ? '' : 'مجاناً') : p.price ? p.price.toLocaleString('en-US') + ' د.ع/شهر' : 'مجاناً'}</T>
              </View>
              {p.features.map((f) => (
                <View key={f} style={[rtl.row, { gap: 8 }]}>
                  <Icon name="check-circle" size={19} mono={C.ok} />
                  <T style={{ flex: 1 }}>{f}</T>
                </View>
              ))}
              {mine ? (
                <Btn label={current ? 'عضويتك الحالية' : p.price ? 'اطلب عبر واتساب' : 'المجانية'} kind={current || !p.price ? 'secondary' : 'primary'} disabled={current || !p.price}
                  onPress={() => { supabase.from('subscription_requests').insert({ crane_id: mine.id, tier: p.id, period: 'monthly' }).then(() => {}, () => {}); supportWa('مرحباً، أريد الاشتراك بعضوية «' + p.name + '» بتطبيق سند جايك' + (mine.id ? ' (رقم الكرين: ' + mine.id + ')' : '')); }} />
              ) : (
                <Btn label="سجّل كسائق أول" kind="ghost" onPress={() => router.navigate('/driver' as never)} />
              )}
            </Card>
          </FadeIn>
        );
      })}
      <T style={{ fontSize: 18, fontWeight: '800', marginTop: 6 }}>مقارنة سريعة</T>
      <Card style={{ gap: 2, padding: 10 }}>
        <View style={[rtl.row, { paddingVertical: 6 }]}>
          <View style={{ flex: 1.5 }} />
          {TIERS.map((t) => <T key={t.id} style={{ flex: 1, textAlign: 'center', color: t.color, fontWeight: '800', fontSize: 12 }}>{t.name}</T>)}
        </View>
        {([
          ['نطاق الطلبات', TIERS.map((t) => t.radius + ' كم')],
          ['أولوية الطلب', PRIO],
          ['حجم الدبوس', PIN],
          ['الموصى بهم', ['—', '—', '✓', '✓']],
          ['إحصائيات أسبوعية', ['—', '✓', '✓', '✓']],
          ['عدد الكرينات', TIERS.map((t) => String(t.fleet))],
        ] as [string, string[]][]).map(([l, v]) => (
          <View key={l} style={[rtl.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }]}>
            <Muted style={{ flex: 1.5, fontSize: 12 }}>{l}</Muted>
            {v.map((x, i) => <T key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>{x}</T>)}
          </View>
        ))}
      </Card>
      <Muted>{ios ? 'للاشتراك تواصل معنا عبر واتساب، وتُفعَّل عضويتك من الإدارة.' : 'لا يوجد دفع إلكتروني. تواصل معنا عبر واتساب، وبعد الاتفاق تُفعّل الإدارة عضويتك.'}</Muted>
    </ScrollView>
  );
}

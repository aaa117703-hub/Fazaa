import Constants from 'expo-constants';
import { BackBar } from '@/components/back-bar';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OwnerIntro } from '@/components/owner-intro';
import { useAccount } from '@/lib/owner';
import { PermissionRows } from '@/components/permission-rows';
import { showSizePreview } from '@/components/size-preview';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { toggleDebug } from '@/lib/debuglog';
import { BTN_STEPS, FONT_STEPS, Lang, setPrefs, usePrefs } from '@/lib/prefs';
import { C } from '@/lib/theme';

function Stepper({ label, steps, value, onChange }: { label: string; steps: [number, string][]; value: number; onChange: (n: number) => void }) {
  const mk = (txt: string, d: number) => {
    const n = value + d, off = n < 0 || n >= steps.length;
    return (
      <Pressable disabled={off} onPress={() => { onChange(n); showSizePreview(); }} accessibilityLabel={d > 0 ? 'تكبير' : 'تصغير'}
        style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.35 : 1 }}>
        <T style={{ fontSize: 24, fontWeight: '800' }}>{txt}</T>
      </Pressable>
    );
  };
  return (
    <View style={[rtl.row, { gap: 10 }]}>
      <T style={{ flex: 1, fontWeight: '700' }}>{label}</T>
      {mk('−', -1)}
      <T style={{ minWidth: 70, textAlign: 'center', fontWeight: '800', color: C.accent }}>{steps[value][1]}</T>
      {mk('+', 1)}
    </View>
  );
}

const LANGS: [Lang, string][] = [['ar', 'العربية'], ['en', 'English'], ['ckb', 'کوردی']];

export default function Settings() {
  const taps = React.useRef({ n: 0, t: 0 });
  const insets = useSafeAreaInsets();
  const p = usePrefs();
  const admin = useIsAdmin();
  const acct = useAccount();
  const [intro, setIntro] = React.useState(false);
  const pick = async (t: 'customer' | 'owner') => { if (!(await acct.setType(t))) Alert.alert('خطأ', 'تعذّر تغيير نوع الحساب.'); };
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: insets.bottom + 40, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <BackBar /><T style={{ fontSize: 26, fontWeight: '800' }}>الإعدادات</T>
      <Muted>كل الإعدادات تنحفظ على جهازك فقط.</Muted>

      <Card style={{ gap: 14 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>حجم الخط والأزرار</T>
        <Muted>غيّر الحجم وراح يظهر لك نموذج بالضبط حتى تشوف النتيجة.</Muted>
        <Stepper label="حجم الخط" steps={FONT_STEPS} value={p.fontStep} onChange={(n) => setPrefs({ fontStep: n })} />
        <Stepper label="حجم الأزرار" steps={BTN_STEPS} value={p.btnStep} onChange={(n) => setPrefs({ btnStep: n })} />
        <Btn small kind="secondary" label="إعادة للحجم العادي" onPress={() => { setPrefs({ fontStep: 1, btnStep: 1 }); showSizePreview(); }} />
      </Card>

      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>نوع الحساب</T>
        <View style={[rtl.row, { gap: 8 }]}>
          {([['customer', 'زبون'], ['owner', 'صاحب كرين']] as const).map(([k, l]) => {
            const on = acct.type === k;
            return (
              <Pressable key={k} disabled={acct.hasCrane} onPress={() => (k === 'owner' ? setIntro(true) : pick('customer'))} style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 99, borderWidth: 2, borderColor: on ? C.ok : C.line, backgroundColor: on ? 'rgba(52,199,89,0.14)' : C.surface2, opacity: acct.hasCrane && !on ? 0.4 : 1 }}>
                {on && <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center' }}><T style={{ color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 18 }}>✓</T></View>}
                <T style={{ fontWeight: '800', color: on ? C.ok : C.text }}>{l}</T>
              </Pressable>
            );
          })}
        </View>
        <Muted style={{ fontSize: 12.5 }}>{acct.hasCrane ? 'عندك كرين مسجّل، فحسابك صاحب كرين ولا يتغيّر.' : 'الزبون يشوف قائمة الكرينات. صاحب الكرين يشوف الطلبات المتاحة ويستلمها.'}</Muted>
      </Card>
      <OwnerIntro visible={intro} onAccept={() => { setIntro(false); pick('owner'); }} />

      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>الأذونات</T>
        <PermissionRows />
      </Card>

      <Card style={{ gap: 10 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>اللغة</T>
        <View style={[rtl.row, { gap: 8 }]}>
          {LANGS.map(([k, n]) => (
            <Pressable key={k} onPress={() => setPrefs({ lang: k })} style={{ flex: 1, paddingVertical: 11, borderRadius: 99, alignItems: 'center', borderWidth: 1.5, borderColor: p.lang === k ? C.accent : C.line, backgroundColor: p.lang === k ? 'rgba(255,201,60,0.10)' : C.surface2 }}>
              <T style={{ fontWeight: '700', color: p.lang === k ? C.accent : C.text }}>{n}</T>
            </Pressable>
          ))}
        </View>
        <Muted style={{ fontSize: 12 }}>الترجمة الإنجليزية والكردية (سۆرانی) تجريبية وتشمل أغلب النصوص. الكردية تحتاج مراجعة متحدث قبل الإطلاق.</Muted>
      </Card>

      <Card style={{ gap: 6 }}>
        <T style={{ fontWeight: '800', fontSize: 17 }}>المظهر</T>
        <View style={[rtl.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>تقليل الحركة</T><Muted>يوقّف الحركات والانتقالات المتحركة.</Muted></View>
          <Switch value={p.reduceMotion} onValueChange={(v) => setPrefs({ reduceMotion: v })} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <Pressable onPress={() => { const k = taps.current, now = Date.now(); k.n = now - k.t < 1500 ? k.n + 1 : 1; k.t = now; if (k.n >= 5) { k.n = 0; toggleDebug(); } }}><T style={{ fontWeight: '800', fontSize: 17 }}>حول سند جايك</T></Pressable>
        <View style={[rtl.row, { justifyContent: 'space-between' }]}><T>الإصدار</T><Muted>{Constants.expoConfig?.version ?? '1.0.0'}</Muted></View>
        <View style={[rtl.row, { justifyContent: 'space-between' }]}><T>التغطية الحالية</T><Muted>كل محافظات العراق</Muted></View>
        {admin && <Btn label="لوحة الإدارة" onPress={() => router.push('/admin')} />}
        <Btn kind="secondary" label="دليل «سيارتي تعطلت»" onPress={() => router.push('/guide')} />
        <Btn kind="secondary" label="سياسة الخصوصية" onPress={() => router.push('/legal?k=privacy')} />
        <Btn kind="secondary" label="شروط الاستخدام" onPress={() => router.push('/legal?k=terms')} />
        <Btn kind="secondary" label="تواصل مع الدعم" onPress={() => router.push('/legal?k=support')} />
      </Card>
    </ScrollView>
  );
}

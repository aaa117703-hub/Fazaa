import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';

import { Btn, Muted, T } from '@/components/ui';
import { C, R } from '@/lib/theme';

const POINTS: [string, string][] = [
  ['الطلبات المتاحة', 'رئيسيتك تعرض كل طلب مفتوح بمنطقتك (من 40 إلى 80 كم حسب باقتك) مع المسافة والوجهة. تفتح اللي يناسبك وتقدّم عرضك.'],
  ['المزايدة على السعر', 'تتفاوض مع الزبون داخل التطبيق: لحد 6 عروض، دقيقة لكل عرض، وأول عرض ينقبل يكسب الطلب.'],
  ['الوثائق والتوثيق', 'تسجّل كرينك وترفع 6 وثائق. نفحصها تلقائياً وتراجعها الإدارة، وبعدها يظهر كرينك للزبائن.'],
  ['التوجيه والإنجاز والأرباح', 'بعد القبول تنفتح خريطة للزبون. تضغط «وصلت» ثم «تم الإنجاز»، وتشوف أرباح اليوم وتقييم زبائنك.'],
];
const MORE: [string, string][] = [
  ['ليش تختار «صاحب كرين»؟', 'إذا عندك كرين أو سطحة أو ونش أو خدمة طرق وتريد تستلم شغل من زبائن قريبين منك، هذا الحساب إلك. أنت تجيك الطلبات بدل ما تدوّر عليها.'],
  ['شنو يختلف عن حساب الزبون؟', 'الزبون يشوف قائمة الكرينات ويطلب مساعدة. صاحب الكرين ما يشوف قائمة كرينات، يشوف الطلبات المتاحة والشغل الجاري وما أنجزه اليوم بأسعاره.'],
  ['شنو لازم تسوي؟', 'بعد ما تنشئ الحساب، افتح تبويب «سائق» وسجّل كرينك وارفع الوثائق. تكدر تسجّل بوقتك، وما يظهر كرينك للزبائن إلا بعد التوثيق.'],
  ['ملاحظة مهمة', 'بعد ما تسجّل كرين يبقى حسابك «صاحب كرين» وما ينتقل لزبون. إذا تحتاج كرين لسيارتك، استخدم حساب ثاني.'],
];

/** نافذة تعليمات صاحب الكرين: بدون زر إغلاق، فقط «فهمت» و«وضّح أكثر». */
export function OwnerIntro({ visible, onAccept }: { visible: boolean; onAccept: () => void }) {
  const [more, setMore] = useState(false);
  const rows = more ? MORE : POINTS;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 18 }}>
        <View style={{ backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, maxHeight: '88%', padding: 18, gap: 12 }}>
          <T style={{ fontSize: 22, fontWeight: '800', color: C.accent }}>{more ? 'وضّح أكثر' : 'حساب صاحب الكرين'}</T>
          {!more && <Muted>هذا شنو راح يصير وياك:</Muted>}
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12 }}>
            {rows.map(([h, b], i) => (
              <View key={h} style={{ gap: 3, backgroundColor: C.surface2, borderRadius: R.md, padding: 12 }}>
                <T style={{ fontWeight: '800' }}>{more ? h : (i + 1) + '. ' + h}</T>
                <Muted style={{ lineHeight: 22 }}>{b}</Muted>
              </View>
            ))}
          </ScrollView>
          <Btn label="فهمت" onPress={() => { setMore(false); onAccept(); }} />
          <Btn label={more ? 'رجوع للملخص' : 'وضّح أكثر'} kind="secondary" onPress={() => setMore((v) => !v)} />
        </View>
      </View>
    </Modal>
  );
}

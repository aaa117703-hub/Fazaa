import React from 'react';
import { Linking, View } from 'react-native';

import { Btn, Muted, T, rtl } from '@/components/ui';
import { askLocation, askNotifications, usePerms, type PermState } from '@/lib/permissions';
import { C, R } from '@/lib/theme';

const LABEL: Record<PermState, [string, string]> = { granted: ['مفعّل', C.ok], denied: ['مرفوض', C.danger], undetermined: ['غير مفعّل', C.warn] };

function Row({ title, why, state, onAsk }: { title: string; why: string; state: PermState; onAsk: () => Promise<void> }) {
  const [txt, col] = LABEL[state];
  return (
    <View style={{ gap: 8, backgroundColor: C.surface2, borderRadius: R.md, padding: 14 }}>
      <View style={[rtl.row, { gap: 8 }]}>
        <T style={{ fontWeight: '800', flex: 1 }}>{title}</T>
        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill, backgroundColor: col + '29' }}><T style={{ color: col, fontWeight: '800', fontSize: 12.5 }}>{txt}</T></View>
      </View>
      <Muted style={{ fontSize: 13 }}>{why}</Muted>
      {state === 'undetermined' && <Btn small label="فعّل" onPress={onAsk} />}
      {state === 'denied' && <Btn small kind="secondary" label="افتح إعدادات الجهاز" onPress={() => { Linking.openSettings().catch(() => {}); }} />}
    </View>
  );
}

/** صفّا الموقع والإشعارات (يُستخدمان بشاشة الشرح وبالإعدادات). */
export function PermissionRows() {
  const [p, refresh] = usePerms();
  if (!p) return null;
  return (
    <View style={{ gap: 10 }}>
      <Row title="الموقع" why="حتى نعرض لك أقرب الكرينات ونرسل موقعك بالطلب، وللسائق حتى تصله الطلبات القريبة." state={p.location} onAsk={async () => { await askLocation(); refresh(); }} />
      <Row title="الإشعارات" why="حالياً تعرض رقم الطلبات على أيقونة التطبيق. الإشعارات الكاملة وهو مسكّر قريباً." state={p.notifications} onAsk={async () => { await askNotifications(); refresh(); }} />
    </View>
  );
}

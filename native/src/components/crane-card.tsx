import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Btn, Muted, T, rtl } from '@/components/ui';
import { ago, avatarUrl, Crane, fmtDist, STALE_MS, tierOf } from '@/lib/data';
import { C, R } from '@/lib/theme';

export function Avatar({ c, size = 52 }: { c: { name: string; avatar?: string | null; verified?: boolean }; size?: number }) {
  const ring = c.verified ? C.ok : 'transparent';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: c.verified ? 3 : 0, borderColor: ring, overflow: 'hidden', backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
      {c.avatar ? <Image source={{ uri: avatarUrl(c.avatar) }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <T style={{ fontSize: size * 0.42, fontWeight: '800', color: C.accent }}>{(c.name || '؟').trim().charAt(0)}</T>}
    </View>
  );
}

export function statusOf(c: Crane) {
  if (c.status === 'available') {
    const stale = !c.is_demo && Date.now() - Date.parse(c.updated_at) > STALE_MS;
    return stale ? { color: C.warn, txt: 'متاح؟ آخر تحديث ' + ago(c.updated_at) + ' — اتصل وتأكد' } : { color: C.ok, txt: 'متاح · آخر تحديث ' + ago(c.updated_at) };
  }
  return { color: C.danger, txt: 'مشغول · آخر تحديث ' + ago(c.updated_at) };
}

export function Badge({ txt, color }: { txt: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.pill, backgroundColor: color + '29' }}>
      <T style={{ fontSize: 11, fontWeight: '800', color }}>{txt}</T>
    </View>
  );
}

export function CraneCard({ c, d, onCall, onWa, onRoute, onOpen }: { c: Crane; d: number | null; onCall: () => void; onWa: () => void; onRoute: () => void; onOpen: () => void }) {
  const st = statusOf(c);
  const t = tierOf(c.tier);
  return (
    <Pressable onPress={onOpen} style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10, opacity: c.status === 'available' ? 1 : 0.82 }}>
      <View style={[rtl.row, { gap: 12, alignItems: 'flex-start' }]}>
        <Avatar c={c} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={[rtl.row, { gap: 6, flexWrap: 'wrap' }]}>
            <T style={{ fontSize: 17, fontWeight: '800' }}>{c.name}</T>
            {c.is_demo && <Badge txt="تجريبي" color={C.muted} />}
            {c.verified && <Badge txt="موثق" color={C.ok} />}
            {t.id !== 'bronze' && <Badge txt={t.name} color={t.color} />}
          </View>
          <View style={[rtl.row, { gap: 6, flexWrap: 'wrap' }]}>
            <T style={{ color: C.accent, fontWeight: '800', fontSize: 13 }}>{c.type}</T>
            {!!c.governorate && <Muted>· {c.governorate}</Muted>}
            {d != null && <Muted>· {fmtDist(d)}</Muted>}
            <Muted>· {c.rating_count ? '★ ' + Number(c.rating_avg).toFixed(1) + ' (' + c.rating_count + ')' : 'بدون تقييم'}</Muted>
          </View>
          <View style={[rtl.row, { gap: 6 }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />
            <Muted style={{ flex: 1 }}>{st.txt}</Muted>
          </View>
        </View>
      </View>
      <View style={[rtl.row, { gap: 8 }]}>
        <Btn label="اتصال" kind={c.status === 'available' ? 'primary' : 'secondary'} onPress={onCall} style={{ flex: 2 }} small />
        {!c.is_demo && <Btn label="واتساب" kind="secondary" onPress={onWa} style={{ flex: 1.4 }} small />}
        <Btn label="طريق" kind="secondary" onPress={onRoute} style={{ flex: 1.2 }} small />
      </View>
    </Pressable>
  );
}

import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Tab = 'cranes' | 'docs' | 'shops' | 'reports';
const TABS: [Tab, string][] = [['cranes', 'السواق'], ['docs', 'الوثائق'], ['shops', 'المحلات'], ['reports', 'البلاغات']];
const DK: Record<string, string> = { id_front: 'الهوية — أمام', id_back: 'الهوية — خلف', vehicle_front: 'سنوية — أمام', vehicle_back: 'سنوية — خلف', license_front: 'الإجازة — أمام', license_back: 'الإجازة — خلف' };
const ST: Record<string, [string, string]> = { pending: ['بانتظار', C.warn], approved: ['مقبول', C.ok], rejected: ['مرفوض', C.danger] };

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function Chip({ txt, color }: { txt: string; color: string }) {
  return <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: color + '22' }}><T style={{ color, fontSize: 12, fontWeight: '700' }}>{txt}</T></View>;
}

export default function Admin() {
  const insets = useSafeAreaInsets();
  const admin = useIsAdmin();
  const [tab, setTab] = useState<Tab>('cranes');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [img, setImg] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    let r: { data: Row[] | null; error: unknown };
    if (tab === 'cranes') r = await supabase.from('cranes').select('id,name,type,governorate,verified,listed,tier,status').order('created_at', { ascending: false }).limit(200);
    else if (tab === 'docs') r = await supabase.from('driver_documents').select('id,kind,path,status,note,crane_id,cranes(name,verified,governorate)').order('created_at', { ascending: true }).limit(300);
    else if (tab === 'shops') r = await supabase.from('shops').select('id,name,kind,phone,status,governorate').order('created_at', { ascending: false }).limit(200);
    else r = await supabase.from('reports').select('id,reason,details,status,cranes(name)').order('created_at', { ascending: false }).limit(100);
    setRows(r.error ? [] : (r.data ?? []));
    if (r.error) Alert.alert('تعذّر التحميل', 'تأكد من الإنترنت وصلاحيات المدير.');
    setBusy(false);
  }, [tab]);
  useEffect(() => { if (admin) load(); }, [admin, load]);

  const patch = async (table: string, id: string, body: Row) => {
    const { error } = await supabase.from(table).update(body).eq('id', id);
    if (error) Alert.alert('تعذّر الحفظ', error.message); else load();
  };
  const del = (table: string, id: string, what: string) =>
    Alert.alert('حذف ' + what, 'متأكد؟ ما يمكن التراجع.', [{ text: 'إلغاء', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: async () => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) Alert.alert('تعذّر الحذف', error.message); else load(); } }]);
  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from('driver-docs').createSignedUrl(path, 300);
    if (error || !data) Alert.alert('تعذّر فتح الصورة'); else setImg(data.signedUrl);
  };

  if (!admin) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: insets.top + 14, gap: 12 }}>
        <BackBar /><T style={{ fontSize: 22, fontWeight: '800' }}>لوحة الإدارة</T><Muted>هذي الصفحة للمدير فقط.</Muted>
      </View>
    );
  }

  const docGroups = tab === 'docs' ? Object.values(rows.reduce<Record<string, { id: string; c: Row | null; d: Row[] }>>((m, r) => { (m[r.crane_id] = m[r.crane_id] || { id: r.crane_id, c: r.cranes, d: [] }).d.push(r); return m; }, {})) : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <BackBar />
        <T style={{ fontSize: 26, fontWeight: '800' }}>لوحة الإدارة</T>
        <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
          {TABS.map(([k, n]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99, backgroundColor: tab === k ? C.accent : C.surface2 }}>
              <T style={{ fontWeight: '700', color: tab === k ? C.onAccent : C.text }}>{n}</T>
            </Pressable>
          ))}
        </View>
        {busy && <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />}
        {!busy && rows.length === 0 && <Muted>ما كو بيانات.</Muted>}

        {!busy && tab === 'cranes' && rows.map((c) => (
          <Card key={c.id} style={{ gap: 8 }}>
            <View style={[rtl.row, { gap: 8, justifyContent: 'space-between' }]}>
              <T style={{ fontWeight: '800', flex: 1 }}>{c.name}</T>
              {c.verified && <Chip txt="موثق" color={C.ok} />}
            </View>
            <Muted>{c.type} · {c.governorate || '—'} · {c.tier}</Muted>
            <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
              <Btn small kind={c.listed ? 'primary' : 'secondary'} label={c.listed ? 'ظاهر' : 'وافق وأظهر'} onPress={() => patch('cranes', c.id, { listed: !c.listed })} />
              <Btn small kind={c.verified ? 'secondary' : 'primary'} label={c.verified ? 'إلغاء التوثيق' : 'وثّق'} onPress={() => patch('cranes', c.id, { verified: !c.verified })} />
              <Btn small kind="danger" label="حذف" onPress={() => del('cranes', c.id, 'الكرين')} />
            </View>
          </Card>
        ))}

        {!busy && tab === 'docs' && docGroups.map((g) => (
          <Card key={g.id} style={{ gap: 8 }}>
            <View style={[rtl.row, { justifyContent: 'space-between' }]}><T style={{ fontWeight: '800' }}>{g.c?.name ?? '—'}</T><Muted>{g.c?.governorate ?? ''}</Muted></View>
            {g.d.map((r) => {
              const [lbl, col] = ST[r.status] ?? [r.status, C.muted];
              return (
                <View key={r.id} style={{ gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line }}>
                  <View style={[rtl.row, { gap: 8, justifyContent: 'space-between' }]}><T style={{ fontWeight: '700' }}>{DK[r.kind] ?? r.kind}</T><Chip txt={lbl} color={col} /></View>
                  {!!r.note && <Muted>{r.note}</Muted>}
                  <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
                    <Btn small kind="secondary" label="عرض" onPress={() => view(r.path)} />
                    {r.status !== 'approved' && <Btn small label="قبول" onPress={() => patch('driver_documents', r.id, { status: 'approved' })} />}
                    {r.status !== 'rejected' && <Btn small kind="danger" label="رفض" onPress={() => patch('driver_documents', r.id, { status: 'rejected', note: 'الصورة غير واضحة أو غير مطابقة' })} />}
                  </View>
                </View>
              );
            })}
            <Btn small kind={g.c?.verified ? 'secondary' : 'primary'} label={g.c?.verified ? 'موثق ✓ (إلغاء)' : 'وثّق الكرين'} onPress={() => patch('cranes', g.id, { verified: !g.c?.verified })} />
          </Card>
        ))}

        {!busy && tab === 'shops' && rows.map((s) => {
          const [lbl, col] = ST[s.status] ?? [s.status, C.muted];
          return (
            <Card key={s.id} style={{ gap: 8 }}>
              <View style={[rtl.row, { gap: 8, justifyContent: 'space-between' }]}><T style={{ fontWeight: '800', flex: 1 }}>{s.name}</T><Chip txt={lbl} color={col} /></View>
              <Muted>{s.kind} · {s.governorate || '—'}{s.phone ? ' · ' + s.phone : ''}</Muted>
              <View style={[rtl.row, { gap: 8 }]}>
                {s.status !== 'approved' && <Btn small label="قبول" onPress={() => patch('shops', s.id, { status: 'approved' })} />}
                <Btn small kind="danger" label="حذف" onPress={() => del('shops', s.id, 'المحل')} />
              </View>
            </Card>
          );
        })}

        {!busy && tab === 'reports' && rows.map((r) => (
          <Card key={r.id} style={{ gap: 8 }}>
            <View style={[rtl.row, { gap: 8, justifyContent: 'space-between' }]}><T style={{ fontWeight: '800', flex: 1 }}>{r.cranes?.name ?? '—'}</T><Chip txt={r.status === 'new' ? 'جديد' : r.status === 'reviewed' ? 'تمت المراجعة' : 'مرفوض'} color={r.status === 'new' ? C.warn : C.muted} /></View>
            <T>{r.reason}</T>
            {!!r.details && <Muted>{r.details}</Muted>}
            {r.status === 'new' && (
              <View style={[rtl.row, { gap: 8 }]}>
                <Btn small label="تمت المراجعة" onPress={() => patch('reports', r.id, { status: 'reviewed' })} />
                <Btn small kind="secondary" label="تجاهل" onPress={() => patch('reports', r.id, { status: 'dismissed' })} />
              </View>
            )}
          </Card>
        ))}
        <Btn kind="secondary" label="رجوع" onPress={() => router.back()} />
      </ScrollView>
      <Modal visible={!!img} transparent animationType="fade" onRequestClose={() => setImg('')}>
        <Pressable onPress={() => setImg('')} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 16 }}>
          <Image source={{ uri: img }} resizeMode="contain" style={{ width: '100%', height: '80%' }} />
          <Btn label="إغلاق" onPress={() => setImg('')} style={{ marginTop: 12 }} />
        </Pressable>
      </Modal>
    </View>
  );
}

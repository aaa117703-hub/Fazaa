import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { Btn, Card, Muted, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C, fontFor, R } from '@/lib/theme';

type Row = { id: string; name: string; doc_name: string; doc_plate: string; saved: boolean; err: string };
const inp = { fontFamily: fontFor('400'), backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right' as const, borderWidth: 1, borderColor: C.line };

// بياناتك الرسمية (الاسم الثلاثي مثل إجازة السوق + رقم لوحة السيارة) — تُستخدم فقط لمطابقة الوثائق
export default function OfficialData() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!uid) { setLoading(false); return; }
    (async () => {
      const { data: cr } = await supabase.from('cranes').select('id,name').eq('owner_id', uid).order('created_at', { ascending: true }).limit(10);
      const ids = (cr ?? []).map((x) => x.id as string);
      const { data: idn } = ids.length ? await supabase.from('crane_identity').select('crane_id,doc_name,doc_plate').in('crane_id', ids) : { data: [] };
      const m = new Map((idn ?? []).map((x) => [x.crane_id as string, x as { doc_name: string | null; doc_plate: string | null }]));
      setRows((cr ?? []).map((x) => ({ id: x.id as string, name: x.name as string, doc_name: m.get(x.id as string)?.doc_name ?? '', doc_plate: m.get(x.id as string)?.doc_plate ?? '', saved: false, err: '' })));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [uid]));

  const upd = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function save(r: Row) {
    const name = r.doc_name.trim().replace(/\s+/g, ' '), plate = r.doc_plate.trim();
    if (name.split(' ').length < 3 || name.length < 5) return upd(r.id, { err: 'اكتب الاسم الثلاثي كامل.' });
    if (plate.length < 3) return upd(r.id, { err: 'اكتب رقم اللوحة.' });
    setBusy(r.id);
    const { error } = await supabase.from('crane_identity').upsert({ crane_id: r.id, owner_id: uid, doc_name: name, doc_plate: plate }, { onConflict: 'crane_id' });
    setBusy(null);
    if (error) return upd(r.id, { err: 'تعذّر الحفظ. جرّب مرة ثانية.' });
    upd(r.id, { err: '', saved: true, doc_name: name, doc_plate: plate });
    Alert.alert('تم حفظ بياناتك', 'راح نستخدمها لمطابقة وثائقك.');
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center', padding: 16, paddingTop: insets.top + 12, paddingBottom: 60, gap: 12 }}>
      <BackBar /><T style={{ fontSize: 26, fontWeight: '800' }}>بياناتي الرسمية</T>
      <Muted>اكتب اسمك الثلاثي مثل إجازة السوق ورقم لوحة السيارة مثل السنوية. نستخدمها فقط لمطابقة وثائقك، وما تظهر لأحد.</Muted>
      {loading ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} /> : rows.length === 0 ? (
        <Card><Muted>سجّل كرينك أولاً حتى تكدر تضيف بياناتك الرسمية.</Muted></Card>
      ) : rows.map((r) => (
        <Card key={r.id} style={{ gap: 8 }}>
          {rows.length > 1 && <T style={{ fontWeight: '800', color: C.accent }}>{r.name}</T>}
          <Muted>الاسم الثلاثي (مثل إجازة السوق)</Muted>
          <TextInput value={r.doc_name} onChangeText={(v) => upd(r.id, { doc_name: v, saved: false })} placeholder="مثال: علي حسين محمد" placeholderTextColor={C.muted} maxLength={100} style={inp} />
          <Muted>رقم لوحة السيارة (مثل السنوية)</Muted>
          <TextInput value={r.doc_plate} onChangeText={(v) => upd(r.id, { doc_plate: v, saved: false })} placeholder="مثال: بغداد 12345 أ" placeholderTextColor={C.muted} maxLength={30} style={inp} />
          {!!r.err && <T style={{ color: C.danger }}>{r.err}</T>}
          <Btn label={busy === r.id ? 'جاري الحفظ…' : r.saved ? 'تم الحفظ ✓' : 'حفظ البيانات'} disabled={busy === r.id} onPress={() => save(r)} />
        </Card>
      ))}
    </ScrollView>
  );
}

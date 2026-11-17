import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { C, fontFor, R } from '@/lib/theme';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const DK: Record<string, string> = { id_front: 'الهوية — أمام', id_back: 'الهوية — خلف', vehicle_front: 'السنوية — أمام', vehicle_back: 'السنوية — خلف', license_front: 'الإجازة — أمام', license_back: 'الإجازة — خلف' };
const CS: Record<string, [string, string]> = { match: ['مطابق', C.ok], mismatch: ['غير مطابق', C.danger], unreadable: ['صور غير واضحة', C.warn], pending: ['لم يُفحص', C.muted], error: ['تعذّر الفحص', C.warn] };

function Cmp({ label, f }: { label: string; f?: { typed?: string | null; read?: string | null; ok?: boolean | null } }) {
  const col = f?.ok === true ? C.ok : f?.ok === false ? C.danger : C.muted;
  return (
    <View style={{ gap: 3, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }}>
      <View style={[rtl.row, { justifyContent: 'space-between' }]}>
        <T style={{ fontWeight: '700' }}>{label}</T>
        <T style={{ color: col, fontWeight: '800', fontSize: 13 }}>{f?.ok === true ? '✓ يطابق' : f?.ok === false ? '✗ يختلف' : '— غير محسوم'}</T>
      </View>
      <Muted style={{ fontSize: 13 }}>المكتوب: {f?.typed || '—'}</Muted>
      <Muted style={{ fontSize: 13 }}>بالوثيقة: {f?.read || '—'}</Muted>
    </View>
  );
}

// ملف السائق الكامل: بياناته، نتيجة مطابقة الوثائق، التكرار، الصور، وقرار التوثيق.
export function DriverFile({ craneId, onClose, onChanged }: { craneId: string; onClose: () => void; onChanged: () => void }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(true);
  const [c, setC] = useState<Row | null>(null);
  const [phone, setPhone] = useState('');
  const [prof, setProf] = useState<Row | null>(null);
  const [chk, setChk] = useState<Row | null>(null);
  const [docs, setDocs] = useState<Row[]>([]);
  const [dups, setDups] = useState<Row[]>([]);
  const [reason, setReason] = useState('');
  const [img, setImg] = useState('');
  const [work, setWork] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { data: cr } = await supabase.from('cranes').select('id,owner_id,name,type,governorate,crane_make,crane_model,verified,verified_until,suspended,suspend_reason,listed,tier,plate,owner_name').eq('id', craneId).maybeSingle();
    const crow = cr as Row | null;
    setC(crow);
    const [ct, ck, dc, dp, pr, idn] = await Promise.all([
      supabase.from('crane_contacts').select('phone').eq('crane_id', craneId).maybeSingle(),
      supabase.from('doc_checks').select('status,message,details,auto_applied,checked_at').eq('crane_id', craneId).maybeSingle(),
      supabase.from('driver_documents').select('id,kind,path,status,note').eq('crane_id', craneId).is('purged_at', null).order('kind'),
      supabase.rpc('admin_dups', { p_crane: craneId }),
      crow?.owner_id ? supabase.from('profiles').select('full_name,phone,car,governorate').eq('id', crow.owner_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('crane_identity').select('doc_name,doc_plate').eq('crane_id', craneId).maybeSingle(),
    ]);
    setPhone((ct.data as Row | null)?.phone ?? '');
    setChk((ck.data as Row | null) ?? null);
    setDocs((dc.data ?? []) as Row[]);
    setDups(Array.isArray(dp.data) ? (dp.data as Row[]) : []);
    setProf({ ...((pr.data as Row | null) ?? {}), ...((idn.data as Row | null) ?? {}) });
    setBusy(false);
  }, [craneId]);
  useEffect(() => { load(); }, [load]);

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from('driver-docs').createSignedUrl(path, 300);
    if (error || !data) Alert.alert('تعذّر فتح الصورة'); else setImg(data.signedUrl);
  };
  const scan = async () => {
    setWork(true);
    const { data, error } = await supabase.functions.invoke('verify-docs', { body: { action: 'scan', crane_id: craneId } });
    setWork(false);
    if (error) Alert.alert('تعذّر الفحص', 'تأكد أن الصور مرفوعة وأن مفتاح الذكاء الاصطناعي مضاف.'); else Alert.alert('نتيجة الفحص', (data as Row)?.message ?? 'تم.');
    load();
  };
  const decide = async (ok: boolean) => {
    setWork(true);
    const until = (chk?.details as Row | undefined)?.until ?? null;
    const { error } = await supabase.functions.invoke('verify-docs', { body: { action: 'finalize', crane_id: craneId, ok, reason: reason.trim() || undefined, until: ok ? until : undefined } });
    setWork(false);
    if (error) { Alert.alert('تعذّر الحفظ', 'جرّب مرة ثانية.'); return; }
    Alert.alert(ok ? 'تم التوثيق' : 'تم الرفض', ok ? 'السائق صار «موثّق» وانحذفت صور وثائقه.' : 'وصله السبب ويكدر يعيد الرفع.');
    onChanged(); load();
  };
  const confirmOk = () => {
    const warn = [dups.length ? 'فيه تكرار بحساب ثاني' : '', chk?.status !== 'match' ? 'نتيجة الفحص مو «مطابق»' : ''].filter(Boolean).join(' و');
    Alert.alert('توثيق السائق', (warn ? 'تنبيه: ' + warn + '.\n' : '') + 'بعد التوثيق تنحذف صور الوثائق نهائياً. تكمل؟', [{ text: 'إلغاء', style: 'cancel' }, { text: 'وثّق', onPress: () => decide(true) }]);
  };
  const suspend = async (on: boolean) => {
    const { error } = await supabase.from('cranes').update({ suspended: on, suspended_auto: false, suspend_reason: on ? (reason.trim() || 'إيقاف من الإدارة') : null }).eq('id', craneId);
    if (error) { Alert.alert('تعذّر', error.message); return; }
    supabase.rpc('admin_log_add', { p_action: on ? 'driver_suspend' : 'driver_unsuspend', p_target: craneId, p_detail: reason.trim() || null }).then(() => {});
    onChanged(); load();
  };

  const f = (chk?.details as Row | undefined)?.fields as Row | undefined;
  const st = CS[chk?.status ?? 'pending'] ?? CS.pending;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          <Btn small kind="secondary" label="إغلاق" onPress={onClose} style={{ alignSelf: 'flex-end' }} />
          {busy || !c ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} /> : (
            <>
              <T style={{ fontSize: 24, fontWeight: '800' }}>{c.name}</T>
              <View style={[rtl.row, { gap: 6, flexWrap: 'wrap' }]}>
                <T style={{ color: c.verified ? C.ok : C.warn, fontWeight: '800' }}>{c.verified ? 'موثّق' : 'غير موثّق'}</T>
                {!!c.suspended && <T style={{ color: C.danger, fontWeight: '800' }}>• موقوف{c.suspend_reason ? ': ' + c.suspend_reason : ''}</T>}
                {!!c.verified_until && <Muted>• التوثيق لحد {c.verified_until}</Muted>}
              </View>

              <Card style={{ gap: 4 }}>
                <T style={{ fontWeight: '800' }}>البيانات</T>
                <Muted>الاسم الثلاثي: {prof?.doc_name || '—'}</Muted>
                <Muted>رقم اللوحة: {prof?.doc_plate || '—'}</Muted>
                <Muted>السيارة: {[c.crane_make, c.crane_model].filter(Boolean).join(' ') || '—'} · {c.type}</Muted>
                <Muted>المحافظة: {c.governorate || '—'}</Muted>
                <Muted>الهاتف: {phone || prof?.phone || '—'}</Muted>
                {!!(phone || prof?.phone) && <Btn small kind="secondary" label="واتساب" onPress={() => Linking.openURL('https://wa.me/964' + String(phone || prof?.phone).replace(/^0/, '')).catch(() => {})} />}
              </Card>

              {dups.length > 0 && (
                <Card style={{ gap: 6, borderColor: C.danger }}>
                  <T style={{ fontWeight: '800', color: C.danger }}>تنبيه: تكرار محتمل</T>
                  {dups.map((d) => <Muted key={d.crane_id}>{d.name} — {(d.why as string[]).join('، ')}</Muted>)}
                </Card>
              )}

              <Card style={{ gap: 4 }}>
                <View style={[rtl.row, { justifyContent: 'space-between' }]}>
                  <T style={{ fontWeight: '800' }}>مطابقة الوثائق</T>
                  <T style={{ color: st[1], fontWeight: '800' }}>{st[0]}{chk?.auto_applied ? ' (تلقائي)' : ''}</T>
                </View>
                {!!chk?.message && <Muted>{chk.message}</Muted>}
                {f && <><Cmp label="الاسم" f={f.name} /><Cmp label="رقم اللوحة" f={f.plate} /><Cmp label="السيارة" f={f.car} /><Cmp label="المحافظة" f={f.governorate} /></>}
                {f?.owner_differs === true && <Muted>ملاحظة: اسم مالك السنوية يختلف عن اسم السائق.</Muted>}
                <Btn small kind="secondary" label={work ? 'جاري الفحص…' : docs.length ? 'أعد الفحص' : 'فحص'} onPress={scan} />
              </Card>

              <Card style={{ gap: 8 }}>
                <T style={{ fontWeight: '800' }}>الصور ({docs.length})</T>
                {docs.length === 0 && <Muted>ما كو صور (إما محذوفة بعد التوثيق أو ما انرفعت).</Muted>}
                {docs.map((d) => (
                  <View key={d.id} style={[rtl.row, { gap: 8, backgroundColor: C.surface2, borderRadius: R.sm, padding: 10 }]}>
                    <T style={{ flex: 1, fontWeight: '700' }}>{DK[d.kind] ?? d.kind}</T>
                    <Btn small kind="secondary" label="عرض" onPress={() => view(d.path)} />
                  </View>
                ))}
              </Card>

              <Card style={{ gap: 8 }}>
                <T style={{ fontWeight: '800' }}>القرار</T>
                <TextInput value={reason} onChangeText={setReason} placeholder="سبب الرفض أو الإيقاف (يوصل للسائق)" placeholderTextColor={C.muted} maxLength={200} style={{ fontFamily: fontFor('400'), color: C.text, textAlign: 'right', backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 11 }} />
                <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
                  {!c.verified && <Btn label={work ? '…' : 'وثّق السائق'} onPress={confirmOk} style={{ flex: 1 }} />}
                  {!c.verified && <Btn kind="danger" label="ارفض" onPress={() => decide(false)} style={{ flex: 1 }} />}
                  {c.verified && <Btn kind="secondary" label="إلغاء التوثيق" onPress={() => decide(false)} style={{ flex: 1 }} />}
                </View>
                <Btn kind={c.suspended ? 'primary' : 'danger'} label={c.suspended ? 'رفع الإيقاف' : 'إيقاف السائق (يختفي من الخريطة)'} onPress={() => suspend(!c.suspended)} />
              </Card>
            </>
          )}
        </ScrollView>
        <Modal visible={!!img} transparent animationType="fade" onRequestClose={() => setImg('')}>
          <Pressable onPress={() => setImg('')} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 16 }}>
            <Image source={{ uri: img }} resizeMode="contain" style={{ width: '100%', height: '85%' }} />
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

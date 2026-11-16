import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Tab = 'users' | 'subreq' | 'cranes' | 'docs' | 'shops' | 'reports' | 'errors';
const TABS: [Tab, string][] = [['users', 'المستخدمين'], ['subreq', 'الاشتراكات'], ['cranes', 'السواق'], ['docs', 'الوثائق'], ['shops', 'المحلات'], ['reports', 'البلاغات'], ['errors', 'الأخطاء']];
const DK: Record<string, string> = { id_front: 'الهوية — أمام', id_back: 'الهوية — خلف', vehicle_front: 'سنوية — أمام', vehicle_back: 'سنوية — خلف', license_front: 'الإجازة — أمام', license_back: 'الإجازة — خلف' };
const ST: Record<string, [string, string]> = { pending: ['بانتظار', C.warn], approved: ['مقبول', C.ok], rejected: ['مرفوض', C.danger] };

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any


const ago = (s?: string | null) => { if (!s) return '—'; const d = Math.floor((Date.now() - Date.parse(s)) / 864e5); return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : 'قبل ' + d + ' يوم'; };
const TN: Record<string, string> = { bronze: 'أساسي', silver: 'فضي', gold: 'ذهبي', diamond: 'شركات' };
const waUrl = (ph: string, msg?: string) => 'https://wa.me/964' + ph.replace(/^0/, '') + (msg ? '?text=' + encodeURIComponent(msg) : '');
const UF: Record<string, [string, (u: Row) => boolean]> = {
  all: ['الكل', () => true], drivers: ['سواق', (u) => !!u.crane_id], customers: ['زبائن', (u) => !u.crane_id],
  subs: ['مشتركين', (u) => !!u.crane_id && u.tier !== 'bronze' && !!u.sub_expires_at && Date.parse(u.sub_expires_at) > Date.now()],
  pending: ['طلب اشتراك', (u) => !!u.sub_pending], inactive: ['غير نشط', (u) => !u.last_sign_in_at || Date.now() - Date.parse(u.last_sign_in_at) > 30 * 864e5],
};

function Chip({ txt, color }: { txt: string; color: string }) {
  return <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: color + '22' }}><T style={{ color, fontSize: 12, fontWeight: '700' }}>{txt}</T></View>;
}

export default function Admin() {
  const insets = useSafeAreaInsets();
  const admin = useIsAdmin();
  const [tab, setTab] = useState<Tab>('users');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [img, setImg] = useState('');
  const [q, setQ] = useState('');
  const [qIn, setQIn] = useState('');
  const [flt, setFlt] = useState('all');
  const [ov, setOv] = useState<Row | null>(null);
  const [phones, setPhones] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setBusy(true);
    let r: { data: Row[] | null; error: unknown };
    if (tab === 'users') r = await supabase.rpc('admin_users', { p_search: q || null, p_limit: 500 }) as typeof r;
    else if (tab === 'subreq') {
      r = await supabase.from('subscription_requests').select('id,crane_id,tier,period,status,created_at,cranes(name,governorate)').order('created_at', { ascending: false }).limit(200);
      const ph = await supabase.from('crane_contacts').select('crane_id,phone').limit(1000);
      setPhones(Object.fromEntries(((ph.data ?? []) as Row[]).map((x) => [x.crane_id, x.phone])));
    }
    else if (tab === 'errors') r = await supabase.from('error_log').select('id,platform,msg,ctx,created_at').order('created_at', { ascending: false }).limit(100);
    else if (tab === 'cranes') r = await supabase.from('cranes').select('id,name,type,governorate,verified,listed,tier,status').order('created_at', { ascending: false }).limit(200);
    else if (tab === 'docs') r = await supabase.from('driver_documents').select('id,kind,path,status,note,crane_id,cranes(name,verified,governorate)').order('created_at', { ascending: true }).limit(300);
    else if (tab === 'shops') r = await supabase.from('shops').select('id,name,kind,phone,status,governorate').order('created_at', { ascending: false }).limit(200);
    else r = await supabase.from('reports').select('id,reason,details,status,cranes(name)').order('created_at', { ascending: false }).limit(100);
    setRows(r.error ? [] : (r.data ?? []));
    if (r.error) Alert.alert('تعذّر التحميل', 'تأكد من الإنترنت وصلاحيات المدير.');
    setBusy(false);
  }, [tab, q]);
  useEffect(() => { if (admin) load(); }, [admin, load]);
  useEffect(() => { if (admin) supabase.rpc('admin_overview').then(({ data }) => setOv(data as Row | null), () => {}); }, [admin]);

  const patch = async (table: string, id: string, body: Row) => {
    const { error } = await supabase.from(table).update(body).eq('id', id);
    if (error) Alert.alert('تعذّر الحفظ', error.message); else load();
  };
  const decide = async (id: string, ok: boolean, months: number) => {
    const { error } = await supabase.rpc('decide_subscription', { p_id: id, p_approve: ok, p_months: months });
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


        {!busy && tab === 'users' && (
          <>
            {ov && (
              <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
                {([['مستخدمين', ov.users], ['جدد 7 أيام', ov.users_7d], ['نشطين 7 أيام', ov.active_7d], ['سواق', ov.drivers], ['طلبات اشتراك', ov.sub_pending], ['تنتهي قريباً', ov.expiring_7d], ['أخطاء 24س', ov.errors_24h]] as [string, number][]).map(([l, n]) => (
                  <View key={l} style={{ flexGrow: 1, minWidth: 90, padding: 10, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}>
                    <T style={{ fontSize: 20, fontWeight: '800', color: C.accent }}>{n ?? 0}</T><Muted style={{ fontSize: 11 }}>{l}</Muted>
                  </View>
                ))}
              </View>
            )}
            <View style={[rtl.row, { gap: 8 }]}>
              <TextInput value={qIn} onChangeText={setQIn} onSubmitEditing={() => setQ(qIn.trim())} returnKeyType="search" placeholder="بحث: اسم، إيميل، هاتف" placeholderTextColor={C.muted} style={{ flex: 1, fontFamily: 'IBMPlexSansArabic_400Regular', color: C.text, textAlign: 'right', backgroundColor: C.surface2, borderRadius: 99, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 11 }} />
              <Btn small label="بحث" onPress={() => setQ(qIn.trim())} />
            </View>
            <View style={[rtl.row, { gap: 6, flexWrap: 'wrap' }]}>
              {Object.entries(UF).map(([k, [l, f]]) => (
                <Pressable key={k} onPress={() => setFlt(k)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: flt === k ? C.accent : C.surface2 }}>
                  <T style={{ fontSize: 13, fontWeight: '700', color: flt === k ? C.onAccent : C.text }}>{l} ({rows.filter(f).length})</T>
                </Pressable>
              ))}
            </View>
            {rows.filter(UF[flt][1]).map((u) => (
              <Card key={u.id} style={{ gap: 6 }}>
                <View style={[rtl.row, { gap: 6, flexWrap: 'wrap' }]}>
                  <T style={{ fontWeight: '800' }}>{u.full_name || 'بدون اسم'}</T>
                  {!!u.crane_id && <Chip txt={u.verified ? 'سائق موثق' : 'سائق'} color={u.verified ? C.ok : C.warn} />}
                  {!!u.crane_id && u.tier !== 'bronze' && <Chip txt={TN[u.tier] ?? u.tier} color={C.accent} />}
                  {!!u.sub_pending && <Chip txt="طلب اشتراك" color={C.danger} />}
                </View>
                <Muted style={{ writingDirection: 'ltr' }}>{u.email}</Muted>
                <Muted>{[u.governorate, u.car].filter(Boolean).join(' · ') || '—'}</Muted>
                <Muted style={{ fontSize: 12 }}>آخر دخول {ago(u.last_sign_in_at)} · طلبات {u.requests_n} · اتصالات {u.calls_n}</Muted>
                {!!u.phone && <Btn small kind="secondary" label={'واتساب ' + u.phone} onPress={() => Linking.openURL(waUrl(u.phone)).catch(() => {})} />}
              </Card>
            ))}
          </>
        )}

        {!busy && tab === 'subreq' && rows.map((r) => {
          const [lbl, col] = ST[r.status] ?? [r.status, C.muted];
          const ph = phones[r.crane_id];
          return (
            <Card key={r.id} style={{ gap: 8 }}>
              <View style={[rtl.row, { gap: 8, justifyContent: 'space-between' }]}><T style={{ fontWeight: '800', flex: 1 }}>{r.cranes?.name ?? '—'}</T><Chip txt={lbl} color={col} /></View>
              <Muted>{TN[r.tier] ?? r.tier} · {r.period === 'yearly' ? 'سنوي' : 'شهري'} · {r.cranes?.governorate ?? ''} · {ago(r.created_at)}</Muted>
              <View style={[rtl.row, { gap: 8, flexWrap: 'wrap' }]}>
                {!!ph && <Btn small kind="secondary" label="واتساب" onPress={() => Linking.openURL(waUrl(ph, 'مرحباً، بخصوص طلب اشتراكك بعضوية «' + (TN[r.tier] ?? '') + '» بسند جايك')).catch(() => {})} />}
                {r.status === 'pending' && <Btn small label="تفعيل شهر" onPress={() => decide(r.id, true, 1)} />}
                {r.status === 'pending' && r.period === 'yearly' && <Btn small label="تفعيل سنة" onPress={() => decide(r.id, true, 12)} />}
                {r.status === 'pending' && <Btn small kind="danger" label="رفض" onPress={() => decide(r.id, false, 1)} />}
              </View>
            </Card>
          );
        })}

        {!busy && tab === 'errors' && rows.map((r) => (
          <Card key={r.id} style={{ gap: 4 }}>
            <T style={{ fontSize: 13, writingDirection: 'ltr', textAlign: 'left' }}>{r.msg}</T>
            <Muted style={{ fontSize: 12 }}>{r.platform ?? ''} · {ago(r.created_at)}</Muted>
          </Card>
        ))}

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

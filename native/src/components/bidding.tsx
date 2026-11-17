import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { Btn, Card, Muted, T, rtl } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { C, fontFor, R } from '@/lib/theme';

// ===== مزايدة السعر =====
// الكرين يبدأ بعرض، والطرفان يتناوبان، 6 عروض كحد أقصى، لكل عرض دقيقة.
// الطرف الثاني: موافق أو زايد أو رفض. العرض الأخير (السادس): موافق أو رفض فقط.
export type Offer = { id: string; request_id: string; crane_id: string; seq: number; by_role: 'crane' | 'customer'; amount: number; status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired'; created_at: string; expires_at: string };
const MAX_SEQ = 6, STEP = 5000, MIN = 1000, MAX = 100000000;

export const fmtIQD = (n: number) => n.toLocaleString('en-US') + ' د.ع';
const snap = (n: number) => Math.min(MAX, Math.max(MIN, Math.round(n / 250) * 250));

const ERR: Record<string, string> = {
  'offer expired': 'انتهت مهلة العرض (دقيقة).',
  'request is no longer open': 'الطلب ما عاد متاح.',
  'wait for the other side': 'انتظر رد الطرف الثاني.',
  'bad amount': 'المبلغ لازم يكون من 1,000 وبمضاعفات 250.',
  'bidding closed': 'انتهت المفاوضة على هذا الطلب.',
  'last offer: accept or reject only': 'هذا العرض الأخير: موافق أو رفض فقط.',
  'not allowed': 'ما تكدر تسوي هذا الإجراء.',
  'crane starts the bidding': 'الكرين هو اللي يبدأ بالسعر.',
};
const errText = (m?: string) => { const k = Object.keys(ERR).find((x) => (m ?? '').includes(x)); return k ? ERR[k] : 'تعذّر. تأكد من الإنترنت وجرّب مرة ثانية.'; };

function useNow() {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(t); }, []);
  return n;
}
const secsLeft = (o: Offer, now: number) => Math.max(0, Math.ceil((Date.parse(o.expires_at) - now) / 1000));
const mmss = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

// يرجّع آخر عرض بالخيط ومعلوماته
function useThread(requestId: string, craneId: string | null) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const load = useCallback(async () => {
    let q = supabase.from('request_offers').select('id,request_id,crane_id,seq,by_role,amount,status,created_at,expires_at').eq('request_id', requestId).order('seq', { ascending: true });
    if (craneId) q = q.eq('crane_id', craneId);
    const { data } = await q;
    setOffers((data ?? []) as Offer[]);
  }, [requestId, craneId]);
  useEffect(() => { load().catch(() => {}); const t = setInterval(() => load().catch(() => {}), 3000); return () => clearInterval(t); }, [load]);
  return { offers, reload: load };
}

function AmountPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(String(value)); }, [value]);
  return (
    <View style={{ gap: 8 }}>
      <View style={[rtl.row, { gap: 8 }]}>
        <Btn small kind="secondary" label="+5,000" onPress={() => onChange(snap(value + STEP))} />
        <TextInput
          value={txt}
          onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 9); setTxt(d); if (d) onChange(Math.min(MAX, +d)); }}
          onBlur={() => onChange(snap(+txt || MIN))}
          keyboardType="number-pad"
          maxLength={9}
          style={{ flex: 1, fontFamily: fontFor('700'), color: C.text, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingVertical: 10, fontSize: 20, textAlign: 'center' }}
        />
        <Btn small kind="secondary" label="−5,000" onPress={() => onChange(snap(value - STEP))} />
      </View>
      <Muted style={{ textAlign: 'center' }}>{fmtIQD(value)}</Muted>
    </View>
  );
}

function Timer({ o, now }: { o: Offer; now: number }) {
  const s = secsLeft(o, now);
  return <T style={{ color: s <= 15 ? C.danger : C.warn, fontWeight: '800' }}>⏱ {mmss(s)}</T>;
}

/** لوحة المفاوضة لخيط واحد (طلب + كرين). role = من أنا؟ */
function Negotiation({ role, requestId, craneId, offers, reload, onDone, defaultAmount, title }: {
  role: 'crane' | 'customer'; requestId: string; craneId: string; offers: Offer[]; reload: () => void; onDone?: () => void; defaultAmount: number; title?: string;
}) {
  const now = useNow();
  const last = offers.length ? offers[offers.length - 1] : null;
  const [amt, setAmt] = useState(defaultAmount);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (last) setAmt(snap(last.amount)); }, [last?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = !!last && last.status === 'pending' && secsLeft(last, now) > 0;
  const mine = !!last && last.by_role === role;
  const final = !!last && last.seq >= MAX_SEQ;

  async function send() {
    setBusy(true);
    const { error } = await supabase.rpc('make_offer', { p_request: requestId, p_crane: craneId, p_amount: amt });
    setBusy(false);
    if (error) Alert.alert('تعذّر', errText(error.message)); else setOpen(false);
    reload();
  }
  async function reply(a: 'accept' | 'reject') {
    setBusy(true);
    const { error } = await supabase.rpc('respond_offer', { p_offer: last!.id, p_action: a });
    setBusy(false);
    if (error) Alert.alert('تعذّر', errText(error.message));
    else if (a === 'accept') { Alert.alert('تم الاتفاق', 'السعر: ' + fmtIQD(last!.amount) + '. تواصلوا الحين.'); onDone?.(); }
    reload();
  }

  const history = (
    <View style={{ gap: 2 }}>
      {offers.map((o) => (
        <View key={o.id} style={rtl.row}>
          <Muted style={{ flex: 1 }}>{o.by_role === 'crane' ? 'الكرين' : 'الزبون'}</Muted>
          <Muted style={{ color: o.status === 'accepted' ? C.ok : o.status === 'rejected' ? C.danger : C.muted, fontWeight: o.status === 'accepted' ? '800' : '400' }}>{fmtIQD(o.amount)}{o.status === 'accepted' ? ' ✓' : o.status === 'rejected' ? ' ✗' : ''}</Muted>
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      {!!title && <T style={{ fontWeight: '800' }}>{title}</T>}
      {offers.length > 1 && history}

      {!last && role === 'crane' && (
        <>
          {open ? (
            <>
              <AmountPicker value={amt} onChange={setAmt} />
              <View style={[rtl.row, { gap: 8 }]}>
                <Btn label={busy ? '…' : 'أرسل العرض'} style={{ flex: 1 }} disabled={busy} onPress={send} />
                <Btn kind="secondary" label="رجوع" onPress={() => setOpen(false)} />
              </View>
              <Muted>للزبون دقيقة واحدة حتى يرد. المفاوضة 3 جولات كحد أقصى.</Muted>
            </>
          ) : <Btn kind="ghost" label="اعرض سعرك" onPress={() => setOpen(true)} />}
        </>
      )}
      {!last && role === 'customer' && <Muted>بانتظار عرض السعر من الكرين.</Muted>}

      {!!last && live && mine && (
        <View style={[rtl.row, { gap: 8 }]}>
          <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>عرضك: {fmtIQD(last.amount)}</T><Muted>بانتظار رد {role === 'crane' ? 'الزبون' : 'الكرين'}…</Muted></View>
          <Timer o={last} now={now} />
        </View>
      )}

      {!!last && live && !mine && (
        <>
          <View style={[rtl.row, { gap: 8 }]}>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '800', fontSize: 17 }}>{role === 'customer' ? 'الكرين يطلب' : 'الزبون يعرض'}: {fmtIQD(last.amount)}</T>
              {final && <Muted style={{ color: C.warn }}>آخر عرض: موافق أو رفض فقط.</Muted>}
            </View>
            <Timer o={last} now={now} />
          </View>
          {open && !final ? (
            <>
              <AmountPicker value={amt} onChange={setAmt} />
              <View style={[rtl.row, { gap: 8 }]}>
                <Btn label={busy ? '…' : 'أرسل المزايدة'} style={{ flex: 1 }} disabled={busy} onPress={send} />
                <Btn kind="secondary" label="رجوع" onPress={() => setOpen(false)} />
              </View>
            </>
          ) : (
            <View style={[rtl.row, { gap: 8 }]}>
              <Btn label="موافق" style={{ flex: 1, backgroundColor: C.ok }} disabled={busy} onPress={() => reply('accept')} />
              {!final && <Btn kind="ghost" label="زايد" onPress={() => setOpen(true)} />}
              <Btn kind="danger" label="رفض" disabled={busy} onPress={() => reply('reject')} />
            </View>
          )}
        </>
      )}

      {!!last && !live && last.status !== 'accepted' && (
        <Muted style={{ color: C.warn }}>{last.status === 'rejected' ? 'انرفض العرض. انتهت المفاوضة.' : last.status === 'expired' || last.status === 'pending' ? 'انتهت المهلة بدون رد. انتهت المفاوضة.' : 'انتهت المفاوضة.'}</Muted>
      )}
      {!!last && last.status === 'accepted' && <T style={{ color: C.ok, fontWeight: '800' }}>تم الاتفاق على {fmtIQD(last.amount)}</T>}
    </View>
  );
}

/** للكرين: تحت كل طلب وارد */
export function DriverBid({ requestId, craneId, onAccepted }: { requestId: string; craneId: string; onAccepted?: () => void }) {
  const { offers, reload } = useThread(requestId, craneId);
  return <Negotiation role="crane" requestId={requestId} craneId={craneId} offers={offers} reload={reload} onDone={onAccepted} defaultAmount={50000} />;
}

/** للزبون: كل العروض الواصلة على طلبه، خيط لكل كرين */
export function CustomerOffers({ requestId, onAccepted }: { requestId: string; onAccepted?: () => void }) {
  const { offers, reload } = useThread(requestId, null);
  const [names, setNames] = useState<Record<string, string>>({});
  const ids = useMemo(() => Array.from(new Set(offers.map((o) => o.crane_id))), [offers]);
  useEffect(() => {
    if (!ids.length) return;
    supabase.from('cranes').select('id,name').in('id', ids).then(({ data }) => setNames(Object.fromEntries(((data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]))));
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ids.length) return null;
  // الأحدث نشاطاً أول
  const threads = ids.map((id) => offers.filter((o) => o.crane_id === id)).sort((a, b) => Date.parse(b[b.length - 1].created_at) - Date.parse(a[a.length - 1].created_at));
  return (
    <Card style={{ gap: 14 }}>
      <T style={{ fontWeight: '800', fontSize: 17 }}>عروض الأسعار</T>
      {threads.map((th, i) => (
        <View key={th[0].crane_id} style={{ gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: C.line, paddingTop: i ? 12 : 0 }}>
          <Negotiation role="customer" requestId={requestId} craneId={th[0].crane_id} offers={th} reload={reload} onDone={onAccepted} defaultAmount={th[th.length - 1].amount} title={names[th[0].crane_id] ?? 'كرين'} />
        </View>
      ))}
    </Card>
  );
}


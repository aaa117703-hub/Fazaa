import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';

import { Btn, Muted, T, rtl } from '@/components/ui';
import { C, fontFor, R } from '@/lib/theme';

export const CUSTOMER_REASONS = ['لقيت مساعدة ثانية', 'السعر مرتفع', 'السائق تأخر', 'تغيّر الوضع، ما أحتاج', 'غلطت بالطلب', 'سبب آخر'];
export const DELETE_REASONS = ['ما أحتاج التطبيق', 'ما لقيت سائقين أو طلبات', 'مشكلة مع سائق أو زبون', 'عندي حساب ثاني', 'قلق على خصوصيتي', 'سبب آخر'];
export const CRANE_REASONS = ['عطل بسيارتي', 'الزبون ما يرد', 'الموقع بعيد', 'اختلفنا على السعر', 'الزبون ألغى بالاتصال', 'سبب آخر'];

/** Bottom sheet: pick a reason, optional note, confirm. */
export function CancelSheet({ visible, title, reasons, onClose, onConfirm, confirmLabel }: { visible: boolean; title: string; reasons: string[]; confirmLabel?: string; onClose: () => void; onConfirm: (reason: string) => Promise<void> | void }) {
  const [pick, setPick] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const other = pick === reasons[reasons.length - 1];
  const go = async () => {
    if (!pick || busy) return;
    setBusy(true);
    try { await onConfirm(other && note.trim() ? note.trim() : pick); setPick(''); setNote(''); } finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: 20, gap: 10 }}>
          <T style={{ fontWeight: '800', fontSize: 18 }}>{title}</T>
          <Muted>اختر السبب. يساعدنا نحسّن الخدمة.</Muted>
          {reasons.map((x) => (
            <Pressable key={x} onPress={() => setPick(x)} style={[rtl.row, { gap: 10, padding: 13, borderRadius: R.md, backgroundColor: pick === x ? C.accent : C.surface2 }]}>
              <T style={{ color: pick === x ? C.onAccent : C.text, fontWeight: '700', flex: 1 }}>{x}</T>
            </Pressable>
          ))}
          {other && <TextInput value={note} onChangeText={setNote} maxLength={120} placeholder="اكتب السبب (اختياري)" placeholderTextColor={C.muted} style={{ fontFamily: fontFor('400'), backgroundColor: C.surface2, color: C.text, borderRadius: R.md, padding: 12, fontSize: 15, textAlign: 'right' }} />}
          <Btn label={busy ? '...' : (confirmLabel ?? 'تأكيد الإلغاء')} kind="danger" disabled={!pick || busy} onPress={go} />
          <Btn label="رجوع" kind="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

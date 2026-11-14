import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { asText, clearLines, dlog, getLines, subscribe, touchStat } from '@/lib/debuglog';

const COL = { log: '#9aa4ad', warn: '#ffb020', error: '#ff5a5a', touch: '#5ad1ff', evt: '#7CFC9a' } as const;

/** شريط تشخيص صغير دائماً ظاهر: عدّاد اللمسات + زر يفتح السجل. يُحذف قبل النشر للمتاجر. */
export function DebugConsole() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  const errs = getLines().filter((l) => l.lvl === 'error').length;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
      <Pressable
        onPress={() => { dlog('evt', 'debug chip pressed'); setOpen((o) => !o); }}
        style={[s.chip, { top: insets.top + 4 }]}>
        <Text style={s.chipTxt}>🐞 لمسات {touchStat.n} ({touchStat.x},{touchStat.y}) · أخطاء {errs}</Text>
      </Pressable>
      {open && (
        <View style={[s.panel, { top: insets.top + 40, bottom: insets.bottom + 10 }]}>
          <View style={s.bar}>
            <Pressable style={s.b} onPress={() => setOpen(false)}><Text style={s.bt}>إغلاق</Text></Pressable>
            <Pressable style={s.b} onPress={clearLines}><Text style={s.bt}>مسح</Text></Pressable>
            <Pressable style={s.b} onPress={() => { Share.share({ message: asText() || 'فارغ' }).catch(() => {}); }}><Text style={s.bt}>نسخ/مشاركة السجل</Text></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {getLines().slice().reverse().map((l, i) => (
              <Text key={i} selectable style={[s.ln, { color: COL[l.lvl] }]}>
                {new Date(l.t).toISOString().slice(11, 19)} [{l.lvl}] {l.msg}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { position: 'absolute', left: 8, backgroundColor: 'rgba(0,0,0,0.78)', borderColor: '#444', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt: { color: '#fff', fontSize: 11 },
  panel: { position: 'absolute', left: 8, right: 8, backgroundColor: 'rgba(8,10,12,0.96)', borderColor: '#444', borderWidth: 1, borderRadius: 12, padding: 8 },
  bar: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  b: { backgroundColor: '#2a2f35', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  bt: { color: '#fff', fontSize: 12 },
  ln: { fontSize: 10.5, marginBottom: 3, fontFamily: 'Menlo', textAlign: 'left', writingDirection: 'ltr' },
});

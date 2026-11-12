import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Muted, T } from '@/components/ui';
import { tap } from '@/lib/safe';
import { C, R } from '@/lib/theme';

// قائمة اختيار منبثقة (بدل select الموقع)
export function Select({ label, value, options, onChange, allLabel, full, disabled }: { label: string; value: string; options: string[]; onChange: (v: string) => void; allLabel?: string; full?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const items = allLabel ? [''].concat(options) : options;
  return (
    <>
      <Pressable disabled={disabled} onPress={() => { tap(); setOpen(true); }} style={full
        ? { paddingHorizontal: 14, paddingVertical: 13, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, opacity: disabled ? 0.5 : 1 }
        : { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: value ? C.accent : C.surface2 }}>
        <T style={{ fontWeight: '700', color: full ? (value ? C.text : C.muted) : value ? '#fff' : C.muted }}>{value || allLabel || label} ▾</T>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setOpen(false)} />
        <View style={{ maxHeight: '65%', backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 8 }}>
          <T style={{ fontSize: 17, fontWeight: '800', padding: 16 }}>{label}</T>
          <FlatList
            data={items}
            keyExtractor={(x) => x || '_all'}
            renderItem={({ item }) => (
              <Pressable onPress={() => { tap(); onChange(item); setOpen(false); }} style={{ paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: item === value ? 'rgba(255,107,44,0.12)' : 'transparent' }}>
                <T style={{ fontWeight: item === value ? '800' : '500', color: item === value ? C.accent : C.text }}>{item || allLabel || 'الكل'}</T>
              </Pressable>
            )}
            ListFooterComponent={<Muted style={{ height: 6 }}>{''}</Muted>}
          />
        </View>
      </Modal>
    </>
  );
}

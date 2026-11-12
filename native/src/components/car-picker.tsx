import React from 'react';
import { TextInput, View } from 'react-native';

import { Select } from '@/components/select';
import { Muted } from '@/components/ui';
import { C, R } from '@/lib/theme';

export const OTHER = 'غير مذكور';
export type CarVal = { make: string; model: string };

// اختيار: شركة ← موديل (مع «غير مذكور» وكتابة حرة)
export function CarPicker({ data, makeLabel, modelLabel, value, onChange }: { data: Record<string, string[]>; makeLabel: string; modelLabel: string; value: CarVal; onChange: (v: CarVal) => void }) {
  const makes = Object.keys(data).concat(OTHER);
  const list = data[value.make] ?? [];
  const inList = list.includes(value.model);
  const free = value.make === OTHER || (!!value.make && !!value.model && !inList) || value.model === OTHER;
  const shown = value.make === OTHER ? OTHER : inList ? value.model : value.model ? OTHER : '';
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 6 }}>
        <Muted>{makeLabel}</Muted>
        <Select full label={makeLabel} value={value.make} options={makes} onChange={(m) => onChange({ make: m, model: m === OTHER ? '' : '' })} allLabel="اختر" />
      </View>
      <View style={{ gap: 6 }}>
        <Muted>{modelLabel}</Muted>
        <Select full disabled={!value.make || value.make === OTHER} label={modelLabel} value={shown} options={list.concat(OTHER)} onChange={(m) => onChange({ make: value.make, model: m === OTHER ? OTHER : m })} allLabel={value.make ? 'اختر' : 'اختر الشركة أولاً'} />
        {free && (
          <TextInput
            value={value.model === OTHER ? '' : value.model}
            onChangeText={(t) => onChange({ make: value.make, model: t })}
            placeholder="اكتب الاسم" placeholderTextColor={C.muted} maxLength={40}
            style={{ backgroundColor: C.surface2, color: C.text, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'right', borderWidth: 1, borderColor: C.line }}
          />
        )}
      </View>
    </View>
  );
}
export const carOk = (v: CarVal) => !!v.make && v.model.trim().length > 0 && v.model !== OTHER;

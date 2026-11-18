#!/usr/bin/env python3
"""يولّد native/src/lib/icon-data.ts من icons.json (مصدر الحقيقة الوحيد للأيقونات)."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
d = json.load(open(root / 'tools/icons/icons.json', encoding='utf8'))
body = json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'ar'} for k, v in d.items()}, ensure_ascii=False, indent=1)
out = ("// مولَّد تلقائياً من tools/icons/icons.json بواسطة tools/icons/gen.py — لا تعدّله يدوياً.\n"
       f"export const ICONS = {body} as const;\n"
       "export type IconName = keyof typeof ICONS;\n")
(root / 'native/src/lib/icon-data.ts').write_text(out, encoding='utf8')
print('icons:', len(d))

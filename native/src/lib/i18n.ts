import { CKB } from '@/lib/i18n-ckb';
import { EN } from '@/lib/i18n-en';
import type { Lang } from '@/lib/prefs';

// ترجمة نص عربي ثابت: مطابقة كاملة أولاً، ثم بعد حذف أرقام/رموز الأطراف. إذا ما لقينا نرجّع الأصل.
export function tr(s: string, lang: Lang): string {
  if (lang === 'ar' || !s) return s;
  const d = lang === 'en' ? EN : CKB;
  const t = s.trim();
  if (d[t]) return s.replace(t, d[t]);
  return s;
}

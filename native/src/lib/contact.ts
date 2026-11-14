import { Alert, Linking, Platform, Share } from 'react-native';

import { supabase } from '@/lib/supabase';

const phones: Record<string, string> = {};
export async function phoneOf(id: string) {
  if (phones[id]) return phones[id];
  const { data } = await supabase.from('crane_contacts').select('phone').eq('crane_id', id).maybeSingle();
  const p = (data?.phone as string | undefined) ?? '';
  if (p) phones[id] = p;
  return p;
}
function waNumber(p: string) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('964')) return d;
  if (d.startsWith('0')) d = d.slice(1);
  return '964' + d;
}
export type Pos = { latitude: number; longitude: number } | null;
const message = (pos: Pos) =>
  'السلام عليكم، سيارتي تعطلت وأحتاج كرين.' + (pos ? '\nموقعي: https://maps.google.com/?q=' + pos.latitude.toFixed(6) + ',' + pos.longitude.toFixed(6) : '') + '\n(من تطبيق سند جايك)';

const isPad = Platform.OS === 'ios' && !!(Platform as unknown as { isPad?: boolean }).isPad;

/** اتصال مباشر: على الهاتف يفتح الاتصال فوراً. الايباد ما يتصل فنعرض الرقم مع واتساب ومشاركة. */
export async function dial(name: string, phone: string, wa?: string) {
  const showNumber = () => Alert.alert(name, 'الرقم: ' + phone, [
    ...(wa ? [{ text: 'واتساب', onPress: () => { Linking.openURL(wa).catch(() => {}); } }] : []),
    { text: 'مشاركة الرقم', onPress: () => { Share.share({ message: phone }).catch(() => {}); } },
    { text: 'إغلاق', style: 'cancel' as const },
  ]);
  if (isPad) { showNumber(); return; }
  try { await Linking.openURL('tel:' + phone.replace(/\s/g, '')); } catch { showNumber(); }
}

type C = { id: string; name: string; is_demo?: boolean };
// how: 'tel' | 'wa'. إذا الجهاز ما يتصل (ايباد) نعرض الرقم مع واتساب.
export async function contact(c: C, how: 'tel' | 'wa', pos: Pos, signedIn: boolean, goLogin: () => void) {
  if (!signedIn) { goLogin(); return; }
  if (c.is_demo) { Alert.alert('كرين تجريبي', 'هذا كرين تجريبي، ما عنده رقم حقيقي.'); return; }
  try {
    const phone = await phoneOf(c.id);
    if (!phone) { Alert.alert('ما كو رقم', 'ما لكينا رقم هذا الكرين.'); return; }
    const { data: u } = await supabase.auth.getUser();
    if (u.user) supabase.from('calls').insert({ crane_id: c.id, user_id: u.user.id }).then(() => {}, () => {});
    const wa = 'https://wa.me/' + waNumber(phone) + '?text=' + encodeURIComponent(message(pos));
    if (how === 'wa') { await Linking.openURL(wa); return; }
    await dial(c.name, phone, wa);
  } catch { Alert.alert('خطأ', 'تعذّر جلب الرقم. جرّب مرة ثانية.'); }
}

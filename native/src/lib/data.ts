// بيانات ثابتة منقولة من الموقع (data.js)
export const GOVS = [
  ['بغداد', 33.3152, 44.3661], ['البصرة', 30.5085, 47.7835], ['ذي قار', 31.0439, 46.2573], ['ميسان', 31.8356, 47.1458],
  ['واسط', 32.5126, 45.8183], ['القادسية', 31.9889, 44.9264], ['المثنى', 31.3189, 45.2864], ['النجف', 31.9929, 44.3365],
  ['كربلاء', 32.616, 44.0249], ['بابل', 32.4833, 44.4333], ['الأنبار', 33.4258, 43.2989], ['ديالى', 33.75, 44.6333],
  ['صلاح الدين', 34.6071, 43.6782], ['كركوك', 35.4681, 44.3922], ['نينوى', 36.335, 43.1189], ['أربيل', 36.1912, 44.0092],
  ['السليمانية', 35.5613, 45.4309], ['دهوك', 36.8679, 42.9885], ['حلبجة', 35.1778, 45.9861],
].map((g) => ({ name: g[0] as string, lat: g[1] as number, lng: g[2] as number }));

export const TYPES = ['سحب', 'سطحة', 'هيدروليك', 'ثقيل', 'ونش', 'ميكانيك متنقل', 'بنشر وإطارات', 'بطارية', 'وقود'];
export const STALE_MS = 3 * 3600 * 1000;

export const TIERS = [
  { id: 'bronze', name: 'أساسي', tag: 'للبداية', price: 0, unit: 'مجاناً', color: '#8C949B', fleet: 1, radius: 40,
    features: ['الظهور بالقائمة والخريطة', 'اتصال مباشر من الزبائن', 'ملف شخصي وتقييم بالنجوم', 'استلام الطلبات ضمن 40 كم', 'كرين واحد بالحساب'] },
  { id: 'silver', name: 'فضي', tag: 'تصلك الطلبات أسرع', price: 10000, unit: 'دينار / شهر', color: '#D9DADC', fleet: 2, radius: 50,
    features: ['كل مميزات الأساسي', 'يصلك الطلب قبل غيرك', 'استلام الطلبات ضمن 50 كم', 'لوحة إحصائيات أسبوعية', 'حتى كرينين بالحساب'] },
  { id: 'gold', name: 'ذهبي', tag: 'ظهور مميز', price: 25000, unit: 'دينار / شهر', color: '#FFC93C', fleet: 5, radius: 65,
    features: ['كل مميزات الفضي', 'أولوية أعلى للطلبات ضمن 65 كم', 'دبوس كبير ومميز على الخريطة', 'قسم «الموصى بهم» بالرئيسية', 'حتى 5 كرينات بالحساب'] },
  { id: 'diamond', name: 'شركات', tag: 'لأصحاب الأساطيل', price: 50000, unit: 'دينار / شهر', color: '#5AA9FF', fleet: 10, radius: 80,
    features: ['كل مميزات الذهبي', 'أعلى أولوية للطلبات ضمن 80 كم', 'أكبر دبوس وأول ظهور بالموصى بهم', 'إدارة أسطول حتى 10 كرينات', 'دعم مباشر عبر واتساب'] },
];
// العضوية الفعّالة: المنتهية ترجع «أساسي»
export const effTier = (c?: { tier?: string | null; sub_expires_at?: string | null } | null) =>
  c && c.tier && c.tier !== 'bronze' && c.sub_expires_at && Date.parse(c.sub_expires_at) > Date.now() ? c.tier : 'bronze';
export const tierOf = (id?: string | null) => TIERS.find((t) => t.id === id) ?? TIERS[0];

export function distKm(a: { latitude: number; longitude: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.latitude) * rad, dLng = (b.lng - a.longitude) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const fmtDist = (km: number) => (km < 1 ? Math.max(50, Math.round((km * 1000) / 50) * 50) + ' م' : km.toFixed(1) + ' كم');
export function ago(iso?: string | number | null) {
  if (!iso) return '—';
  const ts = typeof iso === 'number' ? iso : Date.parse(iso);
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'الآن';
  if (s < 3600) return 'قبل ' + Math.floor(s / 60) + ' د';
  if (s < 86400) return 'قبل ' + Math.floor(s / 3600) + ' س';
  return 'قبل ' + Math.floor(s / 86400) + ' يوم';
}
export const avatarUrl = (p?: string | null) => (p ? 'https://hwlpzlfimplzkdleaclw.supabase.co/storage/v1/object/public/avatars/' + p : '');

export type Crane = {
  id: string; name: string; type: string; lat: number; lng: number; status: string; verified: boolean; is_demo: boolean;
  updated_at: string; rating_avg: number | null; rating_count: number | null; distance_km: number | null;
  governorate: string | null; tier: string | null; avatar: string | null;
};

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

export type Shop = { id: string; lat: number; lng: number; name: string; phone: string; kind: string };
export type Box = [number, number, number, number]; // غرب، جنوب، شرق، شمال

export const KINDS: Record<string, [string, string]> = {
  car_repair: ['تصليح سيارات', '#5AA9FF'], tyres: ['إطارات وبنشر', '#B58CFF'], car_parts: ['قطع غيار', '#FF9F43'],
  mechanic: ['ميكانيكي', '#5AA9FF'], car_electrics: ['كهرباء سيارات', '#FFD76A'], oil_change: ['تبديل زيوت', '#3DD68C'],
};
const SRV = Object.keys(KINDS);
const KEY = 'sanad_shops_cache_v1';
const TTL = 6 * 3600e3;
let mem: Record<string, { t: number; l: Shop[] }> | null = null;

async function load() {
  if (mem) return mem;
  try { mem = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') || {}; } catch { mem = {}; }
  return mem!;
}
async function save() {
  const m = mem ?? {};
  const ks = Object.keys(m);
  if (ks.length > 40) ks.sort((a, b) => m[a].t - m[b].t).slice(0, ks.length - 40).forEach((k) => delete m[k]);
  AsyncStorage.setItem(KEY, JSON.stringify(m)).catch(() => {});
}

// محلات داخل الصندوق: أولاً من الذاكرة (تعمل بدون إنترنت)، وإلا من السيرفر (جدول places + محلات أضافها المستخدمون ووافق عليها المدير).
export async function shopsIn(b: Box): Promise<Shop[]> {
  const r = (n: number) => Math.round(n * 20) / 20;
  const key = [r(b[0]), r(b[1]), r(b[2]), r(b[3])].join(',');
  const m = await load();
  const hit = m[key];
  if (hit && Date.now() - hit.t < TTL) return hit.l;
  try {
    const [a, c] = await Promise.all([
      supabase.rpc('places_in_bbox', { p_west: b[0], p_south: b[1], p_east: b[2], p_north: b[3], p_kinds: SRV, p_limit: 400 }),
      supabase.from('shops').select('id,name,kind,phone,lat,lng').eq('status', 'approved').gte('lat', b[1]).lte('lat', b[3]).gte('lng', b[0]).lte('lng', b[2]).limit(300),
    ]);
    if (a.error && c.error) throw a.error;
    const l: Shop[] = [
      ...((c.data ?? []) as { id: string; name: string; kind: string; phone: string | null; lat: number; lng: number }[]).map((x) => ({ id: 'c' + x.id, lat: +x.lat, lng: +x.lng, name: x.name, phone: x.phone ?? '', kind: x.kind })),
      ...((a.data ?? []) as { id: string; name_ar?: string; name?: string; phone?: string; kind: string; lat: number; lng: number }[]).map((x) => ({ id: 'p' + x.id, lat: +x.lat, lng: +x.lng, name: x.name_ar || x.name || '', phone: x.phone ?? '', kind: x.kind })),
    ];
    m[key] = { t: Date.now(), l };
    save();
    return l;
  } catch {
    return hit ? hit.l : [];
  }
}

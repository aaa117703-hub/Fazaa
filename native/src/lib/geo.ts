import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

export type GeoFail = 'services_off' | 'denied' | 'timeout';
export class GeoError extends Error { constructor(public kind: GeoFail) { super(kind); } }
export type Fix = { latitude: number; longitude: number; approx: boolean };

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });

// تحديد موقع متدرّج: نتأكد من الإذن وخدمة الموقع، ثم نجرّب الدقة المتوسطة (شبكة/GPS)، ثم المنخفضة، ثم آخر موقع معروف.
// هذا يمنع تعليق التطبيق داخل البيوت حيث الدقة العالية (GPS صافي) ما تشتغل.
export async function getFix(): Promise<Fix> {
  let perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted') perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new GeoError('denied');
  if (!(await Location.hasServicesEnabledAsync().catch(() => true))) {
    // أندرويد: نطلب من النظام يشغّل الموقع مباشرة (نافذة موافقة)
    try { await Location.enableNetworkProviderAsync(); } catch { /* ما انشغّل */ }
    if (!(await Location.hasServicesEnabledAsync().catch(() => true))) throw new GeoError('services_off');
  }
  const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(() => null);
  for (const [acc, ms] of [[Location.Accuracy.Balanced, 12000], [Location.Accuracy.Low, 10000]] as const) {
    try {
      const r = await withTimeout(Location.getCurrentPositionAsync({ accuracy: acc }), ms);
      return { latitude: r.coords.latitude, longitude: r.coords.longitude, approx: false };
    } catch { /* نجرّب المستوى التالي */ }
  }
  if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude, approx: true };
  const any = await Location.getLastKnownPositionAsync().catch(() => null);
  if (any) return { latitude: any.coords.latitude, longitude: any.coords.longitude, approx: true };
  throw new GeoError('timeout');
}

// الموقع التقريبي لحالة «متاح»: ما نوقف السائق بسبب دقة GPS.
// الترتيب: قراءة سريعة بدقة منخفضة (مهلة 6 ثواني) ← آخر موقع معروف (حتى ساعة) ← آخر موقع محفوظ للكرين.
export async function getApproxFix(saved?: { latitude: number; longitude: number } | null): Promise<Fix> {
  let granted = false;
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') perm = await Location.requestForegroundPermissionsAsync();
    granted = perm.status === 'granted';
  } catch { granted = false; }
  if (granted) {
    try {
      const r = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), 6000);
      return { latitude: r.coords.latitude, longitude: r.coords.longitude, approx: true };
    } catch { /* نكمّل */ }
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 }).catch(() => null);
    if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude, approx: true };
  }
  if (saved && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) && (saved.latitude !== 0 || saved.longitude !== 0)) {
    return { latitude: saved.latitude, longitude: saved.longitude, approx: true };
  }
  throw new GeoError(granted ? 'timeout' : 'denied');
}

// تقريب الإحداثية لمنزلتين (حوالي كيلومتر): هذا اللي يتخزن ويشوفه الزبون
export const approxCoord = (n: number) => Math.round(n * 100) / 100;

// رسالة واضحة حسب السبب مع زر يفتح إعدادات الجهاز عند الحاجة
export function geoAlert(e: unknown, manualHint = 'أو اختر محافظتك يدوياً.') {
  const k = e instanceof GeoError ? e.kind : 'timeout';
  if (k === 'denied') Alert.alert('الموقع غير مسموح', 'اسمح للتطبيق باستخدام موقعك من إعدادات الجهاز. ' + manualHint, [{ text: 'إلغاء', style: 'cancel' }, { text: 'فتح الإعدادات', onPress: () => Linking.openSettings().catch(() => {}) }]);
  else if (k === 'services_off') Alert.alert('خدمة الموقع مطفية', 'شغّل الموقع (GPS) من إعدادات الجهاز. ' + manualHint, [{ text: 'إلغاء', style: 'cancel' }, { text: 'فتح الإعدادات', onPress: () => Linking.openSettings().catch(() => {}) }]);
  else Alert.alert('الإشارة ضعيفة', 'ما كدرنا نلقى موقعك. اطلع لمكان مفتوح وجرّب مرة ثانية، ' + manualHint);
}

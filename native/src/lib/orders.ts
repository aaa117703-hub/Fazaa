import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/** عدد الطلبات اللي تحتاج انتباهك: طلباتك الجارية كزبون + الواردة والجارية كسائق. */
export async function countAttention(uid: string): Promise<number> {
  const [mine, cr] = await Promise.all([
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('customer_id', uid).in('status', ['open', 'accepted']),
    supabase.from('cranes').select('id').eq('owner_id', uid).limit(10),
  ]);
  let n = mine.count ?? 0;
  const ids = ((cr.data ?? []) as { id: string }[]).map((x) => x.id);
  if (ids.length) {
    const [inc, jobs] = await Promise.all([
      supabase.from('request_targets').select('request_id,requests!inner(status)').in('crane_id', ids).eq('status', 'sent').eq('requests.status', 'open').limit(50),
      supabase.from('requests').select('id', { count: 'exact', head: true }).in('accepted_crane_id', ids).eq('status', 'accepted'),
    ]);
    n += (inc.data?.length ?? 0) + (jobs.count ?? 0);
  }
  return n;
}

async function setIconBadge(n: number) {
  try {
    let p = await Notifications.getPermissionsAsync();
    if (!p.granted && p.canAskAgain && n > 0) p = await Notifications.requestPermissionsAsync({ ios: { allowBadge: true } });
    if (p.granted || p.ios?.allowsBadge) await Notifications.setBadgeCountAsync(n);
  } catch { /* الشارة اختيارية */ }
}

/** يحدّث الرقم كل 12 ثانية والتطبيق مفتوح، وينعكس على أيقونة التطبيق. */
export function useAttentionCount() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!uid) { setN(0); setIconBadge(0); return; }
    let live = true;
    const run = () => countAttention(uid).then((v) => { if (live) { setN(v); setIconBadge(v); } }).catch(() => {});
    run();
    const t = setInterval(run, 12000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
    return () => { live = false; clearInterval(t); sub.remove(); };
  }, [uid]);
  return n;
}

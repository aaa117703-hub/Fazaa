import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';

const TABLES = ['requests', 'request_targets', 'request_offers'];

/** تحديث فوري: أي تغيير يخصّك بالطلبات أو الأهداف أو العروض يشغّل onChange خلال ثوانٍ (بدل انتظار الاستعلام الدوري). */
export function useLive(onChange: () => void, enabled = true) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const kick = () => { if (timer) return; timer = setTimeout(() => { timer = null; try { cb.current(); } catch { /* */ } }, 300); };
    const ch = supabase.channel('live-' + Math.random().toString(36).slice(2, 10));
    for (const t of TABLES) ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, kick);
    ch.subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
  }, [enabled]);
}

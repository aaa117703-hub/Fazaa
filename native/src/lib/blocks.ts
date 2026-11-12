import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from './supabase';

// crane_id -> blocked_user_id (صاحب الكرين)
export async function loadBlocks(): Promise<Record<string, string>> {
  const { data } = await supabase.from('user_blocks').select('blocked_user_id,crane_id');
  const m: Record<string, string> = {};
  (data ?? []).forEach((b: { blocked_user_id: string; crane_id: string | null }) => { if (b.crane_id) m[b.crane_id] = b.blocked_user_id; });
  return m;
}

export function useBlocks() {
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const reload = useCallback(() => { loadBlocks().then(setBlocks).catch(() => {}); }, []);
  useEffect(reload, [reload]);
  return { blocks, reload };
}

export function askBlock(craneId: string, name: string, done?: () => void) {
  Alert.alert('حظر ' + name + '؟', 'ما راح يظهر لك بالقائمة وما راح توصله طلباتك. تكدر تفك الحظر من «حسابي».', [
    { text: 'إلغاء', style: 'cancel' },
    {
      text: 'نعم، احظر', style: 'destructive',
      onPress: async () => {
        const { data: u } = await supabase.auth.getUser();
        const { data: c } = await supabase.from('cranes').select('owner_id').eq('id', craneId).maybeSingle();
        const owner = (c as { owner_id?: string } | null)?.owner_id;
        if (!u.user || !owner) { Alert.alert('تعذّر الحظر'); return; }
        const { error } = await supabase.from('user_blocks').insert({ blocker_id: u.user.id, blocked_user_id: owner, crane_id: craneId });
        if (error) Alert.alert('تعذّر الحظر', 'جرّب مرة ثانية.'); else { Alert.alert('تم الحظر'); done?.(); }
      },
    },
  ]);
}

export async function unblock(ownerId: string) {
  await supabase.from('user_blocks').delete().eq('blocked_user_id', ownerId);
}

import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/** هل هذا الحساب صاحب كرين؟ (لإخفاء أزرار طلب الكرين عنه) */
export function useIsOwner() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [own, setOwn] = useState(false);
  useEffect(() => {
    if (!uid) { setOwn(false); return; }
    let live = true;
    supabase.from('cranes').select('id', { count: 'exact', head: true }).eq('owner_id', uid).then(({ count }) => { if (live) setOwn((count ?? 0) > 0); }, () => {});
    return () => { live = false; };
  }, [uid]);
  return own;
}

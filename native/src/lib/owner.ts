import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type AccountType = 'customer' | 'owner';

/** نوع الحساب: اختيار المستخدم (user_metadata) + إذا عنده كرين مسجّل فهو صاحب كرين دائماً. */
export function useAccount() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const meta = (session?.user.user_metadata?.account_type as AccountType | undefined) ?? 'customer';
  const [hasCrane, setHasCrane] = useState(false);
  useEffect(() => {
    if (!uid) { setHasCrane(false); return; }
    let live = true;
    supabase.from('cranes').select('id', { count: 'exact', head: true }).eq('owner_id', uid).then(({ count }) => { if (live) setHasCrane((count ?? 0) > 0); }, () => {});
    return () => { live = false; };
  }, [uid]);
  const setType = useCallback(async (t: AccountType) => {
    const { error } = await supabase.auth.updateUser({ data: { account_type: t } });
    return !error;
  }, []);
  return { isOwner: hasCrane || meta === 'owner', hasCrane, type: (hasCrane ? 'owner' : meta) as AccountType, setType };
}

export function useIsOwner() { return useAccount().isOwner; }

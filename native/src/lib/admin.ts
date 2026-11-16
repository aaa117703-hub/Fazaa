import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// هل المستخدم مدير؟ (جدول user_roles؛ الصلاحيات الفعلية محمية بقواعد RLS بالسيرفر)
export function useIsAdmin(): boolean {
  const { session } = useAuth();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!session) { setOk(false); return; }
    supabase.from('user_roles').select('role').eq('user_id', session.user.id).then(({ data }) => setOk(!!data?.some((r) => r.role === 'admin')), () => setOk(false));
  }, [session]);
  return ok;
}

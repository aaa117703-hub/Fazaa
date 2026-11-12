import { Alert } from 'react-native';

import { supabase } from './supabase';

const REASONS: [string, string][] = [['no_answer', 'ما رد'], ['wrong_price', 'سعر مختلف'], ['behavior', 'سوء تعامل'], ['fake', 'معلومات مزيفة'], ['other', 'سبب ثاني']];

// إبلاغ عن كرين (craneId) أو عن زبون (userId)
export function report(o: { craneId?: string | null; userId?: string | null; requestId?: string | null }) {
  Alert.alert(o.userId ? 'إبلاغ عن زبون' : 'إبلاغ عن كرين', 'اختر السبب', [
    ...REASONS.map(([k, l]) => ({
      text: l,
      onPress: async () => {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from('reports').insert({ reporter_id: u.user?.id, crane_id: o.craneId ?? null, reported_user_id: o.userId ?? null, request_id: o.requestId ?? null, reason: k, status: 'new' });
        Alert.alert(error ? 'تعذّر' : 'تم', error ? 'تعذّر إرسال البلاغ.' : 'وصل بلاغك للإدارة.');
      },
    })),
    { text: 'إلغاء', style: 'cancel' as const },
  ]);
}

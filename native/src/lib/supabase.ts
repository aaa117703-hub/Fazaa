import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// المفتاح العام (publishable) مخصّص للعميل وآمن للنشر؛ الحماية عبر سياسات RLS.
const URL = 'https://hwlpzlfimplzkdleaclw.supabase.co';
const KEY = 'sb_publishable_8MXXYiGMYODBil-jcNuwWg_fwrowc_a';

export const supabase = createClient(URL, KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

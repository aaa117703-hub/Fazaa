import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from './supabase';

type Ctx = { session: Session | null; ready: boolean };
const AuthCtx = createContext<Ctx>({ session: null, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    const timer = setTimeout(finish, 3500); // لا ننتظر الشبكة أكثر من هذا
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => { clearTimeout(timer); finish(); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={{ session, ready }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

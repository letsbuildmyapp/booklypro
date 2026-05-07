import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "./types";
import { currentUser as readCurrent, subscribe, signInWithEmail, signInWithGoogle, signOut, signUpCustomer } from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: { email: string; displayName: string; phone?: string; password: string }) => Promise<User>;
  signInGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readCurrent());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return subscribe(() => setUser(readCurrent()));
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    signIn: async (email, password) => {
      setLoading(true);
      try { return await signInWithEmail(email, password); }
      finally { setLoading(false); }
    },
    signUp: async (input) => {
      setLoading(true);
      try { return await signUpCustomer(input); }
      finally { setLoading(false); }
    },
    signInGoogle: async () => {
      setLoading(true);
      try { return await signInWithGoogle(); }
      finally { setLoading(false); }
    },
    signOut: async () => { await signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

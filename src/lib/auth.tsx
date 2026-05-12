import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "./types";
import { currentUser as readCurrent, subscribe, signInAs as apiSignInAs, signOut as apiSignOut } from "./api";

interface AuthCtx {
  user: User | null;
  signInAs: (userId: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readCurrent());

  useEffect(() => {
    return subscribe(() => setUser(readCurrent()));
  }, []);

  const value: AuthCtx = {
    user,
    signInAs: async (userId) => apiSignInAs(userId),
    signOut: async () => { await apiSignOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

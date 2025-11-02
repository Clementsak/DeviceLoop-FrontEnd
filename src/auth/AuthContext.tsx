// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, beginLogin, beginLogout, beginSignup } from "../components/api/api";

type User = { sub?: string; email?: string } | null;

type AuthState = {
  user: User;
  loading: boolean;
  login: () => void;
  logout: () => void;
  signup: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null, loading: true,
  login: () => {}, logout: () => {}, signup: () => {}, refresh: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await getMe();
      console.log("[Auth] /api/me ->", res);       // <— watch this in DevTools
      setUser(res.user ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <Ctx.Provider value={{ user, loading, login: beginLogin, logout: beginLogout, signup: beginSignup, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() { return useContext(Ctx); }

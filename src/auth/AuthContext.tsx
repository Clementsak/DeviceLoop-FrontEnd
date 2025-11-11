// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, beginLogin, beginLogout, beginSignup } from "../components/api/api";

export type Role = "buyers" | "sellers" | "admin";

export type Me = {
  sub: string;
  email?: string;
  phone_number?: string;
  role: Role;
  groups: string[];
  verified: boolean;
} | null;

type AuthState = {
  me: Me;
  loading: boolean;
  login: () => void;
  logout: () => void;
  signup: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  me: null,
  loading: true,
  login: () => {},
  logout: () => {},
  signup: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await getMe();
      console.log("[Auth] /api/me ->", res);
      setMe(res.user ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Ctx.Provider value={{ me, loading, login: beginLogin, logout: beginLogout, signup: beginSignup, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

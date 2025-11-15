// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, beginLogin, beginLogout, beginSignup } from "../components/api/api";

export type Role = "buyers" | "sellers" | "admin";

export type Me = {
  sub: string;
  email?: string;
  phone_number?: string;
  groups: string[];
  role: Role;
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

function deriveRole(groups: string[] = []): Role {
  if (groups.includes("admin")) return "admin";
  if (groups.includes("sellers")) return "sellers";
  return "buyers";
}

/** ---------- Type guards for /api/me ---------- */
type RawUser = {
  sub?: unknown;
  email?: unknown;
  phone_number?: unknown;
  groups?: unknown;
  email_verified?: unknown;
  verified?: unknown;
};

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function asRawUser(v: unknown): RawUser | null {
  return isObj(v) ? (v as RawUser) : null;
}
function unwrapMeResponse(res: unknown): RawUser | null {
  // Accept { user: {...} } or just {...}
  if (!isObj(res)) return null;
  if ("user" in res) return asRawUser((res as { user: unknown }).user);
  return asRawUser(res);
}
function normalizeUser(raw: RawUser | null): Me {
  if (!raw || typeof raw.sub !== "string") return null;

  const groups = Array.isArray(raw.groups)
    ? raw.groups.filter((g): g is string => typeof g === "string")
    : [];

  const verified =
    typeof raw.verified === "boolean"
      ? raw.verified
      : typeof raw.email_verified === "boolean"
      ? raw.email_verified
      : false;

  return {
    sub: raw.sub,
    email: typeof raw.email === "string" ? raw.email : undefined,
    phone_number:
      typeof raw.phone_number === "string" ? raw.phone_number : undefined,
    groups,
    role: deriveRole(groups),
    verified,
  };
}
/** ------------------------------------------- */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res: unknown = await getMe(); // treat as unknown
      const raw = unwrapMeResponse(res);
      const normalized = normalizeUser(raw);
      setMe(normalized);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Ctx.Provider
      value={{
        me,
        loading,
        login: beginLogin,
        logout: beginLogout,
        signup: beginSignup,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

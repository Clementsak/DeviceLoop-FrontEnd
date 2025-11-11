// src/components/api/api.ts
const API = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

type MeResponse = {
  user: {
    sub: string;
    email?: string;
    phone_number?: string;
    role: "buyers" | "sellers" | "admin";
    groups: string[];
    verified: boolean;
  } | null;
};

export async function getMe() {
  const r = await fetch(`${API}/api/me`, { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new Error(`GET /api/me ${r.status}`);
  return (await r.json()) as MeResponse;
}

export function beginLogin()  { window.location.href = `${API}/auth/login`; }
export function beginLogout() { window.location.href = `${API}/auth/logout`; }
export function beginSignup() { window.location.href = `${API}/auth/signup`; }

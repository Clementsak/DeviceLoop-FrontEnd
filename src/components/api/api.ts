const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

export async function getMe() {
  const r = await fetch(`${API}/api/me`, { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new Error(`GET /api/me ${r.status}`);
  return r.json() as Promise<{ user: { sub?: string; email?: string } | null }>;
}


export function beginLogin()  { window.location.href = `${API}/auth/login`; }
export function beginLogout() { window.location.href = `${API}/auth/logout`; }
export function beginSignup() { window.location.href = `${API}/auth/signup`; } // <-- new

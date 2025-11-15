// src/components/api/api.ts

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

async function handleJson(res: Response) {
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export const api = {
  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleJson(res);
  },

  async post<T = any>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleJson(res);
  },

  async put<T = any>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleJson(res);
  },
};

// ===== Auth / /api/me helpers (used by AuthContext etc.) =====

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

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/api/me");
}

export function beginLogin() {
  window.location.href = `${API_BASE}/auth/login`;
}
export function beginLogout() {
  window.location.href = `${API_BASE}/auth/logout`;
}
export function beginSignup() {
  window.location.href = `${API_BASE}/auth/signup`;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
  }

  return (await res.json()) as T;
}

export function api_get<T>(path: string) {
  return request<T>(path);
}

export function api_post<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
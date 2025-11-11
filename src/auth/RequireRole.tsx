// src/auth/RequireRole.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { ReactNode } from "react";

type Role = "buyers" | "sellers" | "admin";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return null; // could show a spinner
  if (!me) return <Navigate to="/" replace />;
  if (me.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

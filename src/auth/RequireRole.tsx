// src/auth/RequireRole.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { ReactNode } from "react";
import type { Role } from "./AuthContext";

type Props = {
  role?: Role;          // single role
  roles?: Role[];       // or many roles (any-match)
  children: ReactNode;
};

export default function RequireRole({ role, roles, children }: Props) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!me) return <Navigate to="/" state={{ from: location }} replace />;

  const allowed: Role[] = roles ?? (role ? [role] : []);
  // Admins can see seller pages too
  const isAdmin = me.groups.includes("admin");
  const ok = isAdmin || allowed.length === 0 || allowed.some(r => me.groups.includes(r));

  if (!ok) return <Navigate to="/" replace />;
  return <>{children}</>;
}

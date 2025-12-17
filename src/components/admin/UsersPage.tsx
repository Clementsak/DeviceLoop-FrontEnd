// src/components/admin/UsersPage.tsx
import { useEffect, useState } from "react";
import {
  type AdminUser, adminListUsers, adminChangeRole, adminDeleteUser,
} from "../api/admin/admin";

type Role = "buyers" | "sellers" | "admin";
type Verified = "pending" | "verified" | "rejected";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("buyers");
  const [verified, setVerified] = useState<Verified | "">("");
  const [limit, setLimit] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchPage(cur: string | null = null) {
    setLoading(true);
    try {
      const res = await adminListUsers({
        q: q.trim() || undefined,
        role: role || undefined,
        verified: verified || undefined,
        limit, cursor: cur || undefined,
      });
      setRows(res.items);
      setNextCursor(res.cursor ?? null);
      setCursor(cur ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPage(null); /* reset when filters change */ },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, role, verified, limit]);

  const canPrev = !!cursor;
  const canNext = !!nextCursor;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid md:grid-cols-5 gap-3">
        <input
  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 md:col-span-2"
          placeholder="Search USER#001 or email"
          value={q} onChange={e => setQ(e.target.value)}
        />
        <select className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-slate-900"
          value={role} onChange={e => setRole(e.target.value as Role | "")}>
          <option value="buyers">buyers</option>
          <option value="sellers">sellers</option>
          <option value="admin">admin</option>
        </select>
        <select className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-slate-900"
          value={verified} onChange={e => setVerified(e.target.value as Verified | "")}>
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="verified">verified</option>
          <option value="rejected">rejected</option>
        </select>
        <select className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-slate-900"
          value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
          {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
        </select>
      </div>

      {/* Table */}
<div className="rounded-2xl border border-emerald-100 bg-white/80 overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm text-slate-900">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="p-3 w-[160px]">UserID</th>
              <th className="p-3">Email</th>
              <th className="p-3 w-[140px]">Role</th>
              <th className="p-3 w-[120px]">Verified</th>
              <th className="p-3 w-[180px]">Last Login</th>
              <th className="p-3 w-[140px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.user_pk} className="border-t border-slate-100">
                <td className="p-3 font-mono">{u.user_pk}</td>
                <td className="p-3">{u.email ?? "-"}</td>
                <td className="p-3">
                  <RolePicker role={u.role} onChange={r => adminChangeRole(u.user_pk, r).then(() => fetchPage(cursor))} />
                </td>
                <td className="p-3">
                  <StatusPill status={u.verifiedStatus} />
                </td>
                <td className="p-3">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "-"}</td>
                <td className="p-3 text-right">
                  <button
                    className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                    onClick={() => {
                      if (confirm(`Delete ${u.user_pk}?`)) {
                        adminDeleteUser(u.user_pk).then(() => fetchPage(cursor));
                      }
                    }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={6} className="p-6 text-center text-black/60">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-black/60 text-sm">
          {cursor ? "Page (next cursor in use)" : "First page"}
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-white/10 disabled:opacity-50"
            disabled={!canPrev}
            onClick={() => fetchPage(null)}
            title="Back to first page"
          >Reset</button>
          <button
            className="px-3 py-1 rounded bg-white/10 disabled:opacity-50"
            disabled={!canNext}
            onClick={() => fetchPage(nextCursor!)}
          >Next</button>
        </div>
      </div>
    </div>
  );
}

function RolePicker({ role, onChange }: { role: Role; onChange: (r: "buyers"|"sellers") => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="px-2 py-1 rounded bg-white/10">{role}</span>
      {(role === "buyers" || role === "sellers") && (
        <select
          className="rounded bg-white/10 px-2 py-1"
          value={role}
          onChange={e => onChange(e.target.value as "buyers"|"sellers")}
        >
          <option value="buyers">buyers</option>
          <option value="sellers">sellers</option>
        </select>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Verified }) {
  const base = "px-2 py-1 rounded text-xs";
  const cls =
    status === "verified" ? "bg-emerald-700" :
    status === "rejected" ? "bg-red-700" : "bg-yellow-700";
  return <span className={`${base} ${cls}`}>{status}</span>;
}

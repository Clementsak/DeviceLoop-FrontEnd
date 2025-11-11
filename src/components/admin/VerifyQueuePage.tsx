// src/components/admin/VerifyQueuePage.tsx
import { useEffect, useState } from "react";
import {
  type VerifyQueueItem, adminGetVerifyQueue, adminVerifyDecision,
} from "../api/admin";

export default function VerifyQueuePage({ kind }: { kind: "user" | "seller" }) {
  const [rows, setRows] = useState<VerifyQueueItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchPage(cur: string | null = null) {
    setLoading(true);
    try {
      const res = await adminGetVerifyQueue(kind, 25, cur || undefined);
      setRows(res.items);
      setNextCursor(res.cursor ?? null);
      setCursor(cur ?? null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchPage(null); }, [kind]);

  async function decide(u: VerifyQueueItem, decision: "approve" | "reject") {
    const reason = decision === "reject" ? prompt("Reason (optional):") ?? "" : undefined;
    await adminVerifyDecision(u.user_pk, kind, decision, reason);
    await fetchPage(cursor);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pending {kind === "user" ? "User" : "Seller"} Verifications</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-white/10" onClick={() => fetchPage(null)}>Reset</button>
          <button className="px-3 py-1 rounded bg-white/10 disabled:opacity-50"
            disabled={!nextCursor} onClick={() => fetchPage(nextCursor!)}>Next</button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="p-3 w-[160px]">UserID</th>
              <th className="p-3 w-[200px]">Submitted</th>
              <th className="p-3">Details</th>
              <th className="p-3 w-[220px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={`${u.user_pk}-${u.submittedAt}`} className="border-t border-white/10">
                <td className="p-3 font-mono">{u.user_pk}</td>
                <td className="p-3">{u.submittedAt ? new Date(u.submittedAt).toLocaleString() : "-"}</td>
                <td className="p-3">
                  <JsonPreview obj={u.type === "VerifySeller" ? u.sellerProfile : u.data} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600"
                      onClick={() => decide(u, "approve")}>Approve</button>
                    <button className="px-3 py-1 rounded bg-red-700 hover:bg-red-600"
                      onClick={() => decide(u, "reject")}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={4} className="p-6 text-center text-white/60">No pending requests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JsonPreview({ obj }: { obj?: Record<string, any> }) {
  if (!obj) return <span className="text-white/60">-</span>;
  const text = JSON.stringify(obj, null, 2);
  return (
    <pre className="bg-white/5 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">{text}</pre>
  );
}

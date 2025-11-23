// src/components/admin/VerifyQueuePage.tsx
import { useEffect, useState } from "react";
import {
  type VerifyQueueItem,
  adminGetVerifyQueue,
  adminVerifyDecision,
} from "../api/admin/admin";

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

  useEffect(() => {
    void fetchPage(null);
    // re-run whenever kind switches between "user" and "seller"
  }, [kind]);

  async function decide(item: VerifyQueueItem, decision: "approve" | "reject") {
    let reason: string | undefined;
    if (decision === "reject") {
      reason = prompt("Reason (optional):") ?? "";
    }
    await adminVerifyDecision(item.user_pk, kind, decision, reason);
    await fetchPage(cursor);
  }

  const title =
    kind === "user" ? "Buyer verification requests" : "Seller registration requests";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-white/10"
            onClick={() => fetchPage(null)}
          >
            Reset
          </button>
          <button
            className="px-3 py-1 rounded bg-white/10 disabled:opacity-50"
            disabled={!nextCursor}
            onClick={() => fetchPage(nextCursor!)}
          >
            Next
          </button>
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
            {rows.map(item => (
              <tr
                key={`${item.user_pk}-${item.submittedAt}`}
                className="border-t border-white/10 align-top"
              >
                <td className="p-3 font-mono">{item.user_pk}</td>
                <td className="p-3">
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleString()
                    : "-"}
                </td>
                <td className="p-3">
                  {item.type === "VerifySeller" ? (
                    <SellerDetails seller={item.sellerProfile} />
                  ) : (
                    <UserDetails data={item.data} />
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600"
                      onClick={() => decide(item, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-red-700 hover:bg-red-600"
                      onClick={() => decide(item, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-white/60">
                  No pending requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Buyer verification details: location, Cognito info, etc. */
function UserDetails({ data }: { data?: any }) {
  if (!data) {
    return <span className="text-white/60">No data.</span>;
  }

  const coords = data.coords || {};
  const place = data.place || {};
  const email = data.cognitoEmail;
  const address = data.cognitoAddress;
  const ip = data.ip;

  const hasCoords = coords.lat != null && coords.lon != null;

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      <div>
        <span className="font-semibold">Email:</span>{" "}
        {email || <span className="text-white/60">-</span>}
      </div>
      <div>
        <span className="font-semibold">Cognito address:</span>{" "}
        {address || <span className="text-white/60">-</span>}
      </div>
      <div>
        <span className="font-semibold">IP:</span>{" "}
        {ip || <span className="text-white/60">-</span>}
      </div>

      <div className="mt-2 font-semibold">Location snapshot</div>
      <div className="ml-2 space-y-1">
        <div>
          Lat:{" "}
          {coords.lat != null ? (
            <span className="font-mono">{String(coords.lat)}</span>
          ) : (
            <span className="text-white/60">-</span>
          )}
        </div>
        <div>
          Lon:{" "}
          {coords.lon != null ? (
            <span className="font-mono">{String(coords.lon)}</span>
          ) : (
            <span className="text-white/60">-</span>
          )}
        </div>
        <div>
          Accuracy:{" "}
          {coords.accuracy != null ? (
            <span>{String(coords.accuracy)} m</span>
          ) : (
            <span className="text-white/60">-</span>
          )}
        </div>

        {hasCoords && (
          <div className="mt-1">
            <a
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lon}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 underline"
            >
              View on map
            </a>
          </div>
        )}
      </div>

      {place && place.label && (
        <div className="mt-2">
          <div className="font-semibold">Resolved address (Amazon Web Services)</div>
          <div className="ml-2">
            {place.label}
            {place.postalCode && `, ${place.postalCode}`}
          </div>
        </div>
      )}
    </div>
  );
}

/** Seller registration details: organisation info from SellerRegisterPage */
function SellerDetails({ seller }: { seller?: any }) {
  if (!seller) {
    return <span className="text-white/60">No seller profile.</span>;
  }

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      <div>
        <span className="font-semibold">Organisation:</span>{" "}
        {seller.organisationName || <span className="text-white/60">-</span>}
      </div>
      <div>
        <span className="font-semibold">Address:</span>{" "}
        {seller.address || <span className="text-white/60">-</span>}
      </div>
      <div>
        <span className="font-semibold">Email:</span>{" "}
        {seller.contactEmail || <span className="text-white/60">-</span>}
      </div>
      <div>
        <span className="font-semibold">Phone:</span>{" "}
        {seller.contactPhone || <span className="text-white/60">-</span>}
      </div>
      {seller.organisationRegNo && (
        <div>
          <span className="font-semibold">Registration No.:</span>{" "}
          {seller.organisationRegNo}
        </div>
      )}
      {seller.notes && (
        <div>
          <span className="font-semibold">Notes:</span> {seller.notes}
        </div>
      )}
      {seller.submittedAt && (
        <div className="text-white/60">
          Submitted details at {new Date(seller.submittedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

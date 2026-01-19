// src/components/seller/SellerListings.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5000";

type ListingStatus =
  | "unverified"
  | "verified"
  | "rejected"
  | "cancelled"
  | "active"
  | "ended"
  | "expired";

type AuctionMode = "continuous" | "interval" | "end_of_window";

type ListingItem = {
  ListingId: string;
  Category: string;
  Brand: string;
  Model: string;
  Variant?: string | null;
  Storage?: string | null;
  RAM?: string | null;

  Status: ListingStatus;

  InitialGrade?: string | null;
  InitialMin?: number | null;
  InitialMax?: number | null;

  FinalGrade?: string | null;
  FinalMin?: number | null;
  FinalMax?: number | null;

  ReviewRound?: number;
  ReviewReason?: string | null;

  SellerMin?: number | null;
  SellerMax?: number | null;
  DurationHours?: number | null;
  AuctionStartsAt?: string | null;
  AuctionEndsAt?: string | null;

  CurrentHighestBid?: number | null;
  CurrentHighestBidderPK?: string | null;
  MarketKey?: string | null;
  AuctionMode?: AuctionMode | null;
};

type ListingOverviewResponse = {
  requests: ListingItem[];
  listings: ListingItem[];
};



export function SellerListings() {
  const [requests, setRequests] = useState<ListingItem[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [acceptTarget, setAcceptTarget] = useState<ListingItem | null>(null);
  const [acceptMin, setAcceptMin] = useState("");
  const [acceptMax, setAcceptMax] = useState("");
  const [acceptDuration, setAcceptDuration] = useState<number>(24);
  const [acceptMode, setAcceptMode] = useState<AuctionMode>("continuous");
  const [busy, setBusy] = useState(false);
  const [rejectedTarget, setRejectedTarget] = useState<ListingItem | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const navigate = useNavigate();
  const goToDetails = (listingId: string) => {
    navigate(`/listings/${encodeURIComponent(listingId)}`);
  };
  const [listingFilter, setListingFilter] = useState<"active" | "matched" | "expired" | "ended" | "all">("active");
  const [requestFilter, setRequestFilter] = useState<"pending" | "unverified" | "verified" | "rejected" | "cancelled" | "all">("unverified");

  const filteredRequests = requestFilter === "all"
    ? requests
    : requests.filter(item => item.Status === requestFilter);

  const filteredListings = (() => {
    if (listingFilter === "all") return listings;

    if (listingFilter === "active") return listings.filter(l => l.Status === "active");

    if (listingFilter === "expired") return listings.filter(l => l.Status === "expired");

    if (listingFilter === "ended") return listings.filter(l => l.Status === "ended");

    // "matched"
    // Minimal logic: treat "ended" + has a buyer as matched (see optional backend improvement below)
    // "matched" (minimal definition): ended + has a highest bidder
    return listings.filter(item => item.Status === "ended" && !!item.CurrentHighestBidderPK);
  })();

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000); // update every 30 seconds
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/seller/listing-requests`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as ListingOverviewResponse;
      setRequests(json.requests || []);
      setListings(json.listings || []);
    } catch (e: any) {
      console.error(e);
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function cancelRequest(id: string) {
    if (!window.confirm("Cancel this listing request?")) return;
    setBusy(true);
    try {
      const encoded = encodeURIComponent(id);
      const r = await fetch(`${API_BASE}/seller/listing-requests/${encoded}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function requestReview(id: string, round: number | undefined) {
    if (round && round >= 3) {
      alert("You have reached the maximum review rounds.");
      return;
    }
    if (!window.confirm("Request another admin to review this listing?")) return;
    setBusy(true);
    try {
      const encoded = encodeURIComponent(id);
      const r = await fetch(`${API_BASE}/seller/listing-requests/${encoded}/request-review`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function openAcceptModal(item: ListingItem) {
    const baseMin = item.FinalMin ?? item.InitialMin ?? 0;
    const baseMax = item.FinalMax ?? item.InitialMax ?? 0;
    setAcceptTarget(item);
    setAcceptMin(baseMin ? String(baseMin) : "");
    setAcceptMax(baseMax ? String(baseMax) : "");
    setAcceptDuration(item.DurationHours || 24);
    setAcceptMode(item.AuctionMode ?? "continuous");
  }

  async function submitAccept() {
    if (!acceptTarget) return;
    const min = Number(acceptMin);
    const max = Number(acceptMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > max) {
      alert("Please enter a valid price range.");
      return;
    }

    setBusy(true);
    try {
      const body = { sellerMin: min, sellerMax: max, durationHours: acceptDuration, auctionMode: acceptMode };
      const encodedId = encodeURIComponent(acceptTarget.ListingId);
      const r = await fetch(`${API_BASE}/seller/listing-requests/${encodedId}/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((json as any).error || `HTTP ${r.status}`);
      setAcceptTarget(null);
      await refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function formatDevice(item: ListingItem) {
    const storage = (item.Storage || "").trim();
    const ram = (item.RAM || "").trim();
    const suffix =
      storage && ram ? ` (${storage} / ${ram})` : storage ? ` (${storage})` : "";
    return `${item.Brand} ${item.Model}${suffix}`;
  }

  function formatDuration(hours: number | null | undefined) {
    switch (hours) {
      case 6:
        return "6 hours";
      case 12:
        return "12 hours";
      case 24:
        return "1 day";
      case 72:
        return "3 days";
      default:
        return "-";
    }
  }

  function formatCountdown(item: ListingItem, nowMs: number) {
    const endsIso = item.AuctionEndsAt;
    let endTimeMs: number | null = null;

    if (endsIso) {
      const t = Date.parse(endsIso);
      if (!Number.isNaN(t)) endTimeMs = t;
    } else if (item.AuctionStartsAt && item.DurationHours) {
      const startMs = Date.parse(item.AuctionStartsAt);
      if (!Number.isNaN(startMs)) {
        endTimeMs = startMs + item.DurationHours * 60 * 60 * 1000;
      }
    }

    if (endTimeMs == null) {
      return formatDuration(item.DurationHours ?? null);
    }

    const diffMs = endTimeMs - nowMs;
    if (diffMs <= 0) return "Ended";

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Listings</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || busy}
            className="rounded-xl border border-forest-200 bg-white px-4 py-2 text-sm font-medium text-forest-800 hover:bg-forest-50 disabled:opacity-60"
            title="Reload the latest listing and request statuses"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            to="/seller/listings/new"
            className="rounded-xl bg-forest-500 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600"
          >
            + New listing
          </Link>
        </div>
      </div>

      {err && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <>
          {/* Ongoing listings */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ongoing listings</h2>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm text-gray-700">Listing status</label>
              <select
                className="border rounded px-2 py-1"
                value={listingFilter}
                onChange={(e) => setListingFilter(e.target.value as any)}
              >
                <option value="active">Active (ongoing)</option>
                <option value="matched">Matched</option>
                <option value="expired">Expired</option>
                <option value="all">All</option>
              </select>
            </div>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredListings.map((item) => {
                const grade = item.FinalGrade ?? item.InitialGrade ?? "-";
                const priceRange =
                  typeof item.SellerMin === "number" && typeof item.SellerMax === "number"
                    ? `RM ${item.SellerMin.toFixed(2)} – RM ${item.SellerMax.toFixed(2)}`
                    : "-";
                const highestBid =
                  typeof item.CurrentHighestBid === "number"
                    ? `RM ${item.CurrentHighestBid.toFixed(2)}`
                    : "-";

                return (
                  <div
                    key={item.ListingId}
                    className="rounded-2xl border border-forest-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-forest-900">{formatDevice(item)}</div>
                        <div className="mt-0.5 text-xs text-forest-700">
                          {item.Category} • Grade {grade}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-forest-100 px-2.5 py-1 text-xs font-semibold text-forest-800 ring-1 ring-forest-200 capitalize">
                        {item.Status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-forest-700">Auction mode</div>
                        <div className="text-forest-900">{item.AuctionMode ?? "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-forest-700">Duration</div>
                        <div className="text-forest-900">{formatCountdown(item, nowMs)}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-semibold text-forest-700">Seller price range</div>
                        <div className="text-forest-900">{priceRange}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-forest-700">Highest bid</div>
                        <div className="text-forest-900">{highestBid}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-forest-700">Highest bidder</div>
                        <div className="text-forest-900">
                          {item.CurrentHighestBidderPK ? maskUser(item.CurrentHighestBidderPK) : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        className="w-full rounded-xl bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600"
                        onClick={() => goToDetails(item.ListingId)}
                      >
                        View details
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredListings.length === 0 && (
                <div className="rounded-2xl border border-forest-200 bg-white p-4 text-sm text-forest-700">
                  You do not have any active or ended listings yet.
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-forest-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-forest-50 text-xs uppercase text-forest-700">
                  <tr>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Auction mode</th>
                    <th className="px-3 py-2">Seller price range</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Highest bid</th>
                    <th className="px-3 py-2">Highest bidder</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((item) => {
                    const grade = item.FinalGrade ?? item.InitialGrade ?? "-";
                    const priceRange =
                      typeof item.SellerMin === "number" && typeof item.SellerMax === "number"
                        ? `RM ${item.SellerMin.toFixed(2)} – RM ${item.SellerMax.toFixed(2)}`
                        : "-";
                    const highestBid =
                      typeof item.CurrentHighestBid === "number"
                        ? `RM ${item.CurrentHighestBid.toFixed(2)}`
                        : "-";

                    return (
                      <tr key={item.ListingId} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.Category}</td>
                        <td className="px-3 py-2">{formatDevice(item)}</td>
                        <td className="px-3 py-2">{grade}</td>
                        <td className="px-3 py-2">{item.AuctionMode ?? "-"}</td>
                        <td className="px-3 py-2">{priceRange}</td>
                        <td className="px-3 py-2 capitalize">{item.Status}</td>
                        <td className="px-3 py-2">{formatCountdown(item, nowMs)}</td>
                        <td className="px-3 py-2">{highestBid}</td>
                        <td className="px-3 py-2">
                          {item.CurrentHighestBidderPK ? maskUser(item.CurrentHighestBidderPK) : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="rounded-xl bg-forest-500 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-600"
                            onClick={() => goToDetails(item.ListingId)}
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredListings.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-sm text-forest-700" colSpan={10}>
                        You do not have any active or ended listings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </section>

          {/* Listing requests */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Listing requests</h2>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm text-gray-700">Listing status</label>
              <select
                className="border rounded px-2 py-1"
                value={requestFilter}
                onChange={(e) => setRequestFilter(e.target.value as any)}
              >
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All</option>
              </select>

            </div>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredRequests.map((item) => {
                const rawMin = item.FinalMin ?? item.InitialMin;
                const rawMax = item.FinalMax ?? item.InitialMax;

                const platformMin = rawMin !== undefined && rawMin !== null ? Number(rawMin) : null;
                const platformMax = rawMax !== undefined && rawMax !== null ? Number(rawMax) : null;

                const priceRange =
                  platformMin !== null &&
                    !Number.isNaN(platformMin) &&
                    platformMax !== null &&
                    !Number.isNaN(platformMax)
                    ? `RM ${platformMin.toFixed(2)} – RM ${platformMax.toFixed(2)}`
                    : "-";

                const round = item.ReviewRound ?? 1;
                const canRequestReview = item.Status === "verified" && round < 3;
                const canAccept = item.Status === "verified";
                const canCancel = item.Status === "unverified" || item.Status === "verified";

                return (
                  <div
                    key={item.ListingId}
                    className="rounded-2xl border border-forest-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-forest-900">{formatDevice(item)}</div>
                        <div className="mt-0.5 text-xs text-forest-700">{item.Category}</div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-forest-100 px-2.5 py-1 text-xs font-semibold text-forest-800 ring-1 ring-forest-200 capitalize">
                        {item.Status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-forest-700">Initial grade</div>
                        <div className="text-forest-900">{item.InitialGrade ?? "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-forest-700">Verified grade</div>
                        <div className="text-forest-900">{item.FinalGrade ?? "-"}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-semibold text-forest-700">Platform price range</div>
                        <div className="text-forest-900">{priceRange}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-forest-700">Round</div>
                        <div className="text-forest-900">{round}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      {canAccept && (
                        <button
                          className="w-full rounded-xl bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
                          onClick={() => openAcceptModal(item)}
                          disabled={busy}
                        >
                          Accept and list
                        </button>
                      )}

                      {canRequestReview && (
                        <button
                          className="w-full rounded-xl border border-forest-200 bg-white px-4 py-2 text-sm font-semibold text-forest-800 hover:bg-forest-50 disabled:opacity-60"
                          onClick={() => requestReview(item.ListingId, item.ReviewRound)}
                          disabled={busy}
                        >
                          Request another review
                        </button>
                      )}

                      {canCancel && (
                        <button
                          className="w-full rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          onClick={() => cancelRequest(item.ListingId)}
                          disabled={busy}
                        >
                          Cancel
                        </button>
                      )}

                      {item.Status === "rejected" && (
                        <button
                          type="button"
                          className="w-full rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          onClick={() => setRejectedTarget(item)}
                          disabled={busy}
                        >
                          Rejected
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredRequests.length === 0 && (
                <div className="rounded-2xl border border-forest-200 bg-white p-4 text-sm text-forest-700">
                  You do not have any listing requests yet.
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-forest-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-forest-50 text-xs uppercase text-forest-700">
                  <tr>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Initial grade</th>
                    <th className="px-3 py-2">Verified grade</th>
                    <th className="px-3 py-2">Platform price range</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Round</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((item) => {
                    const rawMin = item.FinalMin ?? item.InitialMin;
                    const rawMax = item.FinalMax ?? item.InitialMax;

                    const platformMin = rawMin !== undefined && rawMin !== null ? Number(rawMin) : null;
                    const platformMax = rawMax !== undefined && rawMax !== null ? Number(rawMax) : null;

                    const priceRange =
                      platformMin !== null &&
                        !Number.isNaN(platformMin) &&
                        platformMax !== null &&
                        !Number.isNaN(platformMax)
                        ? `RM ${platformMin.toFixed(2)} – RM ${platformMax.toFixed(2)}`
                        : "-";

                    const round = item.ReviewRound ?? 1;
                    const canRequestReview = item.Status === "verified" && round < 3;
                    const canAccept = item.Status === "verified";
                    const canCancel = item.Status === "unverified" || item.Status === "verified";

                    return (
                      <tr key={item.ListingId} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.Category}</td>
                        <td className="px-3 py-2">{formatDevice(item)}</td>
                        <td className="px-3 py-2">{item.InitialGrade ?? "-"}</td>
                        <td className="px-3 py-2">{item.FinalGrade ?? "-"}</td>
                        <td className="px-3 py-2">{priceRange}</td>
                        <td className="px-3 py-2 capitalize">{item.Status}</td>
                        <td className="px-3 py-2">{round}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2 text-xs">
                            {canAccept && (
                              <button
                                className="rounded-xl bg-forest-500 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
                                onClick={() => openAcceptModal(item)}
                                disabled={busy}
                              >
                                Accept and list
                              </button>
                            )}
                            {canRequestReview && (
                              <button
                                className="rounded-xl border border-forest-200 bg-white px-3 py-2 text-sm font-semibold text-forest-800 hover:bg-forest-50 disabled:opacity-60"
                                onClick={() => requestReview(item.ListingId, item.ReviewRound)}
                                disabled={busy}
                              >
                                Request another review
                              </button>
                            )}
                            {canCancel && (
                              <button
                                className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                onClick={() => cancelRequest(item.ListingId)}
                                disabled={busy}
                              >
                                Cancel
                              </button>
                            )}
                            {item.Status === "rejected" && (
                              <button
                                type="button"
                                className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                onClick={() => setRejectedTarget(item)}
                                disabled={busy}
                              >
                                Rejected
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-sm text-forest-700" colSpan={8}>
                        You do not have any listing requests yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </section>
        </>
      )}

      {/* Accept & list modal */}
      {acceptTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">Set your price range and duration</h3>
            <p className="mb-4 text-sm text-gray-600">
              Platform verified range:{" "}
              {acceptTarget.FinalMin ?? acceptTarget.InitialMin} –{" "}
              {acceptTarget.FinalMax ?? acceptTarget.InitialMax} (RM).
              <br />
              Your range must stay within this window.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span>Min price (RM)</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border px-3 py-2"
                    value={acceptMin}
                    onChange={e => setAcceptMin(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Max price (RM)</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border px-3 py-2"
                    value={acceptMax}
                    onChange={e => setAcceptMax(e.target.value)}
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span>Duration</span>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={acceptDuration}
                  onChange={e => setAcceptDuration(Number(e.target.value))}
                >
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>1 day</option>
                  <option value={72}>3 days</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span>Auction mode</span>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={acceptMode}
                  onChange={e => setAcceptMode(e.target.value as AuctionMode)}
                >
                  <option value="continuous">Continuous (instant match)</option>
                  <option value="interval">Interval (batch every X minutes)</option>
                  <option value="end_of_window">End of window only</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setAcceptTarget(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-forest-500 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50"
                onClick={submitAccept}
                disabled={busy}
              >
                Confirm & list
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rejected details modal */}
      {rejectedTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">Listing rejected</h3>
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setRejectedTarget(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <div className="text-gray-500 text-xs">Device</div>
              <div className="font-medium">{formatDevice(rejectedTarget)}</div>
              <div className="text-xs text-gray-600">
                Category: {rejectedTarget.Category}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Initial grade</div>
                <div className="font-semibold">
                  {rejectedTarget.InitialGrade ?? "-"}
                </div>
              </div>
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Final grade</div>
                <div className="font-semibold text-red-600">
                  {rejectedTarget.FinalGrade ?? "-"}
                </div>
              </div>
            </div>

            <div className="border rounded-xl p-3 text-sm">
              <div className="text-xs text-gray-500 mb-1">Reason</div>
              <div>
                {rejectedTarget.ReviewReason?.trim()
                  ? rejectedTarget.ReviewReason
                  : "No reason was provided."}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setRejectedTarget(null)}
              >
                Close
              </button>

              {(rejectedTarget.ReviewRound ?? 1) < 3 && (
                <button
                  type="button"
                  className="rounded-xl bg-forest-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-600"
                  onClick={() => {
                    setRejectedTarget(null);
                    // reuse the same requestReview flow
                    requestReview(rejectedTarget.ListingId, rejectedTarget.ReviewRound);
                  }}
                  disabled={busy}
                >
                  Request another review
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function maskUser(pk: string) {
  if (!pk) return "-";
  if (pk.length <= 4) return pk;
  return pk.slice(0, 2) + "***" + pk.slice(-2);
}

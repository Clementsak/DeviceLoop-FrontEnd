import { useEffect, useMemo, useState } from "react";
import {
  type AdminListingRequest,
  type AdminListingDetail,
  type ListingStatus,
  adminListListingRequests,
  adminGetListingDetail,
  adminDecideListing,
  adminSignGetImage,
} from "../api/admin/listing"; // adjust path if needed

type StatusFilter = ListingStatus | "all";

const STATUS_LABELS: { value: StatusFilter; label: string }[] = [
  { value: "unverified", label: "Pending" },
  { value: "verified", label: "Verified (not activated)" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const GRADE_OPTIONS = [
  { value: "", label: "Select grade…" },
  { value: "A", label: "Grade A" },
  { value: "B", label: "Grade B" },
  { value: "C", label: "Grade C" },
] as const;

export default function AdminListingRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("unverified");
  const [items, setItems] = useState<AdminListingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminListingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  const [finalGrade, setFinalGrade] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const selectedRow = useMemo(
    () => items.find(it => it.listingId === selectedId) || null,
    [items, selectedId]
  );
  const isPending = selectedRow?.status === "unverified";


  // load table
  async function loadTable() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListListingRequests(statusFilter);
      setItems(res);
      // reset selection if it disappeared
      if (selectedId && !res.some(it => it.listingId === selectedId)) {
        setSelectedId(null);
        setDetail(null);
        setPhotoUrls({});
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load listing requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // load detail (including photos) when selection changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setPhotoUrls({});
      return;
    }

    const id = selectedId as string;

    async function fetchDetail() {
      setDetailLoading(true);
      setDecisionError(null);
      setDecisionSuccess(null);
      try {
        const d = await adminGetListingDetail(id);
        setDetail(d);

        // seed decision defaults
        const initGrade = (d.finalGrade || d.initialGrade || "") as string;
        setFinalGrade(initGrade);
        setReason((d as any).ReviewReason ?? "");

        // load photos
        const pm = (d as any).Photos || {};
        const entries = Object.entries(pm).filter(
          ([, key]) => typeof key === "string" && key
        ) as [string, string][];

        const out: Record<string, string> = {};
        for (const [label, key] of entries) {
          try {
            const url = await adminSignGetImage(key);
            out[label] = url;
          } catch {
            // skip single failure
          }
        }
        setPhotoUrls(out);
      } catch (err: any) {
        setDetail(null);
        setPhotoUrls({});
        setDecisionError(err.message ?? "Failed to load listing detail.");
      } finally {
        setDetailLoading(false);
      }
    }

    void fetchDetail();
  }, [selectedId]);

  async function handleApprove() {
    if (selectedRow?.status !== "unverified") {
      setDecisionError("You can only approve or reject listings that are pending.");
      return;
    }

    if (!selectedId || !detail) return;
    setDecisionLoading(true);
    setDecisionError(null);
    setDecisionSuccess(null);

    const grade = finalGrade.trim().toUpperCase();

    if (!grade) {
      setDecisionError("Please select a final grade before approving.");
      setDecisionLoading(false);
      return;
    }
    if (!["A", "B", "C"].includes(grade)) {
      setDecisionError("Only grades A, B, or C can be approved.");
      setDecisionLoading(false);
      return;
    }

    try {
      await adminDecideListing(selectedId, {
        decision: "approve",
        finalGrade: grade as "A" | "B" | "C",
        reason: reason || undefined,
      });
      setDecisionSuccess("Listing approved.");
      await loadTable();
    } catch (err: any) {
      setDecisionError(err.message ?? "Failed to approve listing.");
    } finally {
      setDecisionLoading(false);
    }
  }

  async function handleReject() {
    if (selectedRow?.status !== "unverified") {
      setDecisionError("You can only approve or reject listings that are pending.");
      return;
    }

    if (!selectedId) return;
    setDecisionLoading(true);
    setDecisionError(null);
    setDecisionSuccess(null);

    if (!reason.trim()) {
      setDecisionError("Please provide a reason when rejecting a listing.");
      setDecisionLoading(false);
      return;
    }

    try {
      await adminDecideListing(selectedId, {
        decision: "reject",
        reason: reason.trim(),
      });
      setDecisionSuccess("Listing rejected.");
      await loadTable();
    } catch (err: any) {
      setDecisionError(err.message ?? "Failed to reject listing.");
    } finally {
      setDecisionLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Listing requests</h1>

        <div className="flex gap-3 items-center">
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          >
            {STATUS_LABELS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            className="border rounded-md px-3 py-2 text-sm"
            onClick={loadTable}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-100 text-red-800 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* LEFT: table */}
        <div className="border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">Seller</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Initial range</th>
                <th className="px-3 py-2 text-left">Final range</th>
                <th className="px-3 py-2 text-left">Round</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    No listing requests found.
                  </td>
                </tr>
              )}
              {items.map(it => {
                const deviceLabel = [
                  it.brand,
                  it.model,
                  it.variant,
                  it.storage,
                  it.ram,
                ]
                  .filter(Boolean)
                  .join(" ");

                const initRange =
                  it.initialMin != null && it.initialMax != null
                    ? `RM ${it.initialMin} – ${it.initialMax}`
                    : "-";
                const finalRange =
                  it.finalMin != null && it.finalMax != null
                    ? `RM ${it.finalMin} – ${it.finalMax}`
                    : "-";

                const isSelected = it.listingId === selectedId;

                return (
                  <tr
                    key={it.listingId}
                    onClick={() => setSelectedId(it.listingId)}
                    className={
                      (isSelected ? "bg-emerald-50 " : "") +
                      "hover:bg-gray-50 cursor-pointer"
                    }
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium line-clamp-3">
                        {deviceLabel || "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {it.category || ""} {it.devicePk}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700">
                      {it.sellerPk}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      <span className="inline-flex rounded-full px-2 py-0.5 bg-gray-100">
                        {it.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-xs">{initRange}</td>
                    <td className="px-3 py-2 align-top text-xs">{finalRange}</td>
                    <td className="px-3 py-2 align-top text-xs">
                      {it.reviewRound ?? 1}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT: detail + photos + decision */}
        <div className="border rounded-xl p-4 min-h-[320px]">
          {!selectedRow && (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Select a listing to review.
            </div>
          )}

          {selectedRow && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-lg mb-1">
                    {[
                      detail?.brand || selectedRow.brand,
                      detail?.model || selectedRow.model,
                      detail?.variant || selectedRow.variant,
                    ]
                      .filter(Boolean)
                      .join(" ") || "Device"}
                  </h2>
                  <div className="text-xs text-gray-600">
                    Category:{" "}
                    {detail?.category || selectedRow.category || "—"}
                  </div>
                  <div className="text-xs text-gray-600">
                    Seller: {selectedRow.sellerPk}
                  </div>
                </div>
                <div className="text-xs text-right text-gray-600">
                  <div>Created: {selectedRow.createdAt ?? "—"}</div>
                  <div>Updated: {selectedRow.updatedAt ?? "—"}</div>
                </div>
              </div>

              {detailLoading && (
                <div className="text-xs text-gray-500">Loading details…</div>
              )}

              {/* Photos */}
              {Object.keys(photoUrls).length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Photos</div>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(photoUrls).map(([label, url]) => (
                      <button
                        key={label}
                        type="button"
                        className="border rounded-lg overflow-hidden bg-black/5"
                        onClick={() => setActivePhoto(url)}
                      >
                        <img
                          src={url}
                          alt={label}
                          className="w-full h-28 object-cover"
                        />
                        <div className="text-xs p-1 text-center">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranges */}
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div className="border rounded-lg p-3">
                  <div className="font-semibold mb-1">Initial grading</div>
                  <div>
                    Grade:{" "}
                    {detail?.initialGrade ??
                      selectedRow.initialGrade ??
                      "—"}
                  </div>
                  <div>
                    Range:{" "}
                    {(
                      detail?.initialMin ??
                      selectedRow.initialMin
                    ) != null &&
                      (
                        detail?.initialMax ??
                        selectedRow.initialMax
                      ) != null
                      ? `RM ${detail?.initialMin ?? selectedRow.initialMin
                      } – ${detail?.initialMax ?? selectedRow.initialMax
                      }`
                      : "—"}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-semibold mb-1">Final grading</div>
                  <div>
                    Grade:{" "}
                    {detail?.finalGrade ?? selectedRow.finalGrade ?? "—"}
                  </div>
                  <div>
                    Range:{" "}
                    {(
                      detail?.finalMin ??
                      selectedRow.finalMin
                    ) != null &&
                      (
                        detail?.finalMax ??
                        selectedRow.finalMax
                      ) != null
                      ? `RM ${detail?.finalMin ?? selectedRow.finalMin
                      } – ${detail?.finalMax ?? selectedRow.finalMax
                      }`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Questionnaire quick view */}
              {detail?.Questionnaire && (
                <div className="border rounded-lg p-3 text-xs space-y-1 max-h-48 overflow-auto">
                  <div className="font-semibold mb-1">
                    Condition questionnaire
                  </div>
                  {Object.entries(detail.Questionnaire).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-gray-600">{k}</span>
                      <span className="font-medium">
                        {typeof v === "boolean"
                          ? v
                            ? "Yes"
                            : "No"
                          : Array.isArray(v)
                            ? v.join(", ")
                            : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Decision form */}
              <div className="border rounded-lg p-3 text-sm space-y-3">
                <div className="font-semibold mb-1">Decision</div>

                {!isPending ? (
                  <div className="rounded bg-gray-100 text-gray-700 px-2 py-2 text-xs">
                    This listing is <b>{selectedRow?.status ?? "unknown"}</b>. Approve and Reject are only available while the listing is pending.
                  </div>
                ) : (
                  <>

                    {decisionError && (
                      <div className="rounded bg-red-100 text-red-800 px-2 py-1 text-xs">
                        {decisionError}
                      </div>
                    )}
                    {decisionSuccess && (
                      <div className="rounded bg-emerald-100 text-emerald-800 px-2 py-1 text-xs">
                        {decisionSuccess}
                      </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1">Final grade</label>
                        <select
                          className="w-full border rounded px-2 py-1 text-xs"
                          value={finalGrade}
                          onChange={e => setFinalGrade(e.target.value)}
                        >
                          {GRADE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="text-xs text-gray-600 flex flex-col justify-center">
                        <span className="font-semibold mb-1">Final min (RM)</span>
                        <span>
                          Will be set from platform price range for the selected
                          grade.
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 flex flex-col justify-center">
                        <span className="font-semibold mb-1">Final max (RM)</span>
                        <span>
                          Will be set from platform price range for the selected
                          grade.
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs mb-1">
                    Reason / notes (optional, required for rejection)
                  </label>
                  <textarea
                    className="w-full border rounded px-2 py-1 text-xs"
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded border border-red-500 text-red-600 text-xs"
                    onClick={handleReject}
                    disabled={decisionLoading}
                  >
                    {decisionLoading ? "Working…" : "Reject"}
                  </button>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs"
                    onClick={handleApprove}
                    disabled={decisionLoading}
                  >
                    {decisionLoading ? "Working…" : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo zoom modal */}
      {activePhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-5xl max-h-[90vh] p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm">Photo preview</span>
              <button
                className="text-sm"
                onClick={() => setActivePhoto(null)}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto flex justify-center">
              <img
                src={activePhoto}
                alt="Preview"
                className="max-h-[80vh] max-w-[90vw] object-contain"
              />
            </div>
            <div className="mt-2 text-right text-xs">
              <a
                href={activePhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

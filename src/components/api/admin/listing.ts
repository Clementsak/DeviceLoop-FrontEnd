// --- Listing verification (admin) ---

import { api_get, api_post } from "../api"; // adjust the path if api.ts is elsewhere

export type FinalGrade = "A" | "B" | "C";

export type ListingStatus =
  | "unverified"
  | "verified"
  | "rejected"
  | "active"
  | "ended"
  | "cancelled";

export interface AdminListingRequest {
  listingId: string;
  sellerPk: string;
  devicePk: string;
  category?: string;
  brand?: string;
  model?: string;
  variant?: string | null;
  storage?: string | null;
  ram?: string | null;
  status: ListingStatus;
  initialGrade?: string | null;
  initialMin?: number | null;
  initialMax?: number | null;
  finalGrade?: string | null;
  finalMin?: number | null;
  finalMax?: number | null;
  reviewRound?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminListingDetail extends AdminListingRequest {
  // this matches the raw item from /seller/listings/<id>
  Photos?: Record<string, string | null>;
  Questionnaire?: Record<string, unknown>;
}

// GET /admin/listing-requests
export async function adminListListingRequests(
  status: ListingStatus | "all" = "unverified",
  limit = 50
): Promise<AdminListingRequest[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));

  const res = await api_get<{ items: AdminListingRequest[] }>(
    `/admin/listing-requests?${params.toString()}`
  );
  return res.items;
}

// POST /admin/listing-requests/<id>/decision
export async function adminDecideListing(
  listingId: string,
  payload:
    | {
        decision: "approve";
        finalGrade: FinalGrade;
        reason?: string;
      }
    | {
        decision: "reject";
        reason: string;
      }
): Promise<void> {
  await api_post(`/admin/listing-requests/${encodeURIComponent(listingId)}/decision`, payload);
}

// GET /admin/listing-requests/<id>
export async function adminGetListingDetail(
  listingId: string
): Promise<AdminListingDetail> {
  const res = await api_get<AdminListingDetail>(
    `/admin/listing-requests/${encodeURIComponent(listingId)}`
  );
  return res;
}


// GET /files/sign-get?key=...
export async function adminSignGetImage(key: string): Promise<string> {
  const res = await api_get<{ url: string }>(
    `/files/sign-get?key=${encodeURIComponent(key)}`
  );
  return res.url;
}

// src/components/api/seller.ts
import { api_get, api_post } from "./api";

// ---- Types that mirror DynamoDB catalogue rows ----
export type DeviceOption = {
  pk: string;           // "Device#084"
  brand: string;        // "Samsung"
  category: string;     // "Smartphone" | "Laptop" | "Tablet" ...
  model: string;        // "Galaxy S25"
  variant: string | null;
  storage: string;      // "128GB"
  ram: string;          // "8GB"

  releaseDate?: string | null;
  releasePrice?: number | null;

  gradeA_min: number;
  gradeA_max: number;
  gradeB_min: number;
  gradeB_max: number;
  gradeC_min: number;
  gradeC_max: number;
};

// ---- Questionnaire payload expected by Flask ----
export type QuestionnairePayload = {
  freeOfLocks: boolean;
  canPowerOn: boolean;
  screenCondition: string;   // "Flawless" | "Minor" | ...
  bodyCondition: string;
  biometric: string;         // "yes" | "no" | "n_a"
  cameras: string;           // "ok" | "front_issue" | ...
  coreFunctions: string;     // "ok" | "some_faults" | ...
  seriousIssues: string[];   // list of issue codes
};

export type PhotoKey =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "imei";

export interface CreateListingRequestPayload {
  device: { pk: string };
  photos: Record<PhotoKey, string>;
  questionnaire: QuestionnairePayload;
}

// backwards-compat alias for any old imports
export type ListingRequestPayload = CreateListingRequestPayload;

// ---- API calls ----

export async function fetchDeviceOptions(): Promise<DeviceOption[]> {
  const res = await api_get<{ items: DeviceOption[] }>(
    "/admin/devices/options"
  );
  return res.items;        // <-- no .data here
}

export type SignedUpload = {
  uploadUrl: string;
};

export async function signUploadUrl(
  key: string,
  contentType: string
): Promise<SignedUpload> {
  const res = await api_post<{ url: string }>("/files/sign-put", {
    key,
    type: contentType,
  });

  return {
    uploadUrl: res.url,
  };
}

export async function createListingRequest(
  payload: CreateListingRequestPayload
) {
  return api_post<{
    listingId: string;
    initialGrade: string;
    initialMin: number;
    initialMax: number;
    status: string;
  }>("/seller/listing-requests", payload);
}

export type SellerSummary = {
  listings_active: number;
  orders_pending: number;
  messages_unread: number;
  generated_at: string;
  next_payout?: string | null;

  listings_expired?: number;
  listings_matched?: number;
  requests_pending?: number;
};

export type SellerOrdersPaymentFilter = "paid" | "pending" | "all";

export type SellerOrderRow = {
  listingId: string;
  marketKey?: string;
  brand?: string;
  model?: string;
  variant?: string | null;

  listingStatus?: string;
  matchedBuyerPk?: string | null;

  tradePrice?: number;
  paymentStatus?: string; // "paid" or "pending" depending on your backend mapping
  paidAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type SellerOrdersResponse = { items: SellerOrderRow[] };

export const SellerAPI = {
  summary: () => api_get<SellerSummary>("/seller/summary"),


  getOrders: async (opts: {
    paymentStatus?: SellerOrdersPaymentFilter;
    limit?: number;
  }) => {
    const params = new URLSearchParams();

    if (opts?.paymentStatus && opts.paymentStatus !== "all") {
      params.set("paymentStatus", opts.paymentStatus);
    }
    if (opts?.limit) {
      params.set("limit", String(opts.limit));
    }

    const qs = params.toString();
    const data = await api_get<SellerOrdersResponse>(`/seller/orders${qs ? `?${qs}` : ""}`);

    return data?.items ?? [];
  },
};


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

// function sanitizeFilename(name: string) {
//   // keep it simple and safe for keys
//   return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
// }
// function buildObjectKey(prefix: string, filename: string) {
//   const safe = sanitizeFilename(filename);
//   const ts = Date.now();
//   return `${prefix}/${ts}-${safe}`;
// }
// src/components/api/seller.ts

export type SignedUpload = {
  url: string;
  key: string;
};

export type SignUploadArgs = {
  filename: string;
  contentType: string;
  prefix: string; // example: "listings/front"
};

// Overloads (now SignUploadArgs is USED, so noUnusedLocals stops failing)
export async function signUploadUrl(args: SignUploadArgs): Promise<SignedUpload>;
export async function signUploadUrl(key: string, contentType: string): Promise<SignedUpload>;

export async function signUploadUrl(
  arg1: SignUploadArgs | string,
  contentType?: string
): Promise<SignedUpload> {
  let key: string;
  let type: string;

  if (typeof arg1 === "string") {
    // Old-style call: signUploadUrl("some/key.jpg", "image/jpeg")
    key = arg1;
    type = contentType ?? "application/octet-stream";
  } else {
    // New-style call: signUploadUrl({ filename, contentType, prefix })
    const safeName = arg1.filename.replace(/[^\w.\-]+/g, "_");
    key = `${arg1.prefix}/${crypto.randomUUID()}-${safeName}`;
    type = arg1.contentType || "application/octet-stream";
  }

  // IMPORTANT:
  // Your backend route (files_routes.py) is "/sign-put" (NOT "/seller/sign-put")
  const { url } = await api_post<{ url: string }>(
    "/sign-put",
    { key, type }
  );

  // Backend returns only { url }, so we return { url, key } for the frontend to save the key.
  return { url, key };
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

export type SellerRegistrationProfile = {
  organisationName?: string;
  registrationNumber?: string;
  businessEmail?: string;
  businessPhone?: string;
  registrationAddress?: string;
  businessAddress?: string;
};

export type SellerStoreSettings = {
  organisationName?: string | null;
  organisationRegNo?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  notes?: string | null;
  submittedAt?: string | null;
};

export type SellerRegistrationProfileResponse = {
  ok: boolean;
  profile: SellerRegistrationProfile;
};

export type SellerSettingsResponse = {
  ok: boolean;
  profile: string;
  settings: Record<string, unknown>;
  sellerRegistration?: SellerRegistrationProfile | null;
};

type SellerOrdersResponse = { items: SellerOrderRow[] };

export const SellerAPI = {
  summary: () => api_get<SellerSummary>("/seller/summary"),
  getSettings: () => api_get<SellerSettingsResponse>("/seller/settings"),

  getStoreSettings: () => api_get<SellerStoreSettings>("/seller/settings"),

  // Optional (for showing seller registration info on settings page)
  getRegistrationProfile: () =>
    api_get<SellerRegistrationProfileResponse>("/seller/registration-profile"),

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


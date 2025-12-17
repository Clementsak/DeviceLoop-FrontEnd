// src/components/pages/ListingDetailsPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getListingDetails } from "../api/api";
import { PhotoZoomModal } from "../reusables/PhotoZoomModal";

// Shape from backend – keep flexible
type ListingDetails = any;
type PhotoMap = Record<string, string | null>;

type ListingDetailsContentProps = {
  listing: ListingDetails;
  onBack?: () => void;
};

// ================== PAGE WRAPPER ==================

export default function ListingDetailsPage() {
  // IMPORTANT: param name must match your route: "listings/:listingId"
  const { listingId = "" } = useParams<{ listingId: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) {
      setErrorMessage("Missing listing identifier.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getListingDetails(listingId);
        if (!cancelled) {
          setListing(data);
          setErrorMessage(null);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setErrorMessage(
            err?.message ?? "Failed to load listing details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const handleBack = () => {
    // fallback: if no history, go back to listings list
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/listings");
    }
  };

  if (loading) {
    return (
      <div className="dl-page">
        <div className="max-w-5xl mx-auto py-8">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 text-sm text-emerald-300 hover:text-emerald-200"
          >
            ← Back to listings
          </button>
          <p className="text-white/80">Loading listing details…</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="dl-page">
        <div className="max-w-5xl mx-auto py-8 space-y-4">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-emerald-300 hover:text-emerald-200"
          >
            ← Back to listings
          </button>
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="dl-page">
        <div className="max-w-5xl mx-auto py-8">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 text-sm text-emerald-300 hover:text-emerald-200"
          >
            ← Back to listings
          </button>
          <p className="text-white/80">Listing not found.</p>
        </div>
      </div>
    );
  }

  // ✅ Only render content once we have a listing object
  return <ListingDetailsContent listing={listing} onBack={handleBack} />;
}

// ================== CONTENT ==================

function ListingDetailsContent({
  listing,
  onBack,
}: ListingDetailsContentProps) {
  const device = listing?.device ?? {};
  const rawPhotos: PhotoMap = (device.photos as any) ?? {};
  const auction = listing?.auction ?? {};

  // We now use the URLs directly from backend
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Order thumbnails nicely but fall back to whatever exists
  const preferredOrder = ["Back", "Bottom", "Front", "IMEI", "Left", "Right", "Top"];
  let photoEntries = preferredOrder
    .map(label => [label, rawPhotos[label] ?? null] as const)
    .filter(([, url]) => typeof url === "string" && !!url) as [string, string][];

  if (photoEntries.length === 0) {
    photoEntries = Object.entries(rawPhotos).filter(
      ([, url]) => typeof url === "string" && !!url
    ) as [string, string][];
  }

  const mainPhotoUrl =
    activePhoto || (photoEntries.length ? photoEntries[0][1] : null);

  const platformMin =
    listing.platformMin ??
    auction.platformMin ??
    listing.platformRange?.min ??
    null;
  const platformMax =
    listing.platformMax ??
    auction.platformMax ??
    listing.platformRange?.max ??
    null;

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "Not provided";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const formatMoney = (value: number | null | undefined) => {
    if (value == null) return "Not provided";
    return `RM ${value.toLocaleString("en-MY", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const q = (listing.questionnaire || {}) as any;

  const yesNo = (v: any) => {
    if (v === true || v === "yes") return "Yes";
    if (v === false || v === "no") return "No";
    return v ?? "Not provided";
  };

  const issues =
    Array.isArray(q.seriousIssues) && q.seriousIssues.length > 0
      ? q.seriousIssues.join(", ")
      : "None reported";


  return (
    <div className="dl-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 text-forest-900">
        {/* Back link */}
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-forest-700 hover:text-forest-900 underline mb-2"
        >
          ← Back to listings
        </button>

        {/* 1. Photos section */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-forest-200 space-y-4">
          <h2 className="text-xl font-semibold">Photos</h2>

          {/* Main photo */}
          <div
            className="aspect-video w-full bg-forest-50 rounded-xl flex items-center justify-center overflow-hidden border border-forest-200"
          >
            {mainPhotoUrl ? (
              <img
                src={mainPhotoUrl}
                alt="Listing photo"
                className="h-full w-full object-contain cursor-zoom-in"
                onClick={() => setActivePhoto(mainPhotoUrl)}
              />
            ) : (
              <span className="text-forest-700 text-sm">
                No photos uploaded for this listing.
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {photoEntries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photoEntries.map(([label, url]) => (
                <button
                  key={label}
                  type="button"
                  className="relative rounded-xl overflow-hidden border border-forest-200 bg-forest-50 cursor-zoom-in"
                  onClick={() => setActivePhoto(url)}
                >
                  <img
                    src={url}
                    alt={label}
                    className="h-20 w-full object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-forest-900/70 text-white text-[10px] px-1 py-0.5 text-center">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 2. Specifications */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-forest-200 space-y-4">
          <h2 className="text-xl font-semibold">Device specifications</h2>
<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <SpecRow label="Brand" value={device.brand} />
            <SpecRow label="Model" value={device.model} />
            <SpecRow label="Variant" value={device.variant} />
            <SpecRow label="Category" value={device.category} />
            <SpecRow label="Storage" value={device.storage} />
            <SpecRow label="Memory (RAM)" value={device.ram} />
            <SpecRow
              label="Grade"
              value={device.grade ? `Grade ${device.grade}` : null}
            />
            <SpecRow label="Listing ID" value={listing.listingId} />
            <SpecRow label="Device key" value={device.pk ?? listing.devicePk} />
          </dl>
        </section>

        {/* 3. Questionnaire */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-forest-200 space-y-4">
          <h2 className="text-xl font-semibold">Condition questionnaire</h2>
          {listing.questionnaire ? (
<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <SpecRow
                label="Biometric lock / Face ID"
                value={yesNo(q.biometric)}
              />
              <SpecRow
                label="Body condition"
                value={q.bodyCondition || "Not provided"}
              />
              <SpecRow
                label="Screen condition"
                value={q.screenCondition || "Not provided"}
              />
              <SpecRow
                label="Cameras"
                value={q.cameras || "Not provided"}
              />
              <SpecRow
                label="Core functions (Wi-Fi, Bluetooth, buttons)"
                value={q.coreFunctions || "Not provided"}
              />
              <SpecRow
                label="Can power on"
                value={yesNo(q.canPowerOn)}
              />
              <SpecRow
                label="Free of locks (Apple ID / Google lock)"
                value={yesNo(q.freeOfLocks)}
              />
              <SpecRow
                label="Serious issues"
                value={issues}
              />
            </dl>
          ) : (
            <p className="text-sm text-white/60">
              Questionnaire answers are not available for this listing.
            </p>
          )}
        </section>


        {/* 4. Auction details */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-forest-200 space-y-4">
          <h2 className="text-xl font-semibold">Auction details</h2>
<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <SpecRow label="Status" value={auction.status} />
            <SpecRow
              label="Auction mode"
              value={auction.auctionMode?.toUpperCase()}
            />
            <SpecRow
              label="Seller minimum"
              value={
                auction.sellerMin != null ? formatMoney(auction.sellerMin) : null
              }
            />
            <SpecRow
              label="Seller maximum"
              value={
                auction.sellerMax != null ? formatMoney(auction.sellerMax) : null
              }
            />
            <SpecRow
              label="Starts at"
              value={formatDateTime(auction.startsAt)}
            />
            <SpecRow label="Ends at" value={formatDateTime(auction.endsAt)} />
          </dl>
        </section>

        {/* 5. Platform / release info */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-forest-200 space-y-4">
          <h2 className="text-xl font-semibold">Device and platform info</h2>
<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <SpecRow
              label="Official release date"
              value={formatDateTime(device.releaseDate)}
            />
            <SpecRow
              label="Official release price"
              value={
                device.releasePrice != null
                  ? formatMoney(device.releasePrice)
                  : null
              }
            />
            <SpecRow label="Market key" value={listing.marketKey} />
            <SpecRow
              label="Platform range (min)"
              value={platformMin != null ? formatMoney(platformMin) : null}
            />
            <SpecRow
              label="Platform range (max)"
              value={platformMax != null ? formatMoney(platformMax) : null}
            />
          </dl>
        </section>

        {/* Shared zoom modal */}
        <PhotoZoomModal
          photoUrl={activePhoto}
          onClose={() => setActivePhoto(null)}
        />
      </div>
    </div>
  );
}

function SpecRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <dt className="sm:w-60 text-forest-700">{label}</dt>
      <dd className="font-semibold text-forest-900">
        {value === null || value === undefined || value === ""
          ? "Not provided"
          : value}
      </dd>
    </div>
  );
}

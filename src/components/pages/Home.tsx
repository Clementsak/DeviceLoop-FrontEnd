import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/api";
import { useAuth } from "../../auth/AuthContext";

type ListingPreview = {
  listingId: string;
  title?: string;
  devicePk?: string;
  grade?: string;
  status?: string;
  askMin?: number;
  askMax?: number;
  endsAt?: string;
  auctionMode?: "continuous" | "interval" | "end-of-window" | string;
  thumbnailUrl?: string | null;
};

export default function Home() {
  const { me } = useAuth();
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<ListingPreview[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // Adjust endpoint if your home should call a different route.
        // This assumes buyer listings endpoint exists and returns items.
        const res = await api.get("/buyer/listings?limit=30");
        const items = (res?.items ?? res?.data?.items ?? []) as any[];

        const toNum = (v: any): number | undefined => {
          if (typeof v === "number") return v;
          if (v === null || v === undefined || v === "") return undefined;
          const n = Number(v);
          return Number.isFinite(n) ? n : undefined;
        };

        const normalized: ListingPreview[] = items.map((x) => {
          const listingId = String(x.listingId ?? x.id ?? x.pk ?? "");

          const brand = x.brand ? String(x.brand) : "";
          const model = x.model ? String(x.model) : "";
          const title =
            String(x.title ?? "").trim() ||
            [brand, model].filter(Boolean).join(" ") ||
            String(x.deviceName ?? x.devicePk ?? "Listing");

          return {
            listingId,
            title,
            devicePk: x.devicePk ?? x.devicePK,
            grade: x.grade,
            status: x.status,

            // Home is rendering "Seller range" using askMin/askMax.
            // Populate them from the real listing summary fields.
            askMin: toNum(x.sellerMin ?? x.askMin),
            askMax: toNum(x.sellerMax ?? x.askMax),

            // Home is rendering "Ends" using endsAt.
            // Populate from the real listing summary field.
            endsAt: x.auctionEndsAt ?? x.endsAt ?? x.endTime ?? x.endAt,

            auctionMode: x.auctionMode ?? x.mode,

            // for front picture on the home cards
            thumbnailUrl: x.thumbnailUrl ?? x.thumbnail_url ?? null,
          };
        });


        // filter out broken ids
        const cleaned = normalized.filter((x) => !!x.listingId);

        if (mounted) setListings(cleaned.slice(0, 30));
      } catch (e: any) {
        if (mounted) setErr("Could not load latest listings.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const out: Record<string, ListingPreview[]> = {
      continuous: [],
      interval: [],
      "end-of-window": [],
      other: [],
    };
    for (const l of listings) {
      const m = (l.auctionMode || "").toLowerCase();
      if (m.includes("continuous")) out.continuous.push(l);
      else if (m.includes("interval")) out.interval.push(l);
      else if (m.includes("end") || m.includes("eow") || m.includes("e_ow")) out["end-of-window"].push(l);
      else out.other.push(l);

    }
    return out;
  }, [listings]);

  const Card = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-forest-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-forest-900">{title}</div>
      <div className="mt-2 text-sm text-forest-700 leading-relaxed">
        {children}
      </div>
    </div>
  );

  const ListingCard = ({ l }: { l: ListingPreview }) => (
    <div className="h-full overflow-hidden rounded-2xl border border-forest-200 bg-white shadow-sm flex flex-col">
      {/* Image */}
      <div className="h-28 sm:h-32 bg-forest-50 border-b border-forest-200">
        {l.thumbnailUrl ? (
          <img
            src={l.thumbnailUrl}
            alt={l.title ?? "Listing thumbnail"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-forest-600">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="font-semibold text-forest-900 leading-snug">
          {l.title || `Listing ${l.listingId}`}
        </div>

        <div className="text-xs text-forest-600">
          {l.devicePk ? `Device: ${l.devicePk}` : null}
          {l.grade ? ` • Grade: ${l.grade}` : null}
        </div>

        <div className="text-sm text-forest-800">
          <span className="text-forest-600">Seller range:</span>{" "}
          {typeof l.askMin === "number" && typeof l.askMax === "number"
            ? `RM ${l.askMin.toFixed(0)} – RM ${l.askMax.toFixed(0)}`
            : "Not provided"}
        </div>

        <div className="text-sm text-forest-800">
          <span className="text-forest-600">Mode:</span> {l.auctionMode || "Not provided"}{" "}
          <span className="text-forest-600">• Ends:</span>{" "}
          {l.endsAt ? new Date(l.endsAt).toLocaleString() : "Not provided"}
        </div>

        {/* Button pinned to bottom */}
        <div className="mt-auto flex justify-end pt-2">
          <Link
            to={`/listings/${encodeURIComponent(l.listingId)}`}
            className="rounded-xl bg-forest-700 px-4 py-2 text-sm text-white hover:bg-forest-600"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );


  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-8 text-forest-900">
      {/* HERO */}
      <div className="rounded-3xl border border-forest-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-2xl sm:text-3xl font-semibold">
              DeviceLoop
            </div>
            <div className="mt-2 text-sm sm:text-base text-forest-700 leading-relaxed">
              A transparent double-auction platform for second-hand devices.
              Buyers bid within platform price ranges, sellers list within verified ranges,
              and matching happens automatically based on the market mode.
            </div>

            {/* status hint */}
            {me?.verified === false ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Your buyer account is not verified yet. You can browse, but bidding may be restricted until approval.
                <div className="mt-3">
                  <Link
                    to="/verify/buyer"
                    className="inline-flex rounded-xl bg-forest-700 px-4 py-2 text-white hover:bg-forest-600"
                  >
                    Verify buyer account
                  </Link>
                </div>
                <div className="mt-3">
                  <Link
                    to="/verify/seller"
                    className="inline-flex rounded-xl bg-forest-700 px-4 py-2 text-white hover:bg-forest-600"
                  >
                    Register seller account
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                to="/listings"
                className="inline-flex items-center justify-center rounded-xl bg-forest-700 px-5 py-2.5 text-white hover:bg-forest-600"
              >
                Browse listings
              </Link>
              <Link
                to="/markets"
                className="inline-flex items-center justify-center rounded-xl border border-forest-200 px-5 py-2.5 text-forest-800 hover:bg-forest-50"
              >
                View markets
              </Link>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-[360px]">
            <Link
              to="/notifications"
              className="rounded-2xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm hover:bg-forest-100"
            >
              <div className="font-semibold">Notifications</div>
              <div className="text-forest-600 text-xs mt-1">
                Trade matches, expiry, and payments
              </div>
            </Link>
            <Link
              to="/my-bids"
              className="rounded-2xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm hover:bg-forest-100"
            >
              <div className="font-semibold">My bids</div>
              <div className="text-forest-600 text-xs mt-1">
                Edit or cancel open bids
              </div>
            </Link>
            <Link
              to="/cart"
              className="rounded-2xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm hover:bg-forest-100"
            >
              <div className="font-semibold">Cart</div>
              <div className="text-forest-600 text-xs mt-1">
                Pending payments
              </div>
            </Link>
            <Link
              to="/listings"
              className="rounded-2xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm hover:bg-forest-100"
            >
              <div className="font-semibold">Listings</div>
              <div className="text-forest-600 text-xs mt-1">
                Active selling offers
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* HOW MATCHING WORKS */}
      <div className="space-y-3">
        <div className="text-lg font-semibold">How matching works</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Continuous market">
            Matches as soon as a compatible buyer bid and seller listing exist.
            Best for devices with frequent activity.
          </Card>
          <Card title="Interval clearing market">
            Bids and listings accumulate, then the system clears them at fixed intervals.
            Best for fair price discovery under low liquidity.
          </Card>
          <Card title="End-of-window market">
            Matching runs at the end of the listing window.
            If unmatched after the final run, the listing expires.
          </Card>
        </div>
      </div>

      {/* RULES */}
      <div className="space-y-3">
        <div className="text-lg font-semibold">Bidding rules (summary)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Price constraints">
            Your buyer minimum and buyer maximum must stay inside the platform range.
            Your final bid must stay inside your buyer range.
          </Card>
          <Card title="Band and edits">
            The platform uses a band around the final bid to reduce outliers.
            Open bids can be edited only a limited number of times.
          </Card>
          <Card title="Notifications">
            You will only see: trade matched, bid expired, listing expired without match, and payment completed.
          </Card>
          <Card title="Payments">
            Payment status uses pending and paid.
            Payment completed creates a notification for both buyer and seller.
          </Card>
        </div>
      </div>

      {/* LATEST LISTINGS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">Latest listings</div>
          <Link
            to="/listings"
            className="rounded-xl border border-forest-200 px-4 py-2 text-sm text-forest-800 hover:bg-forest-50"
          >
            View all
          </Link>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-forest-200 bg-white p-4 text-sm text-forest-700">
            Loading listings…
          </div>
        ) : null}

        {!loading && listings.length === 0 && !err ? (
          <div className="rounded-2xl border border-forest-200 bg-white p-4 text-sm text-forest-700">
            No active listings found.
          </div>
        ) : null}

        {/* If auctionMode exists we show 3 groups; otherwise show a single grid */}
        {(grouped.continuous.length +
          grouped.interval.length +
          grouped["end-of-window"].length) > 0 ? (
          <div className="space-y-6">
            {[
              { label: "Continuous", items: grouped.continuous },
              { label: "Interval", items: grouped.interval },
              { label: "End-of-window", items: grouped["end-of-window"] },
            ].map((g) => (
              <div key={g.label} className="space-y-3">
                <div className="text-sm font-semibold text-forest-900">{g.label}</div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {g.items.slice(0, 3).map((l) => (
                    <ListingCard key={l.listingId} l={l} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.slice(0, 6).map((l) => (
              <ListingCard key={l.listingId} l={l} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

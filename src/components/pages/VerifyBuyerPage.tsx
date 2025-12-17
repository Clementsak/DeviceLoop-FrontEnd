// src/pages/VerifyBuyerPage.tsx (put next to Home.tsx)
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { submitBuyerVerification } from "../api/api"; // adjust path based on where api.ts lives

type Coords = { lat: number; lon: number; accuracy?: number | null };

export default function VerifyBuyerPage() {
  const { me, loading } = useAuth();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const onGetLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Your browser does not support geolocation.");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocLoading(false);
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setLocLoading(false);
        setError(err.message || "Failed to get location.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!termsAccepted) {
      setError("You must accept the terms and conditions.");
      return;
    }

    if (!coords) {
      setError("Please click “Use current location” first.");
      return;
    }


    try {
      setSubmitting(true);
      await submitBuyerVerification({
        termsAccepted,
        coords: coords
          ? {
            lat: coords.lat,
            lon: coords.lon,
            accuracy: coords.accuracy ?? null,
          }
          : null,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit verification request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 text-forest-900">
        Loading…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 text-forest-900">
        You need to sign in to request verification.
      </div>
    );
  }

  if (me.verified) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 text-forest-900">
        Your buyer account is already verified. You can participate in bidding.
      </div>
    );
  }


  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-forest-900">
      <h1 className="text-2xl font-semibold">Verify your buyer account</h1>
      <p className="text-forest-700 text-sm leading-relaxed">
        To protect sellers and reduce fraud, DeviceLoop requires buyers to accept the terms
        and share a one-time snapshot of their current location. An admin will review this
        before you can place bids.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-2xl border border-forest-200 bg-white p-4 space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              I agree to the buyer verification terms and conditions and consent to my
              current location being used once for verification.
            </span>
          </label>
          {!termsAccepted && (
            <div className="text-xs text-amber-700">
              You must accept the terms before submitting.
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white/5 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="font-medium">Location</div>
              {coords ? (
                <div className="text-sm text-black/70">
                  Latitude: {coords.lat.toFixed(5)}, Longitude: {coords.lon.toFixed(5)}
                  {coords.accuracy != null && (
                    <> (±{Math.round(coords.accuracy)} meters)</>
                  )}
                </div>
              ) : (
                <div className="text-sm text-black/70">
                  We will capture your current location once to help admins confirm your
                  address.
                </div>
              )}
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <button
                type="button"
                onClick={onGetLocation}
                disabled={locLoading}
                className="w-full sm:w-auto rounded-xl px-4 py-2 font-semibold bg-forest-700 text-white hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {locLoading ? "Getting location…" : coords ? "Location captured" : "Use current location"}
              </button>

              {!coords && (
                <div className="text-xs text-forest-700">
                  You must click “Use current location” before submitting.
                </div>
              )}
            </div>

          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Verification request sent. Please wait for an administrator to review it.
          </div>
        )}


        <button
          type="submit"
          disabled={submitting || !termsAccepted || !coords}
          className="w-full rounded-xl px-5 py-2 font-semibold bg-forest-700 text-white hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >

          {submitting ? "Submitting…" : "Submit verification request"}
        </button>

      </form>
    </div>
  );
}

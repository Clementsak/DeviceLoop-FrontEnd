// src/pages/Home.tsx
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext"; // ← import

export default function Home() {
  const { me, login, signup } = useAuth();   // ← use auth actions

  const showBuyerVerifyBanner = me && me.role === "buyers" && !me.verified;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="dl-section pt-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <h1 className="text-4xl/tight md:text-5xl/tight font-extrabold">
              Buy & sell second-hand devices with confidence.
            </h1>
            <p className="text-black/70 max-w-prose">
              DeviceLoop is your trusted marketplace for phones, laptops, tablets and more.
              Transparent bids, verified sellers, and a smooth checkout flow.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/" className="btn-primary rounded-xl px-5 py-3">Browse Listings</Link>

              {me ? (
                <Link to="/profile" className="btn-outline rounded-xl px-5 py-3">
                  Go to profile
                </Link>
              ) : (
                <>
                  <button onClick={signup} className="btn-outline rounded-xl px-5 py-3">
                    Create an account
                  </button>
                  <button onClick={login} className="btn-ghost rounded-xl px-5 py-3">
                    Log in
                  </button>
                </>
              )}
            </div>

            <p className="text-xs text-black/50">Tip: You can filter by category from the Home page below.</p>
          </div>

          <div className="dl-card p-5 shadow-soft">
            <div className="aspect-video rounded-xl bg-white/5 border border-white/10 grid place-items-center">
              <span className="text-black/60">Hero image / promo banner</span>
            </div>
            <div className="mt-4 text-sm text-black/70">
              Trade-in made simple. List your device, accept bids, and get paid.
            </div>
          </div>
        </div>
      </section>

      {/* Verification banner for buyers */}
      {showBuyerVerifyBanner && (
        <section className="dl-section">
          <div className="dl-card p-4 md:p-5 border-amber-400/60 bg-amber-50 text-amber-900 space-y-2">
            <h2 className="text-lg font-semibold">Complete your buyer verification</h2>
            <p className="text-sm">
              You currently have a buyer account, but you are not yet verified.
              Verified buyers can place bids on listings and enjoy a smoother experience.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/verify/buyer"
                className="rounded-xl px-4 py-2 bg-amber-600 text-white text-sm font-medium hover:bg-amber-500"
              >
                Verify buyer account
              </Link>
              <Link
                to="/verify/seller"
                className="rounded-xl px-4 py-2 border border-amber-400 text-sm font-medium hover:bg-amber-100"
              >
                Register as seller
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="dl-section">
        <h2 className="text-2xl font-semibold mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <HomeChip to="/" label="Listings" />
          <HomeChip to="/wishlist" label="Favourites / Follow" />
          <HomeChip to="/notifications" label="Notifications" />
          <HomeChip to="/mybids" label="My Bids" />
          <HomeChip to="/profile" label="Profile" />
          <HomeChip to="/cart" label="Cart" />
        </div>
        <p className="mt-2 text-xs text-black/50">
          * Notifications, Profile, and My Bids are placeholders—wire them when routes are ready.
        </p>
      </section>

      {/* CTA */}
      <section className="dl-section">
        <div className="dl-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">New to DeviceLoop?</h3>
            <p className="text-black/70">Create an account to follow sellers, track bids, and receive notifications.</p>
          </div>
          <div className="flex gap-3">
            {me ? (
              <Link to="/profile" className="btn-primary rounded-xl px-5 py-2.5">Profile</Link>
            ) : (
              <>
                <button onClick={signup} className="btn-primary rounded-xl px-5 py-2.5">Sign up</button>
                <button onClick={login} className="btn-ghost rounded-xl px-5 py-2.5">Log in</button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HomeChip({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3
                 text-sm font-medium text-black/90 text-center"
    >
      {label}
    </Link>
  );
}

function CategoryCard({ to, title }: { to: string; title: string }) {
  return (
    <Link to={to} className="dl-card overflow-hidden hover:shadow-soft transition">
      <div className="aspect-[16/9] bg-white/5 border-b border-white/10 grid place-items-center">
        <span className="text-black/60">{title} banner</span>
      </div>
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="text-sm text-black/60">Explore →</span>
      </div>
    </Link>
  );
}

// src/components/layout/Navbar.tsx
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { ReactNode } from "react";

const linkBase =
  "px-3 py-2 rounded-xl text-sm font-medium transition-colors outline-none focus:outline-none";
const linkNormal = "text-white/80 hover:text-white hover:bg-white/10";
const linkActive = "text-black bg-white";

/**
 * Simple hover dropdown button (used for Admin / Seller menus)
 */
function MenuButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="relative group">
      <button className={`${linkBase} ${linkNormal} font-semibold`}>
        {label} ▾
      </button>
      <div className="absolute hidden group-hover:block bg-white text-black rounded-xl shadow min-w-56 p-2 right-0 z-50">
        {children}
      </div>
    </div>
  );
}

/**
 * Top navigation bar for DeviceLoop.
 * - Shows main navigation links (Listings, Favourites, Notifications, My Bids, Profile)
 * - Shows Admin dropdown if the user is admin
 * - Shows Seller dropdown if the user has seller access
 * - Shows login / signup buttons when logged out
 */
export default function Navbar() {
  const { me, loading, login, logout, signup } = useAuth();
  // Helpful while debugging auth issues:
  console.log("[Navbar] me =", me, "loading =", loading);

  const navLink = ({ to, label }: { to: string; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${linkBase} ${isActive ? linkActive : linkNormal}`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f15]/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold select-none">
          <span className="text-white">Device</span>
          <span className="text-amber-300">Loop</span>
        </Link>

        {/* Center navigation (desktop) */}
        <nav className="hidden md:flex items-center gap-2">
          {navLink({ to: "/listings", label: "Listings" })}
          {navLink({ to: "/favourites", label: "Favourites / Follow" })}
          {navLink({ to: "/notifications", label: "Notifications" })}
          {navLink({ to: "/my-bids", label: "My Bids" })}
          {navLink({ to: "/profile", label: "Profile" })}
        </nav>

        {/* Right side: auth state / dropdowns */}
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-white/70 text-sm">Checking session…</span>
          ) : me ? (
            <>
              {/* Admin menu */}
              {me.role === "admin" && (
                <MenuButton label="Admin">
                  <Link
                    className="block px-3 py-2 rounded hover:bg-black/5"
                    to="/admin/users"
                  >
                    Users
                  </Link>
                  <Link
                    className="block px-3 py-2 rounded hover:bg-black/5"
                    to="/admin/reviews"
                  >
                    Verification reviews
                  </Link>
                  <Link
                    className="block px-3 py-2 rounded hover:bg-black/5"
                    to="/admin/listings"
                  >
                    Listings
                  </Link>
                </MenuButton>
              )}

              {/* Seller menu – allow admin or seller group */}
              {(me.groups.includes("sellers") || me.role === "admin") && (
                <MenuButton label="Seller">
                  <Link
                    className="block px-3 py-2 rounded hover:bg-black/5"
                    to="/seller/dashboard"
                  >
                    Seller dashboard
                  </Link>
                  <Link
                    className="block px-3 py-2 rounded hover:bg-black/5"
                    to="/seller/listing-requests"
                  >
                    Listing requests
                  </Link>
                </MenuButton>
              )}

              <span className="hidden sm:inline text-sm text-white/80">
                Hi,&nbsp;{me.email ?? me.sub}
              </span>

              <button
                onClick={logout}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/20"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={signup}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-amber-100"
              >
                Sign up
              </button>
              <button
                onClick={login}
                className="px-3 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

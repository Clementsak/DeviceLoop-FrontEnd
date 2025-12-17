// src/components/layout/Navbar.tsx
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useState, type ReactNode } from "react";

const linkBase =
  "px-3 py-2 rounded-xl text-sm font-medium transition-colors outline-none focus:outline-none";
const linkNormal = "text-forest-900/80 hover:text-forest-900 hover:bg-forest-100";
const linkActive = "text-forest-900 bg-forest-200";


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
      <div className="absolute hidden group-hover:block bg-forest-50 text-forest-900 border border-forest-200 rounded-xl shadow min-w-56 p-2 right-0 z-50">
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
  const [mobileOpen, setMobileOpen] = useState(false);


  return (
    <header className="sticky top-0 z-40 border-b border-forest-200 bg-forest-50/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          className="md:hidden px-3 py-2 rounded-xl text-sm font-semibold border border-forest-300 text-forest-900 hover:bg-forest-100 transition"
          onClick={() => setMobileOpen((v) => !v)}
        >
          Menu
        </button>
        <Link to="/" className="text-xl font-bold select-none">
          <span className="text-forest-900">Device</span>
          <span className="text-amber-300">Loop</span>
        </Link>

        {/* Center navigation (desktop) */}
        <nav className="hidden md:flex items-center gap-2">
          {navLink({ to: "/listings", label: "Listings" })}
          {navLink({ to: "/markets", label: "Markets" })}
          {navLink({ to: "/notifications", label: "Notifications" })}
          {navLink({ to: "/my-bids", label: "My Bids" })}
          {navLink({ to: "/cart", label: "Cart" })}
        </nav>

        {/* Right side: auth state / dropdowns */}
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-forest-700 text-sm">Checking session…</span>
          ) : me ? (
            <>
              {/* Admin menu */}
              {me.role === "admin" && (
                <MenuButton label="Admin">
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/users">Users</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/listing">Listing requests</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/orders">Orders</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/verify/users">Verify users</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/verify/sellers">Verify sellers</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/devices">Devices</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/prices">Prices</Link>

                </MenuButton>
              )}

              {/* Seller menu – allow admin or seller group */}
              {(me.role === "sellers" || me.role === "admin") && (
                <MenuButton label="Seller">
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller">Dashboard</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller/listings">My listings</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller/orders">Orders</Link>

                </MenuButton>
              )}

              <span className="hidden sm:inline text-sm text-forest-700">
                Hi,&nbsp;{me.email ?? me.sub}
              </span>

              <button
                onClick={logout}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-forest-700 text-white hover:bg-forest-600 transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={signup}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-forest-700 text-white hover:bg-forest-600 transition"
              >
                Sign up
              </button>
              <button
                onClick={login}
                className="px-3 py-2 rounded-xl text-sm font-semibold border border-forest-300 text-forest-900 hover:bg-forest-100 transition"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
      {mobileOpen && (
          <div className="md:hidden border-t border-forest-200 bg-forest-50">
            <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2">
              {navLink({ to: "/listings", label: "Listings" })}
              {navLink({ to: "/markets", label: "Markets" })}
              {navLink({ to: "/notifications", label: "Notifications" })}
              {navLink({ to: "/my-bids", label: "My Bids" })}
              {navLink({ to: "/cart", label: "Cart" })}

              {me?.role === "admin" && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-forest-700 mb-1">Admin</div>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/admin/users">Users</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/admin/listing">Listing requests</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/admin/orders">Orders</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/admin/verify/users">Verify users</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/admin/verify/sellers">Verify sellers</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/admin/devices">Devices</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/admin/prices">Prices</Link>
                </div>
              )}

              {(me?.role === "sellers" || me?.role === "admin") && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-forest-700 mb-1">Seller</div>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/seller">Dashboard</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/seller/listings">My listings</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-forest-100" to="/seller/orders">Orders</Link>
                </div>
              )}
            </div>
          </div>
        )}
    </header>
  );
}

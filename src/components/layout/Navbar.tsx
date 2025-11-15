import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const linkBase = "px-3 py-2 rounded-xl text-sm font-medium transition-colors outline-none focus:outline-none";
const linkNormal = "text-white/80 hover:text-white hover:bg-white/10";
const linkActive = "text-black bg-white";

function MenuButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <button className={`${linkBase} ${linkNormal} font-semibold`}>{label} ▾</button>
      <div className="absolute hidden group-hover:block bg-white text-black rounded-xl shadow min-w-56 p-2 right-0">
        {children}
      </div>
    </div>
  );
}

export default function Navbar() {
  const { me, loading, login, logout, signup } = useAuth();
  console.log("[Navbar] user, loading =", me, loading);

  const navLink = ({ to, label }: { to: string; label: string }) => (
    <NavLink to={to} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkNormal}`}>{label}</NavLink>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f15]/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold"><span className="text-white">Device</span><span className="text-amber-300">Loop</span></Link>

        <nav className="hidden md:flex items-center gap-2">
          {navLink({ to: "/listings", label: "Listings" })}
          {navLink({ to: "/favourites", label: "Favourites / Follow" })}
          {navLink({ to: "/notifications", label: "Notifications" })}
          {navLink({ to: "/mybids", label: "My Bids" })}
          {navLink({ to: "/profile", label: "Profile" })}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-white/70 text-sm">Checking session…</span>
          ) : me ? (
            <>
              {me.role === "admin" && (
                <MenuButton label="Admin">
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/users">Users</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/reviews">Verification reviews</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/admin/listings">Listings</Link>
                </MenuButton>
              )}

              {(me.groups.includes("sellers") || me.groups.includes("admin")) && (
                <MenuButton label="Seller">
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller/listings/new">New listing</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller/listings">My listings</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller/orders">Orders</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller/payouts">Payouts</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/seller/settings">Store Settings</Link>
                </MenuButton>
              )}

              {me.role === "buyers" && (
                <MenuButton label="User">
                  {!me.verified && (
                    <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/verify">
                      Request verification
                    </Link>
                  )}
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/profile">Profile</Link>
                  <Link className="block px-3 py-2 rounded hover:bg-black/5" to="/notifications">Notifications</Link>
                </MenuButton>
              )}

              <span className="hidden sm:inline text-white/80">
                Hi, <b>{me.email ?? me.sub}</b>
              </span>
              <button onClick={logout} className={`${linkBase} ${linkNormal}`}>Sign out</button>
            </>
          ) : (
            <>
              <button onClick={login} className={`${linkBase} ${linkNormal}`}>Log in</button>
              <button onClick={signup} className={`${linkBase} ${linkActive}`}>Sign up</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const linkBase = "px-3 py-2 rounded-xl text-sm font-medium transition-colors outline-none focus:outline-none";
const linkNormal = "text-white/80 hover:text-white hover:bg-white/10";
const linkActive = "text-black bg-white";

export default function Navbar() {
  const { user, loading, login, logout, signup } = useAuth();
  console.log("[Navbar] user, loading =", user, loading);

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
          ) : user ? (
            <>
              <span className="hidden sm:inline text-white/80">
                Hi, <b>{user.email ?? user.sub}</b>
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

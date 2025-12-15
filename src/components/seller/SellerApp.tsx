// src/components/seller/SellerApp.tsx
import { NavLink, Outlet, Route, Routes } from "react-router-dom";
import { SellerDashboard } from "./SellerDashboard";
import { SellerListings } from "./SellerListings";
import { SellerNewListing } from "./SellerNewListing";
import SellerOrders from "./SellerOrders";

export default function SellerApp() {
  return (
    <div className="min-h-[70vh] grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 p-4 md:p-6">
      <aside className="lg:sticky lg:top-20 h-max">
        <nav className="space-y-1 rounded-2xl p-3 bg-forest-50">
          <SideLink to="/seller" end label="Dashboard" />
          <SideLink to="/seller/listings" label="My Listings" />
          <SideLink to="/seller/orders" label="Orders" />
          <SideLink to="/seller/payouts" label="Payouts" />
          <SideLink to="/seller/settings" label="Store Settings" />
        </nav>
      </aside>

      <main className="space-y-6">
        <Routes>
          <Route index element={<SellerDashboard />} />
          <Route path="listings" element={<SellerListings />} />
          <Route path="listings/new" element={<SellerNewListing  />} />
          <Route path="orders" element={<SellerOrders />} />
        </Routes>
        <Outlet />
      </main>
    </div>
  );
}

function SideLink({ to, label, end = false }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        "block rounded-xl px-3 py-2 transition " +
        (isActive ? "bg-forest-200 text-forest-900 font-semibold" : "hover:bg-forest-100 text-forest-700")
      }
    >
      {label}
    </NavLink>
  );
}

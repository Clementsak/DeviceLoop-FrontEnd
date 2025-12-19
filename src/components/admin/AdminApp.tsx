import { Route, Routes, NavLink } from "react-router-dom";
import UsersPage from "./UsersPage";
import VerifyQueuePage from "./VerifyQueuePage";
import AdminDevicesPage from "./AdminDevicesPage";
import AdminPricesPage from "./AdminPricesPage";
import AdminListingRequestsPage from "./AdminListingRequestsPage";
import AdminOrdersPage from "./AdminOrdersPage";

export default function AdminApp() {
  return (
<div className="min-h-[70vh] w-full min-w-0 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      <aside className="lg:sticky lg:top-20 h-max">
        <nav className="space-y-1 rounded-2xl border border-forest-200 bg-white p-3 shadow-sm">
          <SideLink to="/admin/users" end label="Users" />
          <SideLink to="/admin/verify/users" label="Verify users" />
          <SideLink to="/admin/verify/sellers" label="Verify sellers" />
          <SideLink to="/admin/devices" label="Devices" />
          <SideLink to="/admin/prices" label="Prices" />
          <SideLink to="/admin/listing" label="Listing requests" />
          <SideLink to="/admin/orders" label="Orders" />
        </nav>
      </aside>

<main className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-forest-950">Admin</h1>
          <p className="mt-1 text-sm text-forest-700">
            Manage users, verification, devices, pricing, listing requests, and orders.
          </p>
        </div>

        {/* These remain RELATIVE because AdminApp is rendered at /admin/* */}
        <Routes>
          <Route path="users" element={<UsersPage />} />
          <Route path="verify/users" element={<VerifyQueuePage kind="user" />} />
          <Route path="verify/sellers" element={<VerifyQueuePage kind="seller" />} />
          <Route path="devices" element={<AdminDevicesPage />} />
          <Route path="prices" element={<AdminPricesPage />} />
          <Route path="listing" element={<AdminListingRequestsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route index element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  );
}

function SideLink({
  to,
  label,
  end = false,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        "block rounded-xl px-3 py-2 text-sm font-semibold transition " +
        (isActive
          ? "bg-forest-200 text-forest-950"
          : "text-forest-800 hover:bg-forest-50")
      }
    >
      {label}
    </NavLink>
  );
}

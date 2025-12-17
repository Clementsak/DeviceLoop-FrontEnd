import { Route, Routes, NavLink } from "react-router-dom";
import UsersPage from "./UsersPage";
import VerifyQueuePage from "./VerifyQueuePage";
import AdminDevicesPage from "./AdminDevicesPage";
import AdminPricesPage from "./AdminPricesPage";
import AdminListingRequestsPage from "./AdminListingRequestsPage";
import AdminOrdersPage from "./AdminOrdersPage";

export default function AdminApp() {
  return (
    <div className="max-w-6xl mx-auto p-6 text-black">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <nav className="flex gap-3">
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? "underline" : ""}>Users</NavLink>
          <NavLink to="/admin/verify/users" className={({ isActive }) => isActive ? "underline" : ""}>Verify: Users</NavLink>
          <NavLink to="/admin/verify/sellers" className={({ isActive }) => isActive ? "underline" : ""}>Verify: Sellers</NavLink>
          <NavLink to="/admin/devices" className={({ isActive }) => isActive ? "underline" : ""}>Devices</NavLink>
          <NavLink to="/admin/prices" className={({ isActive }) => isActive ? "underline" : ""}>Prices</NavLink>
          <NavLink to="/admin/listing" className={({ isActive }) => isActive ? "underline" : ""}>Verification</NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => isActive ? "underline" : ""}>Orders</NavLink>

        </nav>
      </header>

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
    </div>
  );
}

// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Home from "./components/pages/Home";
import { AuthProvider } from "./auth/AuthContext";
import RequireRole from "./auth/RequireRole";
import VerifyBuyerPage from "./components/pages/VerifyBuyerPage";
import SellerRegisterPage from "./components/pages/SellerRegisterPage";
import TestBidPage from "./components/pages/TestBidPage";
import BuyerListingsPage from "./components/pages/BuyerListingsPage";
import MyBidsPage from "./components/pages/MyBidsPage";
import NotificationsPage from "./components/pages/NotificationsPage";
// (You can replace these with your real modules)
import AdminApp from "./components/admin/AdminApp";
import SellerApp from "./components/seller/SellerApp";
import ListingDetailsPage from "./components/pages/ListingDetailsPage";
import AdvancedListingsPage from "./components/pages/AdvancedListingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,        // navbar + outlet
    children: [
      { index: true, element: <Home /> },
       { path: "listings", element: <BuyerListingsPage /> },
       { path: "my-bids", element: <MyBidsPage /> },
       { path: "notifications", element: <NotificationsPage /> },
       { path: "listings/:listingId", element: <ListingDetailsPage />},
       { path: "markets", element: <AdvancedListingsPage /> },

      { path: "verify/buyer",
        element: (
          <RequireRole role="buyers">
            <VerifyBuyerPage />
          </RequireRole>
        ),
      },
            {
        path: "test-bid",
        element: (
          <RequireRole role="buyers">
            <TestBidPage />
          </RequireRole>
        ),
      },

      {
        path: "verify/seller",
        element: (
          <RequireRole role="buyers">
            <SellerRegisterPage />
          </RequireRole>
        ),
      },
      // Only admins can access any /admin/* page
      {
        path: "admin/*",
        element: (
          <RequireRole role="admin">
            <AdminApp />
          </RequireRole>
        ),
      },

      // Only sellers can access any /seller/* page
      {
        path: "seller/*",
        element: (
          <RequireRole roles={["sellers", "admin"]}>
            <SellerApp />
          </RequireRole>
        ),
      },

      // Example page a logged-in buyer might visit to request verification
      // (If you want "logged-in required", you can make a simple RequireAuth wrapper)
      { path: "verify", element: <div>Verification request page…</div> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);

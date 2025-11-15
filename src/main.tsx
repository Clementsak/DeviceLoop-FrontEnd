// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Home from "./components/pages/Home";
import { AuthProvider } from "./auth/AuthContext";
import RequireRole from "./auth/RequireRole";

// (You can replace these with your real modules)
import AdminApp from "./components/admin/AdminApp";
import SellerApp from "./components/seller/SellerApp";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,        // navbar + outlet
    children: [
      { index: true, element: <Home /> },

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

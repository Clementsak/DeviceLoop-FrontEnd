import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // <-- keep this
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";  // includes Navbar + Footer
import Home from "./components/pages/Home";
import { AuthProvider } from "./auth/AuthContext";


const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,   // always wraps pages
    children: [
      { index: true, element: <Home /> },


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

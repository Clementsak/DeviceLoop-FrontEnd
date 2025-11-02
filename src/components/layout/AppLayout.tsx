// src/components/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar"; // adjust path if different

export default function AppLayout() {
  return (
    <div className="min-h-dvh">
      <Navbar />   {/* ← this is the only header */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-[color:var(--muted)]">
          © {new Date().getFullYear()} DeviceLoop
        </div>
      </footer>
    </div>
  );
}

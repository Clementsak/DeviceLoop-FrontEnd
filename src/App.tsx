import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";

function Nav() {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-xl ${isActive ? "bg-black text-white" : "hover:bg-zinc-100"}`;
  return (
    <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-bold text-xl">DeviceLoop</Link>
        <nav className="flex gap-2">
          <NavLink to="/" className={linkCls}>Home</NavLink>
          <NavLink to="/listings" className={linkCls}>Listings</NavLink>
          <NavLink to="/login" className={linkCls}>Login</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Welcome to DeviceLoop</h1>
      <p className="text-zinc-600">Front-end reboot with React + TS + Tailwind + Vite.</p>
    </main>
  );
}

function Listings() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-2xl font-semibold mb-4">Listings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map((i) => (
          <article key={i} className="border rounded-2xl p-4">
            <div className="aspect-video bg-zinc-100 rounded-xl mb-3" />
            <h3 className="font-medium">Sample Device #{i}</h3>
            <p className="text-sm text-zinc-600">Condition: Good · RM 500</p>
            <button className="mt-3 w-full rounded-xl border py-2 hover:bg-zinc-50">View</button>
          </article>
        ))}
      </div>
    </main>
  );
}

function Login() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h2 className="text-2xl font-semibold mb-6">Login</h2>
      <form className="space-y-3">
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Email" />
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Password" type="password" />
        <button className="w-full rounded-xl bg-black text-white py-2">Sign in</button>
      </form>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

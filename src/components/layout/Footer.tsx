export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-white/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} DeviceLoop. All rights reserved.</p>
        <p className="space-x-3">
          <a className="hover:text-white" href="/about">About</a>
          <a className="hover:text-white" href="/terms">Terms</a>
          <a className="hover:text-white" href="/privacy">Privacy</a>
        </p>
      </div>
    </footer>
  );
}

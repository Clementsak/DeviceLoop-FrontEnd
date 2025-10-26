export default function ComfirmWindow({
  open, title, message, onCancel, onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0b0e12] p-5 space-y-4">
        <h3 className="text-white text-lg font-semibold">{title}</h3>
        <p className="text-white/80">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-600 text-white">Proceed</button>
        </div>
      </div>
    </div>
  );
}

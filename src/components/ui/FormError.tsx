//FormError.tsx
export default function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-3 rounded bg-red-500/15 border border-red-500/30 text-red-300 px-3 py-2">
      {message}
    </div>
  );
}

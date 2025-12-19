// PhotoZoomModal.tsx

type PhotoZoomModalProps = {
  photoUrl: string | null;
  onClose: () => void;
};

export function PhotoZoomModal({ photoUrl, onClose }: PhotoZoomModalProps) {
  if (!photoUrl) return null;

  return (
    // Click on the dark overlay closes the modal
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button in the top right */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
      >
        Close
      </button>

      {/* Inner content: clicking here should NOT close, so we stop propagation */}
      <div
        className="max-w-5xl max-h-[90vh] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photoUrl}
          alt="Enlarged device"
          className="max-h-[85vh] w-auto mx-auto rounded-xl shadow-xl object-contain bg-black"
        />
      </div>
    </div>
  );
}

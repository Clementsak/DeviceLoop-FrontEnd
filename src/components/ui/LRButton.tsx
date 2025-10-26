import React from "react";

export function LRBtn({
  onClick,
  label,
  side,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        "absolute top-1/2 -translate-y-1/2 z-10",
        side === "left" ? "left-2" : "right-2",
        "rounded-full bg-black/50 backdrop-blur px-3 py-2 text-white",
        "hover:bg-black/70 focus:outline-none focus:ring focus:ring-white/30",
      ].join(" ")}
    >
      {side === "left" ? "◀" : "▶"}
    </button>
  );
}
export default LRBtn;
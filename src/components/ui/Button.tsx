//Button.tsx
import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const base =
  "inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};
const variants: Record<Variant, string> = {
  primary:
    "bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-400 focus:ring-offset-[#0b0e12]",
  secondary:
    "bg-white/10 text-white hover:bg-white/20 focus:ring-sky-400 focus:ring-offset-[#0b0e12] border border-white/10",
  ghost:
    "bg-transparent text-white hover:bg-white/10 focus:ring-sky-400 focus:ring-offset-[#0b0e12]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

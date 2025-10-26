import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export default function TextInput({ label, error, hint, id, ...rest }: Props) {
  const inputId = id || `input-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const describedBy = [
    hint ? `${inputId}-hint` : null,
    error ? `${inputId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <label htmlFor={inputId} className="block">
      <span className="text-sm text-gray-300">{label}</span>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`mt-1 w-full rounded-lg bg-[#14181f] border px-3 py-2 text-white
                    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500
                    ${error ? "border-red-500" : "border-transparent"}`}
        {...rest}
      />
      {hint && (
        <div id={`${inputId}-hint`} className="mt-1 text-xs text-gray-400">
          {hint}
        </div>
      )}
      {error && (
        <div id={`${inputId}-error`} className="mt-1 text-xs text-red-400">
          {error}
        </div>
      )}
    </label>
  );
}

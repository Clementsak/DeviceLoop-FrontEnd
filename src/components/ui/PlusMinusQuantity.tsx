// src/components/QuantityPicker/QuantityPicker.tsx

type PlusMinusQuantity = {
  quantity: number;
  onQuantityChange: (next: number) => void;
  isDisabled?: boolean;
  min?: number;   // default 0
  max?: number;   // optional upper bound
  step?: number;  // default 1
  className?: string;
};

export default function QuantityPicker({
  quantity,
  onQuantityChange,
  isDisabled = false,
  min = 0,
  max,
  step = 1,
  className = "",
}: PlusMinusQuantity) {
  const clamp = (n: number) =>
    Math.max(min, max !== undefined ? Math.min(max, n) : n);

  const decrease = () => onQuantityChange(clamp(quantity - step));
  const increase = () => onQuantityChange(clamp(quantity + step));

  const canDecrement = !isDisabled && quantity > min;
  const canIncrement = !isDisabled && (max === undefined || quantity < max);

  return (
    <div
      className={[
        "inline-flex items-center rounded bg-white/10 select-none",
        className,
      ].join(" ")}
      role="group"
      aria-label="Quantity picker"
    >
      <button
        type="button"
        onClick={decrease}
        disabled={!canDecrement}
        className="px-2 py-1 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Decrease quantity"
      >
        −
      </button>

      <span
        className="px-3 py-1 min-w-[2ch] text-center"
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={increase}
        disabled={!canIncrement}
        className="px-2 py-1 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

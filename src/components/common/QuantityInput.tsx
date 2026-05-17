type Props = {
  value: string
  min: number
  step: number
  onChange: (value: string) => void
  ariaLabel?: string
}

export default function QuantityInput({ value, min, step, onChange, ariaLabel }: Props) {
  function adjust(direction: 1 | -1) {
    const currentValue = value.trim() === "" ? 0 : Number(value)
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0
    const nextValue = Math.max(min, safeCurrentValue + direction * step)

    onChange(formatQuantity(nextValue))
  }

  return (
    <div className="quantity-input">
      <button
        type="button"
        className="quantity-step-button"
        onClick={() => adjust(-1)}
        aria-label="Decrease quantity"
      >
        -
      </button>
      <input
        type="number"
        min={min}
        step={step}
        inputMode={step < 1 ? "decimal" : "numeric"}
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="quantity-step-button"
        onClick={() => adjust(1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}

function formatQuantity(value: number) {
  return String(Number(value.toFixed(4)))
}

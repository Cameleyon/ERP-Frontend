type Props = {
  value: string
  min?: number
  step: number
  buttonStep?: number
  onChange: (value: string) => void
  inputId?: string
  ariaLabel?: string
  arrowLabels?: { increase: string; decrease: string }
}

export default function QuantityInput({ value, step, min = step, buttonStep = step, onChange, inputId, ariaLabel, arrowLabels }: Props) {
  function adjust(direction: 1 | -1) {
    const currentValue = value.trim() === "" ? 0 : Number(value)
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0
    const nextValue = Math.max(min, safeCurrentValue + direction * buttonStep)

    if (value === "" && nextValue === 0) return
    onChange(formatQuantity(nextValue))
  }

  return (
    <div className="quantity-input">
      <button
        type="button"
        className="quantity-step-button"
        onClick={() => adjust(-1)}
        aria-label={arrowLabels?.decrease ?? "Decrease quantity"}
      >
        {arrowLabels ? "↓" : "-"}
      </button>
      <input
        id={inputId}
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
        aria-label={arrowLabels?.increase ?? "Increase quantity"}
      >
        {arrowLabels ? "↑" : "+"}
      </button>
    </div>
  )
}

function formatQuantity(value: number) {
  return String(Number(value.toFixed(4)))
}

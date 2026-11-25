import { formatExactDecimal, parseExactDecimal } from "../../utils/decimalInput"

type Props = {
  value: string
  min?: number
  step: number
  buttonStep?: number
  onChange: (value: string) => void
  inputId?: string
  ariaLabel?: string
  error?: string
  arrowLabels?: { increase: string; decrease: string }
}

export default function QuantityInput({ value, step, min = step, buttonStep = step, onChange, inputId, ariaLabel, error, arrowLabels }: Props) {
  function adjust(direction: 1 | -1) {
    const scale = step === 1 ? 0 : step === 0.01 ? 2 : 4
    const current = parseExactDecimal(value || "0", scale)
    const delta = parseExactDecimal(String(buttonStep), scale)
    const minimum = parseExactDecimal(String(min), scale)
    if ("reason" in current || "reason" in delta || "reason" in minimum) return
    const next = current.units + BigInt(direction) * delta.units
    const bounded = next >= minimum.units ? next : minimum.units
    if (!value && bounded === 0n) return
    onChange(formatExactDecimal(bounded, scale))
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
        aria-invalid={error ? true : undefined}
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
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

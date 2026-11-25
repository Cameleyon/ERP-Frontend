export type ExactDecimal = { units: bigint } | { reason: "invalid" | "precision" }

export function parseExactDecimal(input: string, scale: number): ExactDecimal {
  const value = input.trim()
  const match = /^(\+|-)?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(value)
  if (!match || value.length > 80) return { reason: "invalid" }
  const fraction = match[3] ?? match[4] ?? ""
  const digits = BigInt((match[2] ?? "") + fraction)
  if (digits === 0n) return { units: 0n }
  const shift = Number(match[5] ?? 0) - fraction.length + scale
  if (shift > 100) return { reason: "invalid" }
  if (shift < -100) return { reason: "precision" }
  const factor = 10n ** BigInt(Math.abs(shift))
  if (shift < 0 && digits % factor !== 0n) return { reason: "precision" }
  return { units: (match[1] === "-" ? -1n : 1n) * (shift < 0 ? digits / factor : digits * factor) }
}

export function parseStockQuantity(input: string, integerOnly: boolean):
  { cents: bigint; quantity: number; reason?: never }
  | { reason: "whole" | "precision" | "positive" | "range"; quantity?: never; cents?: never } {
  if (input.trim().startsWith("-")) return { reason: "positive" }
  const exact = parseExactDecimal(input, integerOnly ? 0 : 2)
  if ("reason" in exact) return {
    reason: exact.reason === "precision" ? (integerOnly ? "whole" : "precision") : "positive",
  }
  const cents = integerOnly ? exact.units * 100n : exact.units
  if (cents <= 0n) return { reason: "positive" as const }
  if (cents >= 10n ** 14n) return { reason: "range" as const }
  return { cents, quantity: Number(cents) / 100 }
}

export function formatExactDecimal(units: bigint, scale: number) {
  const sign = units < 0n ? "-" : ""
  const digits = (units < 0n ? -units : units).toString().padStart(scale + 1, "0")
  if (!scale) return sign + digits
  const fraction = digits.slice(-scale).replace(/0+$/, "")
  return sign + digits.slice(0, -scale) + (fraction ? "." + fraction : "")
}

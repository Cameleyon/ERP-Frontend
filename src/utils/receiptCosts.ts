import { parseExactDecimal } from "./decimalInput.ts"

export type ReceiptConfirmationType = "ZERO_TOTAL" | "PARTIAL_COST"

export function readReceiptCost(input: string) {
  const value = input.trim() || "0"
  const exact = parseExactDecimal(value, 4)
  if ("reason" in exact) return exact
  if (exact.units < 0n || exact.units >= 10n ** 19n) return { reason: "invalid" as const }
  return { units: exact.units, value }
}

export function assessReceiptCosts(ids: readonly number[], entered: Record<number, string>) {
  const amounts: Record<number, string> = {}
  const zeroIds: number[] = []
  let totalUnits = 0n
  for (const id of ids) {
    const amount = readReceiptCost(entered[id] ?? "")
    if ("reason" in amount) return null
    if (amount.units === 0n) zeroIds.push(id)
    amounts[id] = amount.value
    totalUnits += amount.units
  }
  if (totalUnits >= 10n ** 19n) return null
  const type: ReceiptConfirmationType | null = totalUnits === 0n ? "ZERO_TOTAL" : zeroIds.length ? "PARTIAL_COST" : null
  return { amounts, total: Number(totalUnits) / 10000, totalUnits, type, zeroIds }
}

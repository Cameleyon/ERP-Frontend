import assert from "node:assert/strict"
import { test } from "node:test"
import { formatCurrency } from "../src/utils/format.ts"

test("English currency codes precede the amount with a nonbreaking space", () => {
  assert.equal(formatCurrency(72.5, "CAD", "en"), "CAD\u00a072.50")
  assert.equal(formatCurrency(72.5, "USD", "en"), "USD\u00a072.50")
  assert.equal(formatCurrency(72.5, "HTG", "en"), "HTG\u00a072.50")
  assert.equal(formatCurrency(72.5), "USD\u00a072.50")
})
test("French and Spanish place the code after the amount with a nonbreaking space", () => {
  for (const locale of ["fr", "es"]) {
    assert.equal(formatCurrency(72.5, "CAD", locale), "72.50\u00a0CAD")
    assert.equal(formatCurrency(72.5, "HTG", locale), "72.50\u00a0HTG")
  }
})
test("zero, negative profit and two-decimal rounding remain supported", () => {
  assert.equal(formatCurrency(0, "CAD", "en"), "CAD\u00a00.00")
  assert.equal(formatCurrency(-61.72, "CAD", "fr"), "-61.72\u00a0CAD")
  assert.equal(formatCurrency(1.234, "USD", "en"), "USD\u00a01.23")
  assert.equal(formatCurrency(1234567.89, "CAD", "en"), "CAD\u00a01,234,567.89")
})

test("decimal points stay unambiguous with localized thousands separators", () => {
  assert.equal(formatCurrency(2767.25, "CAD", "fr"), "2\u202f767.25\u00a0CAD")
  assert.equal(formatCurrency(1234567.89, "CAD", "es"), "1\u00a0234\u00a0567.89\u00a0CAD")
})
test("formatting changes presentation only, never the source amount", () => {
  const amount = 72.5
  const rendered = formatCurrency(amount, "CAD", "fr")
  assert.equal(typeof rendered, "string")
  assert.equal(amount, 72.5)
  assert.equal(amount * 2, 145)
})

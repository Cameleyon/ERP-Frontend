import assert from "node:assert/strict"
import test from "node:test"
import { receiptErrorMessage } from "../src/i18n/inventoryReceiptMessages.ts"
import { formatReceiptDateTime } from "../src/utils/format.ts"

test("receipt errors are localized by code and unrecognized codes cannot expose internal details", () => {
  for (const code of ["RECEIPT_WHOLE_QUANTITY", "RECEIPT_WITHDRAWAL_EXCEEDS_STOCK",
    "RECEIPT_ACCESS_DENIED", "INVALID_RECEIPT_OPERATION_KEY"]) {
    assert.equal(new Set(["en", "fr", "es"].map(lang => receiptErrorMessage(code, lang, "fallback"))).size, 3)
  }
  for (const code of ["RECEIPT_INTERNAL_ERROR", "SELECT * FROM secret", "__proto__", "constructor"]) {
    assert.equal(receiptErrorMessage(code, "en", "Safe fallback"), "Safe fallback")
  }
})

test("verified receipt times cross the business date boundary and distinguish the repeated DST hour", () => {
  for (const locale of ["en-CA", "fr-CA", "es"]) {
    const first = formatReceiptDateTime("2026-04-04T13:30:00Z", locale, "Pacific/Auckland")
    const second = formatReceiptDateTime("2026-04-04T14:30:00Z", locale, "Pacific/Auckland")
    assert.match(first, /\+13/)
    assert.match(second, /\+12/)
    assert.equal(first.replace("+13", "+12"), second)
    assert.match(first, /0?5/)
    assert.notEqual(first, formatReceiptDateTime("2026-04-04T13:30:00Z", locale, "America/Los_Angeles"))
  }
})

test("legacy wall times preserve their clock values and unknown IANA zones fall back explicitly to UTC", () => {
  const legacy = formatReceiptDateTime("2026-03-08T02:30:00", "en-GB")
  assert.match(legacy, /02:30/)
  assert.match(formatReceiptDateTime("2026-03-08T02:30:00Z", "en-GB", "Unknown/Zone"), /02:30 UTC/)
})

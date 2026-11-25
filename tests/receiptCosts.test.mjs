import { test } from "node:test"
import assert from "node:assert/strict"
import { assessReceiptCosts, readReceiptCost } from "../src/utils/receiptCosts.ts"
import { parseStockQuantity } from "../src/utils/decimalInput.ts"

test("no costs, blank costs and explicit zeros require zero-total confirmation", () => {
  assert.equal(assessReceiptCosts([], {}).type, "ZERO_TOTAL")
  assert.equal(assessReceiptCosts([1, 2], { 1: "", 2: "0.0000" }).type, "ZERO_TOTAL")
  assert.equal(assessReceiptCosts([1, 2], { 1: ".00004", 2: ".00004" }), null)
})

test("cost assessment includes omitted applicable fields and retains the reviewed amounts", () => {
  const partial = assessReceiptCosts([1, 2, 3], { 1: "5", 2: "0.00000" })
  assert.equal(partial.type, "PARTIAL_COST")
  assert.deepEqual(partial.zeroIds, [2, 3])
  assert.deepEqual(partial.amounts, { 1: "5", 2: "0.00000", 3: "0" })
  assert.equal(partial.total, 5)
  const all = assessReceiptCosts([1, 2], { 1: "10.123400", 2: "1e-4" })
  assert.equal(all.type, null)
  assert.equal(all.total, 10.1235)
  assert.equal(all.totalUnits, 101235n)
})

test("negative values and amounts outside the receipt precision are rejected", () => {
  for (const value of ["-.000001", "garbage", "1000000000000000", "1e999999", "Infinity"]) {
    assert.equal(assessReceiptCosts([1], { 1: value }), null)
  }
  for (const value of ["0.00001", "0.000049", "10.12345"]) {
    assert.equal(readReceiptCost(value).reason, "precision")
    assert.equal(assessReceiptCosts([1, 2], { 1: "5", 2: value }), null)
  }
})

test("stock precision is exact, distinguishes whole-number errors and accepts insignificant zeros", () => {
  for (const value of ["1.234", "0.005", "0.0049", "1.0000000000000000001", "5e-3"]) {
    assert.equal(parseStockQuantity(value, false).reason, "precision")
  }
  for (const value of ["1", "1.2", "1.25", "0.01", "100.00", "1.2500"]) {
    assert.equal(parseStockQuantity(value, false).quantity, Number(value))
  }
  assert.equal(parseStockQuantity("1.25", true).reason, "whole")
  assert.equal(parseStockQuantity("1.0000", true).quantity, 1)
  assert.equal(parseStockQuantity("0", false).reason, "positive")
})

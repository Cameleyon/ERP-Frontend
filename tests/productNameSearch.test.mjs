import { test } from "node:test"
import assert from "node:assert/strict"
import { suggestProducts } from "../src/utils/productNameSearch.ts"

const products = [
  { id: 1, name: "Café moulu", sku: "A", active: true },
  { id: 2, name: "Café moulu", sku: "B", active: true },
  { id: 3, name: "Grand café", sku: "C", active: true },
  { id: 4, name: "Café retiré", sku: "D", active: false },
]

test("name suggestions match case and accents, prioritize prefixes and distinguish duplicate names", () => {
  assert.deepEqual(suggestProducts(products, " CAFE ").map(p => p.id), [1, 2, 3])
  assert.deepEqual(suggestProducts(products, "moulu").map(p => p.id), [1, 2])
  assert.deepEqual(suggestProducts(products, "inconnu"), [])
  assert.deepEqual(suggestProducts(products, " "), [])
})

test("suggestions stay bounded and leave the catalog unchanged", () => {
  const original = structuredClone(products)
  assert.deepEqual(suggestProducts(products, "café", 1).map(p => p.id), [1])
  assert.deepEqual(products, original)
})

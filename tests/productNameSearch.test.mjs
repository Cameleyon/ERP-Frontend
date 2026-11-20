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

test("unified search matches SKU and barcode and ranks exact identifiers before partial names", () => {
  const catalog = [
    { id: 1, name: "B in product name", sku: "OTHER", barcode: "123456", active: true },
    { id: 2, name: "Coffee", sku: "B", barcode: "999999", active: true },
  ]
  assert.deepEqual(suggestProducts(catalog, "B").map(p => p.id), [2, 1])
  assert.deepEqual(suggestProducts(catalog, "123456").map(p => p.id), [1])
  assert.deepEqual(suggestProducts(catalog, "999").map(p => p.id), [2])
})

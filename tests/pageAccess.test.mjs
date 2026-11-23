import assert from "node:assert/strict"
import test from "node:test"
import { accessiblePage } from "../src/utils/pageAccess.ts"

const pages = ["dashboard", "customers", "products", "cost-rubrics", "new-sale", "sales-history", "inventory", "profile", "settings"]
test("cashiers can open only sales and sales history; all other requests fall back to sales", () => {
  for (const page of pages) assert.equal(accessiblePage("CASHIER", page), page === "sales-history" ? page : "new-sale")
})
test("administrator navigation is unchanged and missing roles never gain administrative pages", () => {
  for (const page of pages) {
    assert.equal(accessiblePage("ADMIN", page), page)
    assert.equal(accessiblePage(undefined, page), page === "sales-history" ? page : "new-sale")
  }
})

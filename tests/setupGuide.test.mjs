import assert from "node:assert/strict"
import test from "node:test"
import { isSetupStatus, preferredSetupSite, setupStep } from "../src/utils/setupGuide.ts"
import { setupCopy } from "../src/i18n/setupCopy.ts"

const status = { hasCurrency: true, hasProduct: true, hasActiveProduct: true, hasRecordedStock: false,
  hasEverCompletedSale: false, hasAccessibleSite: true, needsInventoryReview: false, openingStockTarget: { productId: 4 }, saleSiteIds: [] }

test("setup prioritizes currency repair and never restarts after a recorded sale", () => {
  assert.equal(setupStep({ ...status, hasEverCompletedSale: true }), null)
  assert.equal(setupStep({ ...status, hasEverCompletedSale: true, hasCurrency: false }).kind, "currency")
  assert.equal(setupStep({ ...status, hasProduct: false }).kind, "product")
  assert.equal(setupStep({ ...status, hasActiveProduct: false }).kind, "products")
})

test("setup distinguishes opening stock, inconsistent stock, blocked sites and sale readiness", () => {
  assert.deepEqual(setupStep(status, 2), { kind: "opening", productId: 4, siteId: 2 })
  assert.equal(setupStep({ ...status, needsInventoryReview: true }).kind, "inventory")
  assert.equal(setupStep({ ...status, hasRecordedStock: true }).kind, "inventory")
  assert.equal(setupStep({ ...status, hasAccessibleSite: false }).kind, "manage")
  assert.deepEqual(setupStep({ ...status, saleSiteIds: [2, 4] }, 4, 2), { kind: "sale", siteId: 4 })
  assert.deepEqual(setupStep({ ...status, saleSiteIds: [2, 4] }, 9, 4), { kind: "sale", siteId: 4 })
})

test("site defaults never use an inactive or unlisted site and do not guess between peers", () => {
  const a = { id: 1, active: true, primaryLocation: false }
  const b = { id: 2, active: true, primaryLocation: true }
  const c = { id: 3, active: false, primaryLocation: true }
  assert.equal(preferredSetupSite([a, b, c], 1), a)
  assert.equal(preferredSetupSite([a, b, c], 3), b)
  assert.equal(preferredSetupSite([a, c]), a)
  assert.equal(preferredSetupSite([a, { ...b, primaryLocation: false }]), undefined)
  for (const locale of ["fr", "es"]) assert.deepEqual(Object.keys(setupCopy[locale]), Object.keys(setupCopy.en))
  assert.equal(isSetupStatus(status), true)
  assert.equal(isSetupStatus({ hasCurrency: true, saleSiteIds: [] }), false)
  assert.equal(isSetupStatus({ ...status, saleSiteIds: ["10"] }), false)
})

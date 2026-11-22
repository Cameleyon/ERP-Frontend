import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { getLocalizedCostRubricName } from "../src/utils/costRubrics.ts"
import { costCatalogCopy } from "../src/components/costs/costCatalogCopy.ts"

const source = new URL("../../CAMELEYON-ERP/src/main/resources/inventory/cost-catalog.json", import.meta.url)
test("catalog includes 41 entries and the requested eleven defaults, with deductions excluded", { skip: !existsSync(source) }, () => {
  const catalog = JSON.parse(readFileSync(source, "utf8"))
  assert.equal(catalog.length, 41)
  assert.equal(new Set(catalog.map(entry => entry.code)).size, 41)
  assert.deepEqual(catalog.filter(entry => entry.defaultSelected).map(entry => entry.code).sort(), [
    "COST_OF_GOODS", "TRANSPORT", "CUSTOMS_DUTIES", "NON_RECOVERABLE_TAXES", "TRANSIT_INSURANCE",
    "CLEARANCE_BROKERAGE", "HANDLING", "INSPECTION_QUALITY", "PACKAGING_LABELING", "PREPARATION_ASSEMBLY", "OTHER_DIRECT",
  ].sort())
  for (const entry of catalog) for (const language of ["en", "fr", "es"]) {
    assert.ok(entry.names[language])
    assert.ok(entry.descriptions[language])
    assert.ok(costCatalogCopy[language].categories[entry.category])
    assert.equal(getLocalizedCostRubricName(entry.code, "Saved name", language, entry), entry.names[language])
    if (entry.treatment === "DEDUCT") assert.equal(entry.defaultSelected, false)
  }
})

test("catalog names translate while user-defined names remain unchanged", () => {
  assert.equal(getLocalizedCostRubricName("CUSTOM", "My custom cost", "fr"), "My custom cost")
  const entry = { names: { fr: "Prix d’achat", en: "Purchase price", es: "Precio de compra" } }
  assert.equal(getLocalizedCostRubricName("COST_OF_GOODS", "Old historical name", "fr", entry), "Prix d’achat")
})

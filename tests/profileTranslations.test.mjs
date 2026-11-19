import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import ts from "typescript"
import { profileValueLabel } from "../src/components/profile/profileValueCopy.ts"
import { formatDateTime } from "../src/utils/format.ts"

function translations(path) {
  const file = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let initializer
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "text") initializer = node.initializer
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert.ok(initializer && ts.isConditionalExpression(initializer))
  assert.ok(ts.isConditionalExpression(initializer.whenFalse), "Spanish must not fall back to English")
  assert.match(initializer.whenFalse.condition.getText(file), /language === "es"/)
  const object = node => Object.fromEntries(node.properties.map(property => [property.name.getText(file), property.initializer.text]))
  return { fr: object(initializer.whenTrue), es: object(initializer.whenFalse.whenTrue), en: object(initializer.whenFalse.whenFalse) }
}

test("every profile label and validation message has an explicit Spanish translation", () => {
  const copy = translations("../src/pages/ProfilePage.tsx")
  assert.deepEqual(Object.keys(copy.es).sort(), Object.keys(copy.en).sort())
  assert.deepEqual(Object.keys(copy.es).sort(), Object.keys(copy.fr).sort())
  assert.ok(Object.keys(copy.es).length > 100)
  assert.ok(Object.values(copy.es).every(value => typeof value === "string" && value.length > 0))
  assert.equal(copy.es.title, "Perfil")
  assert.equal(copy.es.userProfile, "Perfil de usuario")
  assert.equal(copy.es.subscription, "Suscripción")
  assert.equal(copy.es.registerCard, "Registrar tarjeta de crédito")
  assert.equal(copy.es.additionalUserConsentLabel.includes("5 USD"), true)
  assert.equal(copy.es.additionalLocationConsentLabel.includes("9,99 USD"), true)
})
test("card setup labels and fallback errors support all three languages", () => {
  const copy = translations("../src/components/billing/StripePaymentMethodForm.tsx")
  assert.deepEqual(Object.keys(copy.es).sort(), Object.keys(copy.en).sort())
  assert.deepEqual(Object.keys(copy.es).sort(), Object.keys(copy.fr).sort())
  assert.equal(copy.es.save, "Guardar tarjeta")
  assert.equal(copy.es.saveSuccess, "Método de pago guardado correctamente")
})
test("roles and subscription values translate without changing identifiers or custom data", () => {
  const expected = { ADMIN: "Administrador", CASHIER: "Cajero", TRIAL: "Período de prueba", MONTHLY: "Mensual",
    YEARLY: "Anual", AUTOMATIC_CARD: "Pago automático con tarjeta", BANK_TRANSFER: "Transferencia bancaria", NONE: "Ninguno" }
  for (const [code, label] of Object.entries(expected)) assert.equal(profileValueLabel(code, "es"), label)
  assert.equal(profileValueLabel("STRIPE", "es"), "Stripe")
  assert.equal(profileValueLabel("CUSTOM_PLAN", "es"), "CUSTOM_PLAN")
  assert.equal(profileValueLabel(null, "es"), "-")
  assert.equal(profileValueLabel("CASHIER", "fr"), "Caissier")
  assert.equal(profileValueLabel("CASHIER", "en"), "Cashier")
})
test("profile date formatting accepts the selected language while preserving existing defaults", () => {
  const date = "2026-12-10T12:00:00Z"
  assert.match(formatDateTime(date, "es"), /dic/i)
  assert.equal(formatDateTime(date), formatDateTime(date, "en-CA"))
  assert.equal(formatDateTime("not-a-date", "es"), "not-a-date")
})

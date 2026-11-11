import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync, existsSync } from "node:fs"
import catalog from "../shared/signup-errors.json" with { type: "json" }
import { SignupError, signupErrorCode, signupErrorMessage, validateSignup, validateSignupCode } from "../src/errors/signupErrors.ts"
import { handleSignupResponse, isVerificationStart, isVerificationResult } from "../src/errors/signupResponse.ts"

const valid = { companyName: "Example", email: "owner@example.com", password: "password123", preferredLanguage: "en", termsAccepted: true }
const reference = "12345678-1234-4234-8234-123456789012"
const started = { pendingSignupId: reference, adminEmail: valid.email, attemptsRemaining: 3, expiresAt: "2026-11-10T12:00:00" }
const failed = { verified: false, expired: false, requiresRestart: false, attemptsRemaining: 2, signup: null }

test("all fixed codes have three translations and fit the analytics contract", () => {
  for (const [code, messages] of Object.entries(catalog)) {
    assert.match(code, /^[A-Z_]{1,32}$/)
    assert.equal(messages.length, 3)
    for (const language of ["en", "fr", "es"]) assert.ok(signupErrorMessage(code, language).length > 5)
  }
})

test("field validation records precise issues without retaining submitted values", () => {
  assert.deepEqual(validateSignup(valid), [])
  assert.deepEqual(validateSignup({ ...valid, companyName: "", email: "", password: "", termsAccepted: false }).map(v => v.code),
    ["COMPANY_NAME_REQUIRED", "EMAIL_REQUIRED", "PASSWORD_REQUIRED", "TERMS_REQUIRED"])
  for (const [field, value, code] of [
    ["companyName", "x".repeat(256), "COMPANY_NAME_TOO_LONG"], ["email", "not-an-email", "EMAIL_INVALID"],
    ["email", "x".repeat(256), "EMAIL_TOO_LONG"], ["password", "short", "PASSWORD_TOO_SHORT"],
    ["password", "        ", "PASSWORD_REQUIRED"],
    ["password", "é".repeat(37), "PASSWORD_TOO_LONG"], ["preferredLanguage", "de", "ACCOUNT_LANGUAGE_INVALID"],
  ]) assert.equal(validateSignup({ ...valid, [field]: value })[0].code, code)
  assert.equal(validateSignupCode(""), "CODE_REQUIRED")
  assert.equal(validateSignupCode("12345x"), "CODE_FORMAT_INVALID")
  assert.equal(validateSignupCode(" 123456 "), null)
})

test("network, timeout and known backend errors map to stable codes", () => {
  assert.equal(signupErrorCode(new TypeError("Failed to fetch")), "NETWORK")
  assert.equal(signupErrorCode(new DOMException("", "TimeoutError")), "TIMEOUT")
  assert.equal(signupErrorCode(new Error("ACTIVE_COMPANY_OWNER_EXISTS")), "ACTIVE_OWNER_EXISTS")
  assert.equal(signupErrorCode(new Error("SIGNUP_RESEND_COOLDOWN")), "RESEND_COOLDOWN")
  assert.equal(signupErrorCode(new Error("SQL private@example.com")), "REQUEST_FAILED")
  assert.equal(new SignupError("INTERNAL_ERROR", "private@example.com").reference, undefined)
})

test("HTTP errors are classified and raw server content never reaches the user", async () => {
  for (const [status, expected] of [[400, "REQUEST_FAILED"], [401, "ACCESS_DENIED"], [403, "ACCESS_DENIED"], [408, "TIMEOUT"],
    [429, "RATE_LIMITED"], [500, "INTERNAL_ERROR"], [502, "SERVICE_UNAVAILABLE"], [503, "SERVICE_UNAVAILABLE"], [504, "SERVICE_UNAVAILABLE"]]) {
    await assert.rejects(handleSignupResponse(new Response("<html>secret SQL</html>", { status }), isVerificationStart),
      error => error instanceof SignupError && error.code === expected && !error.message.includes("secret"))
  }
  await assert.rejects(handleSignupResponse(Response.json({ code: "MAIL_DELIVERY_FAILED", reference, message: "private detail" }, { status: 503 }), isVerificationStart),
    error => error.code === "MAIL_DELIVERY_FAILED" && error.reference === reference && !error.message.includes("private"))
  await assert.rejects(handleSignupResponse(Response.json({ message: "A valid owner email is required" }, { status: 400 }), isVerificationStart),
    error => error.code === "EMAIL_INVALID")
})

test("malformed success responses never advance verification or confirm an account", async () => {
  for (const value of [null, {}, { ...started, attemptsRemaining: 0 }, { ...started, attemptsRemaining: 4 }, { ...started, expiresAt: "invalid" }]) {
    await assert.rejects(handleSignupResponse(Response.json(value), isVerificationStart), error => error.code === "INVALID_RESPONSE")
  }
  assert.deepEqual(await handleSignupResponse(Response.json(started), isVerificationStart), started)
  assert.equal(isVerificationResult(failed), true)
  assert.equal(isVerificationResult({ ...failed, verified: true }), false)
  assert.equal(isVerificationResult({ ...failed, verified: true, signup: { companyId: 4, adminEmail: valid.email } }), true)
  assert.equal(isVerificationResult({ ...failed, verified: true, signup: { companyId: -1, adminEmail: valid.email } }), false)
})

test("adjacent backend, migration and admin catalog stay in sync when checked out together", t => {
  const backend = new URL("../../CAMELEYON-ERP/src/main/java/com/cameleyon/erp/publicapi/error/SignupErrorCode.java", import.meta.url)
  const admin = new URL("../../cameleyon-erp-platform-ui/src/errors/signup-errors.json", import.meta.url)
  if (!existsSync(backend) || !existsSync(admin)) return t.skip("Adjacent repositories not checked out")
  const java = readFileSync(backend, "utf8").split("private static")[0]
  const migration = readFileSync(new URL("../../CAMELEYON-ERP/src/main/resources/db/migration/V58__detailed_signup_errors.sql", import.meta.url), "utf8")
  for (const code of Object.keys(catalog)) {
    assert.ok(java.includes(code), code)
    assert.ok(migration.includes("'" + code + "'"), code)
  }
  assert.deepEqual(JSON.parse(readFileSync(admin, "utf8")), catalog)
})

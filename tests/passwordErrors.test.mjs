import assert from "node:assert/strict"
import test from "node:test"
import { newPasswordLengthError, passwordRequestError } from "../src/errors/passwordErrors.ts"
import { signupErrorMessage } from "../src/errors/signupErrors.ts"

test("new-password validation counts UTF-8 bytes rather than JavaScript characters", () => {
  assert.equal(newPasswordLengthError("a".repeat(72), "en"), undefined)
  assert.equal(newPasswordLengthError("\u00e9".repeat(36), "en"), undefined)
  assert.equal(newPasswordLengthError("\u{1f4a1}".repeat(18), "en"), undefined)
  for (const language of ["en", "fr", "es"]) {
    assert.equal(newPasswordLengthError("\u00e9".repeat(36) + "x", language),
      signupErrorMessage("PASSWORD_TOO_LONG", language))
  }
})

test("password API validation displays the existing localized copy without changing other errors", () => {
  for (const language of ["en", "fr", "es"]) {
    for (const message of ["PASSWORD_TOO_LONG", signupErrorMessage("PASSWORD_TOO_LONG", "en")]) {
      assert.equal(passwordRequestError(new Error(message), language, "fallback"),
        signupErrorMessage("PASSWORD_TOO_LONG", language))
    }
  }
  assert.equal(passwordRequestError(new Error("Incorrect verification code."), "fr", "fallback"), "Incorrect verification code.")
  assert.equal(passwordRequestError(null, "en", "fallback"), "fallback")
})

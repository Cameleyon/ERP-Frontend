# Signup error contract

## Scope

This catalog covers the public company signup, email verification and code resend
flows. It does not claim to enumerate every error in every ERP module.
It does not change the company/site counters or mark demo companies.

The source catalog is `shared/signup-errors.json` (English, French, Spanish).
The browser uses `src/errors/signupErrors.ts` for validation and classification,
and `src/errors/signupResponse.ts` to validate HTTP responses.
The Vercel relay derives its allowlist from the same catalog.

The backend counterpart is `publicapi/error/SignupErrorCode.java`.
The platform counterpart is `src/errors/signup-errors.json`.
The adjacent-repository contract test checks those copies and migration V58.
When adding a code, update all counterparts and tests together.

## Codes

| Area | Codes |
| --- | --- |
| Company name | COMPANY_NAME_REQUIRED, COMPANY_NAME_TOO_LONG |
| Owner email | EMAIL_REQUIRED, EMAIL_INVALID, EMAIL_TOO_LONG |
| Password | PASSWORD_REQUIRED, PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG |
| Choices | TERMS_REQUIRED, ACCOUNT_LANGUAGE_INVALID |
| Code input | CODE_REQUIRED, CODE_FORMAT_INVALID |
| Verification outcome | INVALID_CODE, CODE_EXPIRED, ATTEMPTS_EXHAUSTED, VERIFICATION_UNAVAILABLE |
| Resend | RESEND_COOLDOWN, RESEND_LIMIT |
| Existing account | ACTIVE_OWNER_EXISTS |
| Connectivity | NETWORK, TIMEOUT |
| HTTP/service | RATE_LIMITED, ACCESS_DENIED, SERVICE_UNAVAILABLE, INVALID_REQUEST |
| Mail | MAIL_UNAVAILABLE, MAIL_DELIVERY_FAILED |
| Catalog/configuration | PLAN_UNAVAILABLE, PARTNER_CODE_INVALID |
| Unexpected failure | INVALID_RESPONSE, INTERNAL_ERROR, REQUEST_FAILED |
| Historical generic validation | VALIDATION |

Validation checks all fields before sending a request. Names/emails have a
255-character limit; passwords require 8 characters and at most 72 UTF-8 bytes
to match the password encoder's input limit. Codes must be six ASCII digits.
Backend validation remains authoritative.

## Display and recording

- Field problems are shown next to fields and in a focused summary near Submit.
- Verification and resend errors are displayed inside the verification dialog.
- Messages are translated and include their stable code for support.
- Internal backend failures return a random reference, code, status and timestamp.
  The reference is displayed to the user and logged server-side with the exception
  class. The signup exception handler never returns/logs raw exception messages,
  submitted values, mail recipients, SQL details, passwords or verification codes.
- The controller-specific handler does not change other ERP endpoints.
- HTTP errors, non-JSON responses and malformed successful responses are classified
  safely. Unknown server messages are never displayed verbatim.
- The browser has a 60-second request timeout and does not automatically retry
  account creation or verification. A timeout does not prove the server rejected
  the action; messages warn users to check their email.
- First-party analytics receives fixed codes only, never input values, raw messages
  or support references. Each local field reason is sent once per attempt.
  The backend overview counts distinct attempts per reason.
- Errors can overlap: one attempt can have several different problems and later
  succeed. Errors do not necessarily indicate lost registrations.
- Existing VALIDATION records remain generic. New codes are not retroactive.

## Deployment order

1. Backend: deploy enum, signup-specific handler, validators and Flyway V58.
   V58 extends the existing reason constraint without deleting historical data.
2. Platform: deploy translated catalog and Code column.
3. Business frontend: deploy validations, API adapter and Vercel relay together.

Do not deploy the new browser codes ahead of the backend migration; the old backend
and database reject codes they do not recognize. Legacy API messages are mapped for
compatibility, but updating the frontend alone cannot provide the full feature.

## Tests

- `node --test tests/*.test.*`: catalog, multilingual messages, validation,
  safe HTTP mapping, malformed responses, relay allowlist, privacy, contract sync.
- `npm run build` in the business frontend and platform.
- Backend Gradle: PublicSignupServiceTest, SignupExceptionHandlerTest,
  SignupAnalyticsServiceTest.
- `node tests/signupFlow.browser.mjs` against a local production preview.
  Requires Playwright; optional PLAYWRIGHT_MODULE_PATH and
  PLAYWRIGHT_EXECUTABLE_PATH select an installed runtime/browser.
  Uses simulated API responses and intercepts analytics; never creates real
  accounts or emits production marketing events. Screenshots go to the OS temp
  directory. Covers EN/FR/ES, mobile/desktop, field errors, an internal failure,
  code format, resend rejection and successful confirmation.

## Limits

No implementation can guarantee capture of every client failure. Offline browsers,
closed tabs, storage/tracking protection, Do Not Track, JavaScript load failures,
or a failed analytics service may prevent reporting. NETWORK cannot distinguish
offline, DNS, TLS, CORS and browser blocking. Email delivery success means the mail
service accepted the send, not that the message reached the inbox. Server references
do not recover logs already lost under the hosting provider's retention policy.

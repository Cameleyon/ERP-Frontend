# Meta Pixel

## Before enabling production

The ERP frontend does not send anything to Meta unless the deployment is configured and the visitor explicitly accepts advertising measurement. This does not change the separate first-party visit and signup funnel.

1. In Meta Events Manager, open data source **1882145179608617**. Turn **Automatic advanced matching** and **Track events automatically without code** off. Check the Event Setup Tool for existing event rules and remove overlapping rules. Do not install a second tag through GTM or paste a base code snippet.
2. Review the first-party privacy notice before enabling the Pixel. Describe Meta as a recipient, the advertising measurement purpose, browser/cookie identifiers, page URL, device/network information, retention, and how to withdraw consent. Link the notice from the site as appropriate. The included FR/EN/ES controls provide an opt-in and withdrawal mechanism, not a complete compliance determination.
3. In the frontend Vercel project, enable automatic exposure of system environment variables (the build uses `VERCEL_ENV`). Set **`VITE_META_PIXEL_ID=1882145179608617` for Production only** and redeploy after approval. These IDs are public configuration, not secrets. The production ID is pinned to the HTTPS origin `erp.cameleyondynamics.com`; aliases and local builds do not send to it.

## Safe manual test

1. Create a **separate Meta test Pixel/data source**, not used by live campaigns. On a dedicated Vercel Preview branch, set `VITE_META_TEST_PIXEL_ID` to that test ID and `VITE_META_TEST_HOST` to the exact Preview hostname ending in `.vercel.app` (no scheme, port or path). Set the Preview API base to a non-production backend with a controlled test inbox. Redeploy the preview. A regular Preview with neither test variable configured sends no Meta events.
2. In Events Manager, select the **test** data source, open **Test Events**, choose the browser testing option, and open that exact Preview URL. Use a clean browser without an ad blocker for this test. In DevTools Network, confirm that `fbevents.js` and the Pixel request do not appear before consent or after refusing in a fresh session.
3. Accept advertising measurement. Expect one `PageView` for the current view and one each when opening signup, going back to the landing page or opening login. Switching a localized landing-page link or refreshing loads a new document and counts as a new page view.
4. Submit the form. Request a resend or enter an incorrect code: no `CompleteRegistration`. Enter the valid code: one `CompleteRegistration`, followed by the login view. Refresh or sign in: no second conversion. Inspect the conversion parameters: no form contents, company ID or email, only an opaque event ID for deduplication. Confirm the receiving data source is the test ID.
5. Select **Withdraw marketing consent** near the support contact. Navigate again: no further events. The prompt remains closed until a fresh tab session. The real data source must not be used for this test.

## Behavior and limits

- Public landing, signup and login views are tracked after consent. These are React views and share the same URL in a given language; Meta can count their PageViews, but the URL does not distinguish the signup and login views. Logged-in ERP views do not send events. The SDK is revoked on entering the authenticated area or withdrawing consent; prior events cannot be withdrawn.
- Acceptance/refusal lasts for the browser tab session and survives reloads. If session storage is unavailable, the choice applies only to the current document. There is no floating preferences button after the decision. Open Privacy from the landing-page footer in the same tab to withdraw an accepted choice without reopening the prompt. Global Privacy Control and Do Not Track suppress the integration. The app does not add Meta to its existing first-party analytics.
- Meta's browser SDK can read the page URL and referrer. Only the public paths `/`, `/en`, `/fr`, `/es` (including optional locale trailing slash) and the existing `#platform-preview` anchor are allowed. Unknown query parameters or non-allowlisted values suppress tracking instead of being forwarded. Supported campaign parameters: `fbclid`, known Meta `utm_source` values, known ad-medium `utm_medium` values, and numeric `utm_id`, `utm_campaign`, `utm_content`, and `utm_term`. For campaign URLs use IDs, not names, e.g. `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.id}}&utm_content={{ad.id}}`. Do not put personal information in ad URLs. External referrers must be origin-only.
- The Spring confirmation locks the pending token, creates the account and consumes the token in one transaction. The frontend records a browser-local reservation keyed by the confirmed company before sending. Repeated successful responses in that browser do not emit a second conversion. The company ID, verification token and form data are not sent to Meta. The random `eventID` is reserved for the event; a future server-side integration should share a backend-issued opaque event ID. No Conversions API is implemented.
- This is best-effort browser delivery, not a server-side ledger. Refusal, ad blockers, unavailable storage, unsafe URLs, loss of the successful confirmation response, or navigation before the SDK sends can result in no conversion. There is no replay after later consent or page refresh. Browser storage is not a cross-device deduplication mechanism.

## Local verification

`node --test tests/*.test.*` exercises environment isolation, consent, PageView navigation, confirmed versus failed verification, deduplication and URL filtering. `npm run build` checks the production build. No Meta requests are sent by the automated tests.

References: [Meta's Pixel implementation template](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl), [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables), [CNIL guidance on cookies and trackers](https://cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi).

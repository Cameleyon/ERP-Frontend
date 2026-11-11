# Platform analytics

For signup validation, fixed error codes and rollout order, see [Signup error contract](signup-errors.md).

## Deployment

Three projects are involved: ERP-Backend (Render), ERP-Frontend (the business
application on Vercel), and cameleyon-erp-platform-ui (the admin portal).

1. Deploy the backend migration V51 and analytics endpoints.
2. Set `ANALYTICS_INGEST_SECRET` to the same random value (at least 32 characters)
   in Render and the business application's Vercel production environment.
   Keep this value stable: changing it changes visitor pseudonyms.
   Never use a `VITE_` prefix for this secret; it is server-only.
3. On Vercel set `ANALYTICS_API_BASE_URL` to the backend API base, including `/api`:
   `https://erp-backend-6hfk.onrender.com/api`.
4. Deploy ERP-Frontend, including its `api/analytics/visit.js` Vercel function.
   Ensure any project-level catch-all rewrite excludes `/api/analytics/visit`.
5. Deploy the admin portal and sign in as SUPER_ADMIN. Platform activity appears
   before the subscription catalog. The portal uses its existing backend URL.

No statistics are backfilled. Company and site counts are available immediately.
The `trackingConfigured` flag means the backend secret is configured; the
first-recorded timestamp confirms that at least one visit reached the backend.

## Definitions

- A visit is one full opening or reload of ERP-Frontend, including its public pages.
  Internal React navigation does not add visits. The admin portal is not tracked.
- Unique visitors are distinct browser identifiers within the chosen UTC period.
  A person on two browsers is counted twice; clearing browser storage resets identity.
- Countries for visits come from Vercel's `x-vercel-ip-country` header at collection
  time. This is approximate IP-based geography and can reflect VPN/proxy location.
- The browser cannot supply the country sent to Render. The server relay authenticates
  with a shared secret. No raw IP, email, account ID, or browsing path is stored in
  the analytics table. Browser identifiers are HMAC-hashed before persistence.
- Company and site figures are current totals, including inactive records, regardless
  of the visits date range. Primary company locations are sites too.
- Sites are grouped by their own saved country, not the company's address. Country
  codes and recognized French/English/Spanish country names are normalized. Missing
  or unrecognized values are grouped as unknown (`ZZ`).
- A browser seen in two countries counts once in the overall unique total and once
  in each country's unique count; country unique counts need not sum to the total.
- Preview deployments, local development, Do Not Track browsers, and browsers that
  block storage or requests are excluded. These are approximate traffic metrics,
  not audited human counts; bots that run JavaScript can also be recorded.

## APIs

- `GET /api/admin/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`, SUPER_ADMIN only.
  Inclusive UTC dates, at most 366 days; defaults to the last 30 days.
- `POST /api/public/analytics/visits`, server relay only; requires
  `X-Analytics-Secret`. A visit UUID is unique, so retries cannot duplicate visits.

## Verification after deployment

1. In production, open the business application and verify that
   `POST /api/analytics/visit` returns 204 in the browser network panel.
2. In the admin portal, choose Today and refresh: a new visit and browser should appear.
3. Reload in the same browser: visits increment; unique visitors stay unchanged.
4. Open in another browser: unique visitors increment.
5. Check site country counts against stored location addresses. Records without a
   recognized country appear under Country not provided.

The automated backend tests and Node relay tests run without Stripe or production data.

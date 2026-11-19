# Phase 4: Forecasts in the existing dashboard

Local implementation and verification report, 2026-11-18. No commit, push, deployment, production scheduler activation or Phase 5 work was performed. Earlier uncommitted product rankings, calendar settings and forecasting Phases 1-3 remain intact.

## 1. Executive summary

The existing Total sales and Total profit cards now show secondary, period-matched forecast values. The existing sales trend chart overlays original weekly sales/profit forecasts as dashed blue/green lines. Actual totals, other KPI cards and product/inventory tables remain operational independently of forecasting. Date/site scope, target availability, currency, company calendar and snapshot validity are checked before numbers are rendered.

## 2. Architecture reviewed

Reviewed `DashboardPage`, `dashboardApi`, `SummaryCard`, `DashboardFilters`, Recharts `SalesTrendChart`, authentication/session data, accessible-site API, currency/date helpers, language provider/messages, CSS breakpoints and the secured weekly forecast controller/delivery DTOs. The dashboard already had a This week option, but previously ended its range today instead of Sunday. Forecast delivery is ADMIN-only; cashier access was not broadened.

## 3. Frontend files

Modified:

- `src/pages/DashboardPage.tsx`: applied versus draft filters, company-local dates, asynchronous scope safety, independent forecast integration.
- `src/components/dashboard/SummaryCard.tsx`: optional secondary forecast block.
- `src/components/dashboard/SalesTrendChart.tsx`: existing Recharts chart, forecast overlay, toggle, localized legend/tooltips.
- `src/components/dashboard/DashboardFilters.tsx`: explicit accessible label for the existing period selector.
- `src/api/client.ts`: optional GET abort signal/cache policy; existing callers remain compatible.
- `src/auth/authApi.ts`: additive company reporting context types.
- `src/utils/format.ts`: optional locale parameter without changing existing callers' default behavior.
- `src/index.css`: scoped forecast typography, chart legend, tooltip and responsive header styles.

Added `src/api/forecastApi.ts`, `src/utils/dashboardForecast.ts`, `src/components/dashboard/useDashboardForecast.ts`, `src/components/dashboard/forecastCopy.ts`, unit/browser tests, isolated fixtures and screenshots. No new dependency, navigation item, forecasting page, public-homepage change or statistical implementation was introduced.

## 4. Minimal backend additions

In the sibling backend repository:

- `AuthenticatedUserResponse` and `AuthService`: add read-only `companyTimeZoneId` and `companyCurrencyCode` to existing authenticated session responses. This avoids browser-timezone guessing and avoids requesting an ADMIN-only company profile for cashiers. No profile permissions were expanded.
- `WeeklyForecastResponse` and `ForecastDeliveryService`: add `enabled`, bound to the existing `app.forecasting.enabled` setting. When false, authorization/site resolution still runs, but snapshot reads are skipped and an explicitly disabled envelope is returned. This distinguishes disabled scheduling from genuine pending jobs; no feature default changed.
- `ReportingContextSessionTest` and `ForecastDeliveryTest`: verify the additive fields and disabled delivery, including existing/pending jobs.

No SQL, database migration, financial formula, model, training window, computation budget, schedule, lease, persistence or subscription changes were needed in Phase 4.

## 5. Financial KPI cards

Actual values remain primary. Weekly forecasts appear only for the exact current Monday-Sunday range, including an exact custom week; Today uses the matching API daily point. Monthly cards never show these forecasts, even when a month-to-date range happens to equal today or the week. Other custom/historical ranges have no mismatched KPI forecast. No client summation or numerical forecast generation occurs. Zero remains zero; negative profit remains negative; missing amounts are absent, not zero.

Secondary sales uses existing `#2563eb`; profit uses existing `#16a34a`. A small separator and smaller localized label preserve the current card structure and desktop alignment. No extra KPI card was added.

## 6. Existing chart enhancements

Actual sales/profit/cost retain blue/green/red and solid lines. Available forecast sales/profit use corresponding colors and `6 4` dashed strokes. Only usable targets enter the legend/plot. There is no forecast cost. Linear segments avoid spline overshoot, nulls are not connected, and the automatic vertical domain includes negative profit.

The tooltip displays only actual/forecast amounts present for its date, with localized money/date labels. Today's actual values receive an incomplete-day explanation. Future tooltips contain forecast values only. Completed-day original predictions remain unchanged for comparison.

## 7. Show forecast control

The compact localized checkbox starts checked when usable overlapping data exists. Keyboard Space toggles both available forecast lines, not actual series or KPI values. Toggling causes no API call, generation request, backend preference write or financial recalculation. Existing legend behavior was static and remains static, now with explicit dashed/solid keys.

## 8. Reporting filters

This week now selects Monday-Sunday, not Monday-today. Existing dashboard endpoints accept future end dates, so no historical validation was weakened. The chart independently includes all seven weekly date keys and strips future actual values returned as placeholder zeros. Today remains one daily point, not invented intraday forecasts. Month-to-date and custom charts show only overlapping forecast dates, never an extrapolated month. Historical non-overlap suppresses forecasts and avoids new forecast requests. Apply remains required for date/preset drafts; site changes refresh the currently applied reporting range immediately. Non-custom applied presets advance when the company-local date changes.

## 9. Location scope

Specific sites use `/forecasts/weekly/current?locationId=...`; All sites uses `/forecasts/weekly/current`. Accessible active site IDs from the same authenticated dashboard scope must exactly match the returned forecast scope. All-site totals require the backend's complete aggregate, every required site's usable target and all seven dates. Missing sites are never silently dropped or counted as zero. Sales/profit completeness is independent.

Actual request generations discard obsolete responses. Forecast effects carry a session/cache/scope identity; obsolete site results are ignored, and mismatched scopes cannot render with current actual data.

## 10. Business-local dates

Dates use the company's authenticated time-zone setting; absent settings use approved fixed UTC-05:00 (`Etc/GMT+5`), never the browser zone. Date-only strings are calendar keys; UTC-noon arithmetic/formatting avoids moving them across local dates or DST boundaries. Actual reporting dates are not reinterpreted or rewritten. Tests use a Tokyo browser and a UTC-05:00 company, plus near-midnight/year-boundary fixtures. A week transition rejects old-week forecast responses instead of displaying them as current.

## 11. API contract

`forecastApi.ts` represents enabled state, week start/end, currency, time zone, scope/site IDs, per-site targets, aggregate completeness, availability, validity, provisional state, daily values, totals, timestamps, definitions, warnings and reasons. The existing authenticated GET client is reused with `cache: no-store` and a 15-second abort deadline. Existing server `Cache-Control: no-store` remains unchanged. No new forecast endpoint or generation button was added. Backend and frontend additive contract changes should be delivered together; missing `enabled` fails closed without displaying numerical forecasts.

## 12. Availability and validity

- AVAILABLE and PROVISIONAL are usable only with CURRENT or NEW_DATA validity and valid scope/calendar/amounts.
- STALE/INVALID numerical values are withheld, even if supplied in a malformed response.
- Insufficient history explains the 28 eligible-day minimum without requiring daily transactions.
- No recorded/recent valid sales, data-quality problems, computation limits and failures map to concise localized messages, never raw enums/SQL/stack traces.
- PENDING/GENERATING (including overnight deferral) show preparation wording only when enabled and explicitly returned.
- Disabled envelopes and NOT_GENERATED without another actionable condition remain silent.
- Delivery errors have one nonblocking chart-level notice. Loading/failed forecasts do not gate actual totals, stock or tables.

## 13. Independent target handling

Sales can display while profit is unavailable, and vice versa. Aggregate incompleteness suppresses only the affected target. A provisional marker has an accessible limited-history explanation; no confidence percentages or technical model diagnostics are exposed. Repetitive errors are consolidated into one availability notice.

## 14. Internationalization

All new labels/messages use `forecastCopy`, selected through the existing language provider, following the existing calendar-copy pattern. Approved weekly/daily/show/provisional labels are present in English, French and Spanish. Existing actual-series terminology is reused. Forecasts and actual KPI/chart values use company currency with localized formatting; other existing formatter callers keep their defaults. Language changes reformat retained data without forecast refetching.

## 15. Responsive/accessibility verification

Verified desktop1440 and mobile390 in French/Spanish, plus English320. Seven KPI cards preserve existing responsive behavior; chart header wraps, checkbox remains reachable, legend wraps and amounts fit. Automated checks find no document horizontal overflow or clipping in forecast/KPI/chart controls. Existing product tables retain their own horizontal scrolling. Keyboard checkbox interaction is verified. Representative screenshots were visually inspected, including a current-day tooltip and narrow French/English layouts.

## 16. Frontend performance and freshness

One current-week envelope serves both targets. An in-memory authenticated-dashboard cache holds at most eight scope entries and deduplicates in-flight reads. Data has a 60-second freshness deadline measured from request start; refresh is scheduled for the remaining deadline, not a new full interval when revisiting a cached site. Focus/visibility also checks freshness. Stale cache state is not reused as fresh on scope return; request timeout bounds outstanding work. Errors retry after60 seconds. Identical cached results do not cause unnecessary forecast state updates.

Session/tenant changes recreate the dashboard/cache; location/week/context keys isolate results. No forecast financial data is written to local/session storage, IndexedDB or a service worker. Reopening the dashboard performs a new read. The frontend never estimates parameters, trains or generates predictions. No new charting library or runtime dependency was installed. The production bundle retains its preexisting large-chunk warning.

## 17. Automated results

| Check | Result |
| --- | --- |
| `node --test tests/*.test.mjs tests/*.test.js` | 33 passed,0 failed/skipped;9 forecasting-specific test groups plus existing regressions |
| Targeted ESLint across all Phase4 TypeScript/TSX files | Pass,0 errors/warnings |
| Whole-repository `npm run lint` | Fails on4 preexisting errors and13 warnings outside Phase4 changes |
| TypeScript and Vite `npm run build` | Pass; existing large-chunk warning |
| Backend auth, forecast delivery and security suites | 27 passed,0 failed/skipped |

Global lint errors are existing Fast Refresh exports in `AuthContext.tsx`/`I18nContext.tsx` and existing synchronous-effect updates in `InventoryPage.tsx`. They were not refactored as part of this scope. Phase4 introduced no new SQL; the earlier PostgreSQL suite was not rerun for these additive DTO/delivery changes.

## 18. Browser acceptance results

`tests/dashboardForecast.browser.mjs` passes with deterministic mocked GET responses using local Vite and headless Edge/Playwright. It covers:

- Weekly and Today KPI values, monthly suppression, historical/custom clipping, valid zero/negative profit and unchanged actual amounts.
- Dashed forecast lines, keyboard toggle, no toggle/language refetches, current-day incomplete tooltip and forecast-only future tooltip.
- Provisional, insufficient, pending/deferred, no-sales, stale, foreign scope, partial aggregate,503 and403 cases.
- Slow forecast completion with actual cards already available, rapid site changes, obsolete responses, TTL invalidation and Monday rollover.
- English/French/Spanish, USD/HTG, mobile overflow checks and cashier no-forecast access.
- A backend-free interactive demo; it makes no API network requests and preserves the browser's existing saved account token.

These are isolated UI/API-contract tests, not production traffic or full live Spring/PostgreSQL end-to-end tests. Real backend method security and delivery serialization are covered separately by the27 backend regressions.

Reproduction: start local Vite, set `FORECAST_PREVIEW_URL` if not port5203, then run `node tests/dashboardForecast.browser.mjs` with Playwright available. In this workspace the bundled Playwright package directory was provided through `NODE_PATH`; no project dependency was installed.

## 19. Screenshots and preview

26 screenshots are retained in `docs/screenshots/phase4/`. Representative files:

- [Desktop weekly](screenshots/phase4/weekly-en.png)
- [Current-day tooltip](screenshots/phase4/weekly-current-day-tooltip.png)
- [English mobile320](screenshots/phase4/weekly-en-mobile-320.png)
- [French mobile](screenshots/phase4/weekly-fr.png)
- [Spanish mobile](screenshots/phase4/weekly-es.png)
- [French HTG](screenshots/phase4/weekly-fr-htg.png)
- [Provisional](screenshots/phase4/provisional.png)
- [Insufficient history](screenshots/phase4/insufficient.png)
- [Monthly overlap](screenshots/phase4/monthly-en.png)
- [Historical range](screenshots/phase4/historical.png)
- [Hidden lines](screenshots/phase4/hidden-en.png)
- [Partial all-site aggregate](screenshots/phase4/partial.png)
- [Delivery error](screenshots/phase4/failure.png)
- [Zero forecasts](screenshots/phase4/zero-forecasts.png)

Interactive local mock preview: `http://127.0.0.1:5203/tests/fixtures/dashboard-forecast.html?demo=1`. Select This week and Apply to inspect full weekly cards/lines. This uses synthetic data entirely in memory, not a production account or enabled production scheduler. The normal application still needs its normal backend for real data.

## 20. Remaining limitations

No production deployment, real customer financial-data validation, native mobile-device run, screen-reader audit or live network/database end-to-end performance test was performed. Desktop/mobile verification uses Chromium-based Edge emulation; other browser engines remain to be checked. Client clock correctness affects current-week selection; inconsistent backend week/context responses fail closed. Freshness follows the bounded client policy, not instantaneous server push. Invalid configured time zones withhold forecasting rather than invent valid snapshots.

Whole-repository lint debt and the existing bundle warning remain. Earlier backend load tests showed that two workers could materially degrade concurrent SQL P95; Phase4 neither resolves that capacity issue nor changes the worker configuration. This report makes no production performance claim.

## 21. Phase 5 readiness

The local dashboard integration, additive contracts and isolated acceptance scenarios are ready for a separately approved Phase5 review. Before rollout, review the UI with the owner, coordinate backend/frontend contract delivery, validate real host/API capacity and choose a bounded worker setting consistent with the prior benchmark report. Production forecasting remains disabled by default. No Phase5 rollout steps were executed.

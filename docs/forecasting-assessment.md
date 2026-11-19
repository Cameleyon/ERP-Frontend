# Seven-day forecasting: assessment and approval proposal

Historical proposal: its mandatory owner-coverage assumption has since been replaced
by automatic system-derived historical coverage. See the backend report
`docs/forecasting-automatic-history.md` for the current implementation.

Date: 2026-11-17. Status: proposal only. No forecasting implementation approved.
Backend reviewed: C:/Users/jmarc/CameleyonDynamics/CAMELEYON-ERP.
Frontend reviewed: C:/Users/jmarc/CameleyonDynamics/cameleyon-erp-ui.
Existing uncommitted product-ranking work is separate and has not been changed by this assessment.
Production records, runtime timezone settings, and actual history lengths have not been audited.

## 1. Findings grounded in the application

| Area | Current implementation | Consequence |
| --- | --- | --- |
| Stack | Java 17, Spring Boot 3.2.0, Spring Data JPA, PostgreSQL, Flyway; build.gradle.kts has no forecasting library. | Keep the engine in the existing JVM application. |
| Sales | SaleService.createSale sums line subtotal and taxes into sales.total_amount. | The dashboard's current sales metric includes tax; do not silently replace it with revenue excluding tax. |
| Profit | SaleService.processSaleItem records line_profit = line_subtotal - line_cost_total using FIFO allocations; sales.total_profit_amount sums those values. | Forecast this recorded gross/contribution-style profit, not net profit or a fixed margin. |
| Costs | InventoryReceiptService divides all receipt cost lines by received quantity; FIFO allocates those costs to sales. | Some acquisition-related costs are capitalized in the recorded profit. Do not subtract these again or use today's product cost price. |
| History | DashboardService.getSalesTrend reads COMPLETED sales by tenant, accessible locations, and soldAt period. SaleRepository also supplies sum queries. | Reuse predicates and stored totals; add a grouped daily projection rather than loading every Sale for fitting. |
| Dates without sales | getSalesTrend initializes all requested dates to zero. | This reporting convenience cannot establish that historical capture was complete. Do not feed the padded response directly into forecasting. |
| Timestamps | Sale.soldAt is LocalDateTime; buildInitialSale uses LocalDateTime.now(). BaseEntity timestamps also use server-local time. | Historical timezone cannot be inferred from a timestamp alone. Dockerfile does not establish a business timezone. |
| Company/site zones | Company and CompanyLocation each have time_zone_id; CompanyTimeZoneService resolves company-local dates. Dashboard convenience endpoints use LocalDate.now(). | Define one documented business calendar and validate the production storage timezone before training. |
| Currency | Currency is on Company; CompanyProfileService permits changing it. Sale has no currency snapshot. | A mixed-currency history cannot be repaired or converted reliably from current records alone. |
| Cancellation | Cancellation restores inventory and changes status to CANCELLED; dashboards exclude that sale, including its original day. | Recompute affected historical days after cancellation. No distinct partial-refund ledger was found in the inspected sales model. |
| Tenant/site isolation | CurrentUserService derives company from authenticated account; CompanyLocationAccessService resolves allowed active sites and assignments. | Never accept companyId from the forecasting client; cache exact authorized scopes, not only companyId. |
| Access | SubscriptionAccessService handles trial, active, suspension, grace and expiry; some special features check STANDARD. DashboardController currently has no explicit subscription/method guard. | Explicitly guard the new endpoint rather than assuming dashboard routing supplies authorization. Preserve billing and existing access behavior. |
| Scheduling | @EnableScheduling and several existing schedulers are present. | PostgreSQL-backed jobs/snapshots fit deployment without new services. |
| UI/testing | DashboardPage, Recharts SalesTrendChart, shared filters, FR/EN/ES messages, JUnit/Mockito tests already exist. | Reuse those conventions. Add PostgreSQL integration coverage for aggregation and isolation. |

Key source files are under backend sales/service/SaleService.java,
dashboard/service/DashboardService.java, sales/repository/SaleRepository.java,
company/service/CompanyLocationAccessService.java, company/service/CompanyTimeZoneService.java,
company/service/CompanyProfileService.java, subscription/service/SubscriptionAccessService.java,
and inventory/service/InventoryReceiptService.java.

## 2. Recommended scope and metric definitions

- Fixed seven future calendar days beginning on the business-local day of generation.
  Training ends at yesterday's local midnight: today's partial sales never enter fitting.
  Label today's forecast as a full-day forecast, not remaining-day sales.
- Forecast total sales INCLUDING tax to match the present dashboard, with explicit
  metric metadata and UI labeling. Excluding tax is a reasonable alternative but
  requires approval and a distinct definition; no reporting definition changes silently.
- Forecast recorded daily profit directly, independently of sales. It is not net
  profit: taxes are excluded and costs reflect FIFO inventory cost allocations.
  Negative profit remains possible. Do not estimate it as sales times a fixed margin.
- Forecasting cost components separately adds complexity and reconciliation work.
  Defer it until direct forecasts are benchmarked; independent forecasts are not
  a forecast accounting identity or a guarantee of future margin.
- Initial scope: current authorized set of active company sites, plus a single
  authorized site selected using the existing filter. Never expose an all-company
  snapshot to a site-restricted user. Include the exact site set in scope identity.
- Start with company ADMIN access, subject to existing subscription checks.
  Do not require a new paid plan or change trial, prices, or billing rules.
  Cashier access needs a separate explicit business decision.
- Aggregate directly at the selected scope. Do not claim independently forecast
  site totals will sum to a separately forecast company total. Hierarchical
  reconciliation and product-level forecasts are out of scope.
- Multi-zone sites: use the company business calendar initially. Show the
  selected timezone; site-local forecasting calendars can be added later.

## 3. Historical preparation and eligibility

Use a configurable maximum window, initially 180 completed calendar days.
Keep daily BigDecimal aggregates, convert to double only inside fitting, round
forecasts to currency precision at output, and total the displayed daily values.

Every date must be classified as observed-complete, confirmed-zero/closed,
unknown, or partial. Sales on a day prove transactions occurred, not that all
transactions were recorded. There is no existing daily completeness or opening
calendar mechanism in the inspected code.

Propose an owner-confirmed continuous recording start date, with explicit unknown
date exceptions and known closure rules. Do not backfill dates before that date
with zero. A complete day with no COMPLETED sales is zero; an unknown or partial
day is not zero. Closures count as zero on a calendar-day series, not removed dates.
The owner attestation and exception UX require approval before implementation.

For v1 use the latest contiguous eligible daily segment; no automatic imputation
and no compression of gaps. If recent unknown dates prevent a useful segment,
return DATA_INCOMPLETE. Forecasts must stop rather than invent missing records.
Persist data-quality warnings and the confirmed coverage policy with the result.

Resolve production storage timezone and historic changes before converting soldAt.
For future records, propose storing a UTC instant plus the business timezone/date
needed for stable aggregation. Conversion/backfill must follow an approved policy;
never reinterpret historical LocalDateTime values as UTC without evidence.
Timezone or currency changes invalidate the affected snapshot and may require a
new eligible history segment. Currency snapshots/change boundaries need a scoped
data fix; historical currency cannot be reconstructed from amounts alone.

Initial thresholds are conservative product defaults, not statistical laws:
- Under 28 complete consecutive days: INSUFFICIENT_HISTORY, no numeric forecast.
- 28-41 days: optional provisional naive/SES estimate, explicitly limited evidence.
- 42-83 days: evaluate naive, seasonal naive, SES, Holt, and damped Holt when valid;
  at least three weekly origins with a minimum 21-day training prefix.
- At least 84 days: also evaluate additive weekly Holt-Winters, with/without
  damping; require at least 56 training days and four seven-day validation origins.
- All-zero history: identify inactive/zero history, not high-confidence forecasting.
  Intermittent history: retain genuine zero days, flag low support and let simple
  baselines win. No Croston model is required in this scope.

## 4. Statistical approach and Java library decision

Candidates: naive, weekly seasonal naive, SES, additive Holt, damped additive Holt,
and additive weekly Holt-Winters with/without damped trend. Weekly period is seven.
Seasonality is eligible, not mandatory; it must improve out-of-sample results.
Avoid multiplicative models initially because zeros and negative profit make
their assumptions inappropriate. Sales forecasts may be clipped at zero; apply
the identical clipping during evaluation. Never clip legitimate negative profit.

Libraries reviewed:
- Workday timeseries-forecast implements ARIMA, not the required smoothing family.
  It is not a suitable dependency for this feature.
- Signaflo java-timeseries advertises early development. No verified complete
  supported SES/Holt/damped/additive-weekly workflow was established in this review.
  Do not introduce it based only on its name.
- IMSL JMSL documents additive/multiplicative Holt-Winters; verify licensing,
  Java 17 support, damping, zero/negative handling and initialization before adoption.
  It adds a vendor dependency and is not the default recommendation.

Recommendation: a small internal Java implementation of the published recurrences,
not a general statistical framework. These short linear-time recurrences allow
consistent negative-profit behavior, bounded computation and precisely tested
initialization. This recommendation needs explicit approval, with the mathematical
tests below as a release gate. Use no Python runtime or external forecasting API.

Define a small Forecaster interface returning immutable fitted state and a fixed
seven-value result. Separate HistoryService, EvaluationService and ForecastService;
avoid a plugin registry, expression language, or a generic model framework.

For parameter fitting use deterministic bounded coarse-to-fine search, initially
limited to a few hundred parameter combinations per model/fold. Initialize levels,
trend and zero-mean seasonal factors using that training prefix only. Fit parameters
against training one-step errors; select methods using withheld seven-step errors.
Bounds, initialization, damping range and candidate budget must be documented and
verified in a prototype. Reject non-finite, divergent or invalid parameterizations.
Typical fitting cost is O(models x folds x parameter candidates x history length).

Use independent hand-calculated SES/Holt fixtures and published additive/damped
examples for validation, with identical initialization and tolerances. Do not
claim parity with a library whose optimizer or starting states differ.

## 5. Evaluation and selection

Use rolling origins spaced seven days apart, forecasting all seven future days
at each origin. Cap at eight recent origins with common origins across competing
models. Report error by horizon h=1..7, pooled daily error and weekly-total error.
Never use random splits or future-dependent initialization, interpolation or tuning.

Select separately for sales and profit by pooled MAE in currency units. Include
naive and weekly seasonal-naive as eligible winners. Prefer the simpler model on
near ties; a tentative 5% improvement requirement for a more complex method is a
configurable policy, not an established guarantee. Retain a baseline when smoothing
does not improve it, and suppress unreliable/divergent forecasts.

Report MAE, signed bias (forecast minus actual), and MASE when the training-prefix
naive scaling denominator is nonzero. Compute the denominator within each fold
with the same scaling lag across candidates. For sales, WAPE = sum absolute error /
sum absolute actuals is supplementary and null when its denominator is zero.
For profit, avoid a misleading percentage when values are negative or near zero;
prefer MAE/bias. Never show 100 minus WAPE as a universal accuracy score.

Selecting a winner and displaying its score on the same folds is optimistic.
Label initial scores as backtested estimates; reserve the newest seven-day block
for a final evaluation when history permits, and monitor true subsequent outcomes.
Older backtests also use today's cancellation-adjusted ledger; without historical
as-of snapshots they cannot reconstruct what was known before a later cancellation.

Uncertainty is optional, not fabricated. Initially return null interval bounds
when horizon-specific residuals/coverage evidence is insufficient. Later use
validated residual-based or additive-state-space intervals with separate coverage
checks by horizon. Weekly-total intervals require joint error paths; do not sum
daily bounds. A fitted-model interval does not cover all model-selection/data risks.

## 6. Generation, persistence and API

Proposed module: com.cameleyon.erp.forecasting in the existing backend.
Proposed endpoint: GET /api/dashboard/forecast?locationId=...
No client companyId, unrestricted site IDs, model parameters, or horizon override.
Return exactly seven dated points when available; otherwise a typed availability
status such as INSUFFICIENT_HISTORY, DATA_INCOMPLETE, GENERATING, or FAILED.

Response metadata: schema/model version, generatedAt UTC instant, trainedThrough,
forecast start/end, currency, business timezone, exact authorized scope, seven
sales/profit points, seven-day totals, separate historical error summaries, data
warnings, freshness, optional interval bounds and confidence limitations.
No raw customer data, account information, SQL errors or stack traces in responses.

Persist forecast snapshots in PostgreSQL, keyed by company, normalized authorized
scope, local as-of date, currency, timezone and algorithm/metric version. Store a
training revision/fingerprint. Use a unique key plus short database-backed worker
lease to prevent concurrent duplicate fits; recover abandoned leases after restart.
Persist daily points/metrics as JSONB or child rows with a seven-point invariant.

A bounded scheduled worker generates daily after business-local midnight, with a
short delay for late transactions. It must use explicit tenant/scope arguments,
not request-thread authentication. Start with company-wide and active-site scopes;
generate unusual authorized subsets lazily through the same job/lease mechanism.
API reads return snapshots or GENERATING, never block normal sales on fitting.
Batch work, use a bounded worker pool and enforce history/parameter/runtime caps.
No Redis, message broker, new microservice or deployment infrastructure.

Committed cancellations, changes to history coverage, currency/timezone or site
membership mark affected results stale. Refresh through a bounded worker; never
fit inside the sale transaction. Verify source revision before publishing results.
Document late corrections and purge/deactivation cleanup; invalid scope results
must not be served even if a snapshot still exists.

Performance targets for the pilot: one grouped history read per scope; no refit
on repeated reads; forecast reads p95 below 300ms after warmup and generation
under 2 seconds per 180-day scope on production-equivalent hardware. These are
targets to benchmark, not measured results. Existing sales(company_id, location_id,
sold_at) index is a starting point; add indexes only after EXPLAIN evidence.

## 7. Frontend proposal

Add a Seven-day outlook section in DashboardPage below the historical trend and
above product rankings. Reuse Recharts, currency formatting, language messages
and the site filter. Historical date filters must not silently redefine the
future horizon: label that forecasts always use the latest completed history.

Show two totals, sales and recorded profit, and compact historical/forecast charts
with a clear visual boundary and future dates. Mobile layouts stack. Include
generation time, business timezone, limited-data/stale/unavailable states, concise
decision-support wording and optional validated bands. Do not label recorded
profit as net profit or expose alpha/beta/gamma on the main screen.
A failure in this independent request must not hide sales, stock or other dashboard
sections. No public homepage changes.

## 8. Phased delivery and approval gates

### Phase 1: Data contract and calendar readiness
- Objective: establish trustworthy daily input and scope definitions.
- Backend: grouped totals projection reusing existing status/tenant/site predicates;
  explicit time boundary policy; coverage and currency-change detection contract.
- Frontend: only approved owner controls for coverage start and unknown/closed days.
- Database: scoped Flyway migrations for coverage metadata and approved timestamp/
  currency fixes; do not retrofit dates/currency by guessing.
- Tests: daily reconciliation to existing reports, midnight/DST boundaries,
  cancellation restatement, unknown vs zero, changed currency, tenant/site rejection.
- Dependencies: approve metrics, access roles, calendar and historical remediation.
- Acceptance: eligible days reconcile exactly; unknown days remain unknown; no
  cross-tenant data; all time/currency assumptions documented and verified.

### Phase 2: Pure Java models and evaluation
- Objective: deterministic, validated seven-day models without production exposure.
- Backend: small model interface, baselines, SES, Holt/damped Holt, additive
  Holt-Winters, bounded fitting and rolling-origin evaluation.
- Frontend/database: none.
- Tests: hand-verified mathematics, initialization, constant/zero/trend/weekly
  patterns, intermittent series, negative profit, invalid/short data, no leakage,
  separate horizon metrics, baseline fallback, reproducibility and computation cap.
- Dependencies: Phase 1 contract and approval of internal implementation.
- Acceptance: independent numerical fixtures pass; strongest actual baseline can
  win; invalid models fail safely; exactly seven forecasts; pilot benchmark passes.

### Phase 3: Secure snapshots and delivery API
- Objective: daily reusable results without slowing sales operations.
- Backend: job/snapshot service, bounded scheduler, unique claims/leases, source
  revision invalidation, guarded endpoint and safe error states.
- Frontend: API types/client only; no full dashboard redesign.
- Database: snapshot/job migration and justified indexes; integrate cleanup.
- Tests: PostgreSQL aggregation/locking, concurrent requests, restart recovery,
  stale/cancelled histories, subscription status, role/site/tenant access, API shape.
- Dependencies: Phases 1-2 and measured generation budget.
- Acceptance: repeated reads never refit, jobs recover, correct scopes only,
  stale results identified, failure cannot roll back sales/inventory work.

### Phase 4: Operational dashboard integration
- Objective: understandable FR/EN/ES decision support.
- Backend: stable response DTOs from Phase 3; no billing changes.
- Frontend: forecast section, two totals/charts, seven dates, error/empty/stale
  states, labels and accessibility using existing design conventions.
- Database: none unless an approved contract defect requires it.
- Tests: API integration, locale/currency/date rendering, mobile/desktop visual
  checks, filter scope changes, negative profit and unavailable forecast isolation.
- Dependencies: Phase 3 endpoint and approval of UI placement.
- Acceptance: values match API totals; all seven dates clear; no promise of
  guaranteed outcomes; no breakage to existing dashboard or public homepage.

### Phase 5: Controlled pilot and uncertainty decision
- Objective: validate real usefulness before broad activation.
- Backend: disabled-by-default rollout setting, safe monitoring, stored subsequent
  actual-error evaluation, input drift checks and optional calibrated intervals.
- Frontend: reliability wording driven by evidence; intervals only if supported.
- Database: only additional evaluation/coverage records justified by the pilot.
- Tests: prospective baseline comparison, coverage by horizon, load and failure
  tests, currency/timezone changes, purge cleanup and rollback.
- Dependencies: Phases 1-4, representative consenting pilot companies and history.
- Acceptance: recorded latency within agreed budgets; no optimistic accuracy claim;
  real forecasts tracked against actuals; if models do not beat baselines, retain
  baselines or show unavailable rather than claiming forecasting improvement.

## 9. Decisions required before Phase 1

1. Keep sales including tax for dashboard consistency, or explicitly introduce
   a separate excluding-tax sales forecast? Recommendation: preserve current metric.
2. Confirm the forecast profit label/definition: recorded subtotal minus FIFO
   allocated receipt costs, not net profit.
3. Approve owner-confirmed continuous history plus unknown/closed-day exceptions?
   Without completeness evidence, absence of transactions cannot mean zero.
4. Approve the production timestamp/currency audit and any necessary scoped fixes
   before exposing business-local forecasts.
5. Approve ADMIN-only access with exact accessible-site filtering, including
   current eligible trial/active subscriptions and no new paid-plan rule.
6. Approve conservative history thresholds, possible baseline winner and independent
   sales/profit models; approve internally implemented smoothing after numeric tests.
7. Approve company-calendar seven-day horizon and dashboard placement. Confirm
   whether different site-local calendars must be supported in the first release.

## 10. External primary references

- Published smoothing methods: https://otexts.com/fpp3/exponential-smoothing.html
- Backtesting, baselines and error measures: https://otexts.com/fpp3/toolbox.html
- Reference Holt-Winters recurrence/initialization: https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/HoltWinters.html
- Java library scope: https://github.com/Workday/timeseries-forecast
- Java library maturity disclosure: https://github.com/signaflo/java-timeseries
- Java Holt-Winters implementation candidate: https://help.imsl.com/java/2022.1/apidocs/com/imsl/stat/HoltWintersExponentialSmoothing.html

No production code or database changes were made for this assessment.
No forecasting tests were executed because forecasting is not implemented.
Await approval before starting Phase 1.

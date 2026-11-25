import { useEffect, useRef, useState } from "react"
import { apiGet } from "../../api/client"
import type { CompanyLocationResponse } from "../../api/companyLocationsApi"
import { useI18n } from "../../i18n/I18nContext"
import { setupCopy } from "../../i18n/setupCopy"
import { isSetupStatus, setupStep, type SetupAction, type SetupStatus } from "../../utils/setupGuide"

export default function SetupGuide({ ownerKey, sites, siteId, onAction }: {
  ownerKey: string; sites: CompanyLocationResponse[]; siteId?: number; onAction: (action: SetupAction) => void
}) {
  const { language } = useI18n()
  const text = setupCopy[language]
  const key = `cameleyon:hide-setup:${ownerKey}`
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(key) ?? "" } catch { return "" }
  })
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading")
  const [revision, setRevision] = useState(0)
  const showButton = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  function refresh() {
    setPhase("loading")
    setRevision(value => value + 1)
  }

  useEffect(() => {
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    apiGet<SetupStatus>("/dashboard/setup-status", { signal: controller.signal, cache: "no-store" })
      .then(result => {
        if (controller.signal.aborted) return
        if (!isSetupStatus(result)) {
          setPhase("error"); return
        }
        setStatus(result)
        setPhase("ready")
      })
      .catch(() => { if (!controller.signal.aborted) setPhase("error") })
    return () => controller.abort()
  }, [revision])

  function toggle(next: string) {
    setHidden(next)
    try { if (next) localStorage.setItem(key, next); else localStorage.removeItem(key) } catch { /* Presentation only. */ }
  }

  useEffect(() => {
    if (status?.hasCurrency && hidden === "currency") toggle("")
  }, [hidden, status])

  if (!status) return null
  const confirmedSite = sites.find(site => site.id === siteId && site.active)?.id
  const action = setupStep(status, confirmedSite, sites.find(site => site.primaryLocation && site.active)?.id)
  if (!action) return null
  const repair = action.kind === "currency" && status.hasEverCompletedSale
  if (!repair && (action.kind === "currency" ? hidden === "currency" : hidden === "setup")) {
    return <button ref={showButton} type="button" className="link-button setup-show" onClick={() => {
      toggle(""); requestAnimationFrame(() => heading.current?.focus())
    }}>{text.show}</button>
  }
  const canHide = !repair
  const siteName = action.kind === "sale" ? sites.find(site => site.id === action.siteId && site.active)?.name : undefined
  const reason = {
    currency: text.currencyReason, product: text.productReason, products: text.inactiveOnly,
    opening: text.openingReason, inventory: text.noStock, manage: text.siteBlocked,
    sale: siteName ? text.saleReason.replace("{site}", siteName) : "",
  }[action.kind]
  const milestones = [status.hasCurrency, status.hasProduct, status.hasRecordedStock, status.hasEverCompletedSale]
  const completed = milestones.filter(Boolean).length
  return <section className="card setup-guide" aria-labelledby="setup-heading">
    <div>
      <h2 ref={heading} tabIndex={-1} id="setup-heading">{text.title}</h2>
      {!repair && <p>{text.progress.replace("{n}", String(completed))}</p>}
      <p role="status">{phase === "loading" ? text.loading : phase === "error" ? text.failed : reason}</p>
      {!repair && <ul className="setup-milestones" role="list">
        {text.milestones.map((label, index) =>
          <li key={label} aria-label={`${label}: ${milestones[index] ? text.done : text.notDone}`}>
            <span aria-hidden="true">{milestones[index] ? "✓ " : "○ "}</span>{label}
          </li>)}
      </ul>}
    </div>
    <div className="setup-actions">
      {phase === "error" ? <button type="button" onClick={refresh}>{text.retry}</button> :
        <button type="button" disabled={phase !== "ready" || action.kind === "sale" && !siteName} onClick={() => onAction(action)}>
          {text[action.kind]}
        </button>}
      {canHide && <button type="button" className="link-button" onClick={() => {
        toggle(action.kind === "currency" ? "currency" : "setup")
        requestAnimationFrame(() => showButton.current?.focus())
      }}>{text.hide}</button>}
    </div>
  </section>
}

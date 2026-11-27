import { useEffect, useRef, useState } from "react"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import { getCompanyProfile } from "../api/companyProfileApi"
import BusinessCalendarSettings from "../components/profile/BusinessCalendarSettings"
import { calendarCopy } from "../components/profile/calendarCopy"
import ErrorMessage from "../components/common/ErrorMessage"
import { useI18n } from "../i18n/I18nContext"
import { DEFAULT_COMPANY_TIME_ZONE } from "../utils/companyLocalization"
import { useMenuSiteChange, type MenuSiteSelection } from "../components/layout/useMenuSiteChange"
import "../components/inventory/stockWorkspace.css"
import "../components/profile/adminWorkspace.css"

export default function SettingsPage({ initialSiteId, menuSelection, onSiteChange }: {
  initialSiteId?: number | null; menuSelection?: MenuSiteSelection; onSiteChange?: (id: number) => void
} = {}) {
  const { language } = useI18n()
  const text = calendarCopy[language]
  const [sites, setSites] = useState<CompanyLocationResponse[]>([])
  const [site, setSite] = useState("")
  const [zone, setZone] = useState(DEFAULT_COMPANY_TIME_ZONE)
  const [view, setView] = useState<"calendar" | "hours">("calendar")
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [startingSite] = useState(initialSiteId)
  const edited = useRef(false)
  useEffect(() => {
    let active = true
    Promise.all([getAccessibleCompanyLocations(), getCompanyProfile()]).then(([rows, profile]) => {
      if (active) {
        setSites(rows)
        const preferred = rows.find(row => row.id === startingSite) ?? rows[0]
        setSite(preferred ? String(preferred.id) : "")
        setZone(profile.timeZoneId || DEFAULT_COMPANY_TIME_ZONE)
        setLoading(false)
      }
    }).catch(() => { if (active) { setFailed(true); setLoading(false) } })
    return () => { active = false }
  }, [startingSite])
  useMenuSiteChange(menuSelection, next => {
    if (edited.current || loading) return
    const target = sites.find(row => row.id === next) ?? sites[0]
    if (target) setSite(String(target.id))
  })
  const selected = sites.find(row => String(row.id) === site)
  return <div className="stock-workspace admin-workspace">
    <div className="page-title-row workspace-page-title">
      <h1>{text.settings}</h1>
      {selected && <select className="workspace-page-site" aria-label={text.site} value={site} onChange={event => {
        edited.current = false
        setSite(event.target.value)
        onSiteChange?.(Number(event.target.value))
      }}>
        {sites.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select>}
    </div>
    {failed && <ErrorMessage message={text.error} onDismiss={() => setFailed(false)} />}
    {loading ? <p role="status">{text.loading}</p> : selected ? <>
      <nav className="stock-view-switch settings-tabs" aria-label={text.settings}>
        {(["calendar", "hours"] as const).map(key => <button type="button" key={key} aria-pressed={view === key}
          onClick={() => { if (key !== view) edited.current = false; setView(key) }}>{text[key]}</button>)}
      </nav>
      <div onChangeCapture={event => {
        if (event.target instanceof HTMLElement && event.target.closest("form")) edited.current = true
      }}>
        <BusinessCalendarSettings key={site + "|" + view} site={selected.id} siteName={selected.name} zone={zone} view={view}
          onSaved={() => { edited.current = false }} />
      </div>
    </> : !failed && <p>{text.noSites}</p>}
  </div>
}

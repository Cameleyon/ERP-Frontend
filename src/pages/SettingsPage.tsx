import { useEffect, useState } from "react"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import { getCompanyProfile } from "../api/companyProfileApi"
import BusinessCalendarSettings from "../components/profile/BusinessCalendarSettings"
import { calendarCopy } from "../components/profile/calendarCopy"
import ErrorMessage from "../components/common/ErrorMessage"
import { useI18n } from "../i18n/I18nContext"
import { DEFAULT_COMPANY_TIME_ZONE } from "../utils/companyLocalization"

export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const { language } = useI18n()
  const text = calendarCopy[language]
  const [sites, setSites] = useState<CompanyLocationResponse[]>([])
  const [site, setSite] = useState("")
  const [zone, setZone] = useState(DEFAULT_COMPANY_TIME_ZONE)
  const [view, setView] = useState<"calendar" | "hours">("calendar")
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    Promise.all([getAccessibleCompanyLocations(), getCompanyProfile()]).then(([rows, profile]) => {
      if (active) { setSites(rows); setSite(rows[0] ? String(rows[0].id) : ""); setZone(profile.timeZoneId || DEFAULT_COMPANY_TIME_ZONE); setLoading(false) }
    }).catch(() => { if (active) { setFailed(true); setLoading(false) } })
    return () => { active = false }
  }, [])
  const selected = sites.find(row => String(row.id) === site)
  return <div>
    <div className="page-title-row"><h1>{text.settings}</h1><button type="button" onClick={onBack}>{text.back}</button></div>
    {failed && <ErrorMessage message={text.error} onDismiss={() => setFailed(false)} />}
    {loading ? <p role="status">{text.loading}</p> : selected ? <>
      <label className="settings-site-select">{text.site}<select value={site} onChange={event => setSite(event.target.value)}>
        {sites.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <nav className="settings-tabs" aria-label={text.settings}>
        {(["calendar", "hours"] as const).map(key => <button type="button" key={key} aria-pressed={view === key}
          onClick={() => setView(key)}>{text[key]}</button>)}
      </nav>
      <BusinessCalendarSettings key={site + "|" + view} site={selected.id} zone={zone} view={view} />
    </> : !failed && <p>{text.noSites}</p>}
  </div>
}

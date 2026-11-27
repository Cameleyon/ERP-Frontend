import { useState } from "react"
import type { CompanyLocationResponse } from "../../api/companyLocationsApi"
import { useI18n } from "../../i18n/I18nContext"
import { internalCopy } from "../../i18n/internalCopy"

type Preset = "today" | "this-week" | "this-month" | "custom"

type Props = {
  preset: Preset
  appliedPreset: Preset
  startDate: string
  endDate: string
  locations: CompanyLocationResponse[]
  locationId: string
  siteLabel: string
  onLocationChange: (value: string) => void
  onPresetChange: (value: Preset) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onApply: () => void
}

export default function DashboardFilters({
  preset,
  appliedPreset,
  startDate,
  endDate,
  locations,
  locationId,
  siteLabel,
  onLocationChange,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onApply,
}: Props) {
  const { copy, language } = useI18n()
  const text = copy.dashboardFilters
  const labels = internalCopy[language]
  const [initiallyOpen] = useState(() => matchMedia("(min-width: 769px)").matches)
  const presets = { today: text.today, "this-week": text.thisWeek, "this-month": text.thisMonth, custom: text.custom }

  return (
    <details className="workspace-panel dashboard-filter-panel" open={initiallyOpen}>
      <summary>{labels.filters} · {siteLabel} · {presets[appliedPreset]}</summary>
      <div className="dashboard-filter-fields">
        {locations.length > 0 && <label>
          <span>{text.location}</span>
          <select aria-label={text.location} value={locationId} onChange={event => onLocationChange(event.target.value)}>
            <option value="">{text.allLocations}</option>
            {locations.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </label>}
        <label>
          <span>{labels.period}</span>
          <select aria-label={labels.period} value={preset} onChange={event => onPresetChange(event.target.value as Preset)}>
            {(Object.keys(presets) as Preset[]).map(value => <option value={value} key={value}>{presets[value]}</option>)}
          </select>
        </label>
        <label><span>{text.startDate}</span><input type="date" value={startDate} onChange={event => onStartDateChange(event.target.value)} /></label>
        <label><span>{text.endDate}</span><input type="date" value={endDate} onChange={event => onEndDateChange(event.target.value)} /></label>
        <button className="workspace-primary" type="button" onClick={onApply}>{text.apply}</button>
      </div>
      <p className="dashboard-muted dashboard-filter-note">{labels.filterNote}</p>
    </details>
  )
}

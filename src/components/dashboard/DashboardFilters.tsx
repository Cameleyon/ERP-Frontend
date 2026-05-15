import { useI18n } from "../../i18n/I18nContext"

type Preset = "today" | "this-week" | "this-month" | "custom"

type Props = {
  preset: Preset
  startDate: string
  endDate: string
  onPresetChange: (value: Preset) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onApply: () => void
}

export default function DashboardFilters({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onApply,
}: Props) {
  const { copy } = useI18n()
  const text = copy.dashboardFilters

  return (
    <div className="card dashboard-filters">
      <label>
        <span>{text.title}</span>
        <select value={preset} onChange={(e) => onPresetChange(e.target.value as Preset)}>
          <option value="today">{text.today}</option>
          <option value="this-week">{text.thisWeek}</option>
          <option value="this-month">{text.thisMonth}</option>
          <option value="custom">{text.custom}</option>
        </select>
      </label>

      <label>
        <span>{text.startDate}</span>
        <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
      </label>

      <label>
        <span>{text.endDate}</span>
        <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
      </label>

      <div className="dashboard-filter-actions">
        <button type="button" onClick={onApply}>{text.apply}</button>
      </div>
    </div>
  )
}

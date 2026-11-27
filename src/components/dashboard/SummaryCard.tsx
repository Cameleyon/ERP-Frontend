type Props = {
  title: string
  value: string | number
  description?: string
  featured?: boolean
  forecast?: { label: string; value: string; metric: "sales" | "profit"; provisional?: string; explanation?: string }
}

export default function SummaryCard({ title, value, description, featured = false, forecast }: Props) {
  return (
    <div className={`workspace-panel summary-card ${featured ? "dashboard-featured-kpi" : ""}`.trim()}>
      <div className="summary-title">{title}</div>
      <div className="summary-value">{value}</div>
      {description && <div className="summary-forecast-label">{description}</div>}
      {forecast && <div className={`summary-forecast summary-forecast-${forecast.metric}`}>
        <div className="summary-forecast-label">{forecast.label}</div>
        <div className="summary-forecast-value">{forecast.value}</div>
        {forecast.provisional && <small title={forecast.explanation}>{forecast.provisional}
          <span className="visually-hidden">. {forecast.explanation}</span></small>}
      </div>}
    </div>
  )
}

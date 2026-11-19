type Props = {
  title: string
  value: string | number
  tone?: "default" | "danger"
  forecast?: { label: string; value: string; metric: "sales" | "profit"; provisional?: string; explanation?: string }
}

export default function SummaryCard({ title, value, tone = "default", forecast }: Props) {
  return (
    <div className={`card summary-card ${tone === "danger" ? "summary-card-danger" : ""}`}>
      <div className="summary-title">{title}</div>
      <div className="summary-value">{value}</div>
      {forecast && <div className={`summary-forecast summary-forecast-${forecast.metric}`}>
        <div className="summary-forecast-label">{forecast.label}</div>
        <div className="summary-forecast-value">{forecast.value}</div>
        {forecast.provisional && <small title={forecast.explanation}>{forecast.provisional}
          <span className="visually-hidden">. {forecast.explanation}</span></small>}
      </div>}
    </div>
  )
}

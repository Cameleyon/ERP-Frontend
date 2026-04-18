type Props = {
  title: string
  value: string | number
  tone?: "default" | "danger"
}

export default function SummaryCard({ title, value, tone = "default" }: Props) {
  return (
    <div className={`card summary-card ${tone === "danger" ? "summary-card-danger" : ""}`}>
      <div className="summary-title">{title}</div>
      <div className="summary-value">{value}</div>
    </div>
  )
}

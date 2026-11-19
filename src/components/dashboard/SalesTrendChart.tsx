import { useState } from "react"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency } from "../../utils/format"
import { formatBusinessDate, type TrendRow } from "../../utils/dashboardForecast"
import { forecastCopy } from "./forecastCopy"

type Props = { rows: TrendRow[]; currency: string; notice?: string; loading?: boolean }
const colors = { sales: "#2563eb", profit: "#16a34a", cost: "#dc2626" }

export default function SalesTrendChart({ rows, currency, notice, loading }: Props) {
  const { copy, language } = useI18n()
  const text = copy.salesTrendChart, forecast = forecastCopy[language]
  const [showForecast, setShowForecast] = useState(true)
  const hasSalesForecast = rows.some(row => row.forecastSales !== null)
  const hasProfitForecast = rows.some(row => row.forecastProfit !== null)
  const hasForecast = hasSalesForecast || hasProfitForecast
  const hasValues = rows.some(row => [row.totalSales, row.totalCost, row.totalProfit, row.forecastSales, row.forecastProfit].some(value => value !== null))
  const series = [
    { key: "totalSales", label: text.sales, color: colors.sales },
    { key: "totalCost", label: text.cost, color: colors.cost },
    { key: "totalProfit", label: text.profit, color: colors.profit },
    ...(hasForecast && showForecast ? [
      ...(hasSalesForecast ? [{ key: "forecastSales", label: forecast.sales, color: colors.sales }] : []),
      ...(hasProfitForecast ? [{ key: "forecastProfit", label: forecast.profit, color: colors.profit }] : []),
    ] : []),
  ]
  return <div className="card sales-trend-card">
    <div className="sales-trend-header">
      <h3>{text.title}</h3>
      {hasForecast && <label className="forecast-toggle"><input type="checkbox" checked={showForecast}
        onChange={event => setShowForecast(event.target.checked)} />{forecast.show}</label>}
    </div>
    {(loading || notice) && <p className="forecast-notice" role="status">{loading ? forecast.loading : notice}</p>}
    {!hasValues ? <p>{text.empty}</p> : <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={date => formatBusinessDate(String(date), language)} minTickGap={20} />
          <YAxis width={55} />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length || !label) return null
            const point = rows.find(row => row.date === String(label))
            return <div className="forecast-chart-tooltip">
              <strong>{formatBusinessDate(String(label), language, true)}</strong>
              {series.map(item => {
                const value = point?.[item.key as keyof TrendRow]
                return typeof value === "number" ? <div key={item.key}>
                  <span className={`chart-line-key ${item.key.startsWith("forecast") ? "is-forecast" : ""}`} style={{ borderColor: item.color }} />
                  {item.label}: <b>{formatCurrency(value, currency, language)}</b>
                </div> : null
              })}
              {point?.incomplete && [point.totalSales, point.totalProfit, point.totalCost].some(value => value !== null)
                && <small>{forecast.incomplete}</small>}
            </div>
          }} />
          <Legend content={() => <div className="forecast-chart-legend">{series.map(item => <span key={item.key}>
            <span className={`chart-line-key ${item.key.startsWith("forecast") ? "is-forecast" : ""}`} style={{ borderColor: item.color }} />{item.label}
          </span>)}</div>} />
          <Line type="linear" dataKey="totalSales" stroke={colors.sales} strokeWidth={3} name={text.sales} connectNulls={false} isAnimationActive={false} />
          <Line type="linear" dataKey="totalCost" stroke={colors.cost} strokeWidth={3} name={text.cost} connectNulls={false} isAnimationActive={false} />
          <Line type="linear" dataKey="totalProfit" stroke={colors.profit} strokeWidth={3} name={text.profit} connectNulls={false} isAnimationActive={false} />
          {hasForecast && showForecast && <>
            {hasSalesForecast && <Line type="linear" dataKey="forecastSales" stroke={colors.sales} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: "white" }} name={forecast.sales} connectNulls={false} isAnimationActive={false} />}
            {hasProfitForecast && <Line type="linear" dataKey="forecastProfit" stroke={colors.profit} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: "white" }} name={forecast.profit} connectNulls={false} isAnimationActive={false} />}
          </>}
        </LineChart>
      </ResponsiveContainer>
    </div>}
  </div>
}

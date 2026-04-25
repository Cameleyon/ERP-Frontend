import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { SalesTrendPointResponse } from "../../api/dashboardApi"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency } from "../../utils/format"

type Props = {
  rows: SalesTrendPointResponse[]
}

export default function SalesTrendChart({ rows }: Props) {
  const { copy } = useI18n()
  const text = copy.salesTrendChart

  return (
    <div className="card">
      <h3>{text.title}</h3>

      {rows.length === 0 ? (
        <p>{text.empty}</p>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
              <Legend />
              <Line type="monotone" dataKey="totalSales" stroke="#2563eb" strokeWidth={3} name={text.sales} />
              <Line type="monotone" dataKey="totalCost" stroke="#dc2626" strokeWidth={3} name={text.cost} />
              <Line type="monotone" dataKey="totalProfit" stroke="#16a34a" strokeWidth={3} name={text.profit} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

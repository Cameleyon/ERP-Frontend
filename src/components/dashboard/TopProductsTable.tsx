import type { TopProductResponse } from "../../api/dashboardApi"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency, formatNumber } from "../../utils/format"

type Props = {
  rows: TopProductResponse[]
}

export default function TopProductsTable({ rows }: Props) {
  const { copy } = useI18n()
  const text = copy.topProductsTable

  return (
    <div className="card">
      <h3>{text.title}</h3>
      <table>
        <thead>
          <tr>
            <th>{text.product}</th>
            <th>{text.sku}</th>
            <th>{text.quantitySold}</th>
            <th>{text.salesAmount}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>{text.empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.productId}>
                <td>{row.productName}</td>
                <td>{row.sku}</td>
                <td>{formatNumber(row.totalQuantitySold)}</td>
                <td>{formatCurrency(row.totalSalesAmount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

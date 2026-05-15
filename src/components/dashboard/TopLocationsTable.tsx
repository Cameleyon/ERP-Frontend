import { useI18n } from "../../i18n/I18nContext"
import type { TopLocationResponse } from "../../api/dashboardApi"
import { formatCurrency, formatNumber } from "../../utils/format"

type Props = {
  rows: TopLocationResponse[]
}

export default function TopLocationsTable({ rows }: Props) {
  const { language } = useI18n()
  const text = language === "fr"
    ? {
        title: "Top 5 sites",
        empty: "Aucune vente par site pour cette periode.",
        location: "Site",
        sales: "Ventes",
        transactions: "Transactions",
      }
    : language === "es"
      ? {
          title: "Top 5 sitios",
          empty: "No hay ventas por sitio para este periodo.",
          location: "Sitio",
          sales: "Ventas",
          transactions: "Transacciones",
        }
      : {
          title: "Top 5 sites",
          empty: "No site sales for this period.",
          location: "Site",
          sales: "Sales",
          transactions: "Transactions",
        }

  return (
    <div className="card">
      <h3>{text.title}</h3>
      <table>
        <thead>
          <tr>
            <th>{text.location}</th>
            <th>{text.sales}</th>
            <th>{text.transactions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3}>{text.empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.locationId}>
                <td>{row.locationName}</td>
                <td>{formatCurrency(row.totalSales)}</td>
                <td>{formatNumber(row.transactionCount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

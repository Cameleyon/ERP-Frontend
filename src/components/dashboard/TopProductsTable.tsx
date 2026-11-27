import type { TopProductResponse } from "../../api/dashboardApi"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency, formatNumber } from "../../utils/format"

type Props = {
  rows: TopProductResponse[]
  profitRows: TopProductResponse[]
  lowest?: boolean
  currency: string
}

export default function TopProductsTable({ rows, profitRows, lowest = false, currency }: Props) {
  const { copy, language } = useI18n()
  const text = copy.topProductsTable
  const title = lowest ? text.lowestTitle : text.title

  return (
    <section className="workspace-panel top-products-card">
      <h2>{title}</h2>
      {[{ label: text.bySales, products: rows }, { label: text.byProfit, products: profitRows }].map((section, index) => (
        <details key={index} className="dashboard-rank-section" open={index === 0}>
          <summary>{section.label}</summary>
          {section.products.length === 0 ? <p className="dashboard-muted">{text.empty}</p> :
            <table className="dashboard-table" aria-label={`${title} · ${section.label}`}>
              <thead>
                <tr>
                  <th scope="col">{text.product} · {text.sku}</th>
                  <th scope="col">{text.quantitySold}</th>
                  <th scope="col">{index === 0 ? text.salesAmount : text.profitAmount}</th>
                </tr>
              </thead>
              <tbody>
                {section.products.map(row => (
                  <tr key={row.productId}>
                    <th scope="row">{row.productName}<small>{row.sku}</small></th>
                    <td>{formatNumber(row.totalQuantitySold)}</td>
                    <td>
                      <span>{formatCurrency(index === 0 ? row.totalSalesAmount : row.totalProfitAmount, currency, language)}</span>
                      <small>{index === 0 ? text.profitAmount : text.salesAmount}: {formatCurrency(index === 0 ? row.totalProfitAmount : row.totalSalesAmount, currency, language)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
        </details>
      ))}
    </section>
  )
}

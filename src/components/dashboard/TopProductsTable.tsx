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
    <div className="card top-products-card">
      <h3>{title}</h3>
      <div className="top-products-scroll" role="region" aria-label={title} tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th>{text.product}</th>
            <th>{text.sku}</th>
            <th>{text.quantitySold}</th>
            <th>{text.salesAmount}</th>
            <th>{text.profitAmount}</th>
          </tr>
        </thead>
        {[{ title: text.bySales, products: rows }, { title: text.byProfit, products: profitRows }].map(section => (
        <tbody key={section.title}>
          <tr className="top-products-section">
            <th colSpan={5} scope="rowgroup">{section.title}</th>
          </tr>
          {section.products.length === 0 ? (
            <tr>
              <td colSpan={5}>{text.empty}</td>
            </tr>
          ) : (
            section.products.map((row) => (
              <tr key={row.productId}>
                <td>{row.productName}</td>
                <td>{row.sku}</td>
                <td>{formatNumber(row.totalQuantitySold)}</td>
                <td>{formatCurrency(row.totalSalesAmount, currency, language)}</td>
                <td>{formatCurrency(row.totalProfitAmount, currency, language)}</td>
              </tr>
            ))
          )}
        </tbody>
        ))}
      </table>
      </div>
    </div>
  )
}

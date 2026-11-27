import type { LowStockProductResponse } from "../../api/dashboardApi"
import { useI18n } from "../../i18n/I18nContext"
import { internalCopy } from "../../i18n/internalCopy"
import { formatNumber } from "../../utils/format"

type Props = {
  rows: LowStockProductResponse[]
}

export default function LowStockTable({ rows }: Props) {
  const { copy, language } = useI18n()
  const text = copy.lowStockTable

  return (
    <section className="workspace-panel dashboard-low-stock">
      <div className="dashboard-table-heading"><h2>{text.title}</h2>
        {rows.length > 0 && <span className="workspace-status workspace-stock-status">{internalCopy[language].stockAttention}</span>}
      </div>
      {rows.length === 0 ? <p className="dashboard-muted">{text.empty}</p> : <table className="dashboard-table" aria-label={text.title}>
        <thead>
          <tr>
            <th scope="col">{text.product} · {text.sku}</th>
            <th scope="col">{text.currentStock} / {text.minimumStock}</th>
            <th scope="col">{text.shortage}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
              <tr key={row.productId}>
                <th scope="row">{row.name}<small>{row.sku}</small></th>
                <td>{formatNumber(row.currentStock)} / {formatNumber(row.minimumStock)}</td>
                <td>{formatNumber(row.shortage)}</td>
              </tr>
          ))}
        </tbody>
      </table>}
    </section>
  )
}

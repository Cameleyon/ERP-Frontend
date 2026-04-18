import type { LowStockProductResponse } from "../../api/dashboardApi"
import { useI18n } from "../../i18n/I18nContext"
import { formatNumber } from "../../utils/format"

type Props = {
  rows: LowStockProductResponse[]
}

export default function LowStockTable({ rows }: Props) {
  const { language } = useI18n()
  const text = language === "fr"
    ? {
        title: "Produits en stock faible",
        product: "Produit",
        sku: "SKU",
        currentStock: "Stock actuel",
        minimumStock: "Stock minimum",
        shortage: "Écart",
        empty: "Aucun produit en stock faible.",
      }
    : {
        title: "Low stock products",
        product: "Product",
        sku: "SKU",
        currentStock: "Current stock",
        minimumStock: "Minimum stock",
        shortage: "Shortage",
        empty: "No low stock products.",
      }

  return (
    <div className="card">
      <h3>{text.title}</h3>
      <table>
        <thead>
          <tr>
            <th>{text.product}</th>
            <th>{text.sku}</th>
            <th>{text.currentStock}</th>
            <th>{text.minimumStock}</th>
            <th>{text.shortage}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>{text.empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.productId}>
                <td>{row.name}</td>
                <td>{row.sku}</td>
                <td>{formatNumber(row.currentStock)}</td>
                <td>{formatNumber(row.minimumStock)}</td>
                <td>{formatNumber(row.shortage)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

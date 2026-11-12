import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency, formatNumber } from "../../utils/format"

type CartItem = {
  productId: number
  productName: string
  sku: string
  unitName: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

type Props = {
  items: CartItem[]
  onRemove: (productId: number) => void
}

export default function CartTable({ items, onRemove }: Props) {
  const { copy } = useI18n()
  const text = copy.cartTable
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  return (
    <div className="card">
      <h3>{text.title}</h3>

      <table className="cart-line-table" role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col">{text.product}</th>
            <th role="columnheader" scope="col">{text.sku}</th>
            <th role="columnheader" scope="col">{text.quantity}</th>
            <th role="columnheader" scope="col">{text.unitPrice}</th>
            <th role="columnheader" scope="col">{text.lineTotal}</th>
            <th role="columnheader" scope="col" aria-label={text.remove} />
          </tr>
        </thead>
        <tbody role="rowgroup">
          {items.length === 0 ? (
            <tr role="row">
              <td role="cell" colSpan={6}>{text.empty}</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.productId} className="cart-item-row" role="row">
                <td role="cell">{item.productName}</td>
                <td role="cell">{item.sku}</td>
                <td role="cell">
                  <span className="cart-mobile-label" aria-hidden="true">{text.quantity}</span>
                  {formatNumber(item.quantity)}
                  {item.unitName ? ` ${item.unitName}` : ""}
                </td>
                <td role="cell">
                  <span className="cart-mobile-label" aria-hidden="true">{text.unitPrice}</span>
                  {formatCurrency(item.unitPrice)}
                </td>
                <td role="cell" className="cart-line-total">
                  <span className="cart-mobile-label" aria-hidden="true">{text.lineTotal}</span>
                  {formatCurrency(item.lineTotal)}
                </td>
                <td role="cell" className="cart-line-actions">
                  <button type="button" onClick={() => onRemove(item.productId)}>{text.remove}</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="cart-total">
        <strong>{text.subtotal}:</strong> {formatCurrency(grandTotal)}
      </div>
    </div>
  )
}

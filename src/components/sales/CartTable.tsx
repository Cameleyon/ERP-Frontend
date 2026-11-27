import { useI18n } from "../../i18n/I18nContext"
import { formatNumber } from "../../utils/format"

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
  money: (value: number) => string
  onRemove: (productId: number) => void
}

export default function CartTable({ items, money, onRemove }: Props) {
  const { copy } = useI18n()
  const text = copy.cartTable

  return (
    <section className="stock-panel">
      <h2>{text.title}{items.length > 0 ? ` · ${formatNumber(items.length)}` : ""}</h2>

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
                  {money(item.unitPrice)}
                </td>
                <td role="cell" className="cart-line-total">
                  <span className="cart-mobile-label" aria-hidden="true">{text.lineTotal}</span>
                  {money(item.lineTotal)}
                </td>
                <td role="cell" className="cart-line-actions">
                  <button type="button" className="workspace-text-action" onClick={() => onRemove(item.productId)}>{text.remove}</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

    </section>
  )
}

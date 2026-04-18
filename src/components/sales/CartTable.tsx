import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency, formatNumber } from "../../utils/format"

type CartItem = {
  productId: number
  productName: string
  sku: string
  unitCode: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

type Props = {
  items: CartItem[]
  onRemove: (productId: number) => void
}

export default function CartTable({ items, onRemove }: Props) {
  const { language } = useI18n()
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  const text = language === "fr"
    ? {
        title: "Panier",
        product: "Produit",
        sku: "SKU",
        quantity: "Quantité",
        unitPrice: "Prix unitaire",
        lineTotal: "Total ligne",
        empty: "Le panier est vide.",
        remove: "Retirer",
        subtotal: "Sous-total",
      }
    : {
        title: "Cart",
        product: "Product",
        sku: "SKU",
        quantity: "Quantity",
        unitPrice: "Unit price",
        lineTotal: "Line total",
        empty: "The cart is empty.",
        remove: "Remove",
        subtotal: "Subtotal",
      }

  return (
    <div className="card">
      <h3>{text.title}</h3>

      <table>
        <thead>
          <tr>
            <th>{text.product}</th>
            <th>{text.sku}</th>
            <th>{text.quantity}</th>
            <th>{text.unitPrice}</th>
            <th>{text.lineTotal}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6}>{text.empty}</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td>{item.sku}</td>
                <td>
                  {formatNumber(item.quantity)}
                  {item.unitCode ? ` ${item.unitCode}` : ""}
                </td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{formatCurrency(item.lineTotal)}</td>
                <td>
                  <button onClick={() => onRemove(item.productId)}>{text.remove}</button>
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

import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency } from "../../utils/format"
import { StockFacts } from "../inventory/StockWorkspace"
import { salesWorkspaceCopy } from "./salesWorkspaceCopy"

export default function RecordedSaleTotals({ sale }: {
  sale: { subtotalAmount: number; taxAmount: number; totalAmount: number }
}) {
  const { user } = useAuth()
  const { copy, language } = useI18n()
  const text = copy.salesHistoryPage
  const money = (amount: number) => formatCurrency(amount, user?.companyCurrencyCode || "USD", language)
  return <section className="stock-panel stock-highlight sales-totals">
    <h3>{salesWorkspaceCopy[language].recordedTotals}</h3>
    <StockFacts entries={[[text.subtotal, money(sale.subtotalAmount)], [text.tax, money(sale.taxAmount)]]} />
    <div className="sales-total"><strong>{text.total}</strong><strong>{money(sale.totalAmount)}</strong></div>
  </section>
}

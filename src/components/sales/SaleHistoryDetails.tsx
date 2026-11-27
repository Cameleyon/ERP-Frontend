import type { ReactNode } from "react"
import type { SaleDetailResponse } from "../../api/salesApi"
import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency, formatDateTime, formatNumber } from "../../utils/format"
import StatusBadge from "../common/StatusBadge"
import { StockFacts } from "../inventory/StockWorkspace"
import RecordedSaleTotals from "./RecordedSaleTotals"
import SaleInvoicePreview from "./SaleInvoicePreview"
import { salePaymentLabel, salesWorkspaceCopy } from "./salesWorkspaceCopy"

export default function SaleHistoryDetails({ sale, actions }: { sale: SaleDetailResponse; actions?: ReactNode }) {
  const { user } = useAuth()
  const { copy, language } = useI18n()
  const text = copy.salesHistoryPage
  const labels = salesWorkspaceCopy[language]
  const money = (value: number) => formatCurrency(value, user?.companyCurrencyCode || "USD", language)
  const date = (value: string) => formatDateTime(value, language, user?.companyTimeZoneId || undefined)
  const lineLabels = [text.product, text.quantity, text.unitPrice, text.lineTotal]
  return <>
    <div className="stock-heading">
      <div>
        <h1 id="sale-detail-heading" tabIndex={-1}>{sale.saleNumber}</h1>
        <p>{[date(sale.soldAt), sale.locationName].filter(Boolean).join(" · ")}</p>
      </div>
      <StatusBadge value={sale.status} />
    </div>
    <div className="sales-layout">
      <div className="sales-stack">
        <section className="stock-panel">
          <h2>{labels.transaction}</h2>
          <StockFacts entries={[
            [text.location, sale.locationName || "-"],
            [text.customer, sale.customerName || "-"],
            [text.payment, salePaymentLabel(sale.paymentMethod, copy.newSalePage)],
            ...(sale.paymentReference ? [[text.paymentReference, sale.paymentReference] as const] : []),
            ...(sale.paymentAuthorizationCode ? [[text.authorizationCode, sale.paymentAuthorizationCode] as const] : []),
            ...(sale.paymentConfirmedAt ? [[text.paymentConfirmedAt, date(sale.paymentConfirmedAt)] as const] : []),
          ]} />
        </section>
        <section className="stock-panel">
          <h2>{labels.products}</h2>
          {sale.items.length === 0 ? <p className="stock-muted">{text.emptyItems}</p> :
            <table className="stock-responsive-rows sales-detail-lines" role="table">
              <thead><tr>{lineLabels.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{sale.items.map((item, index) => {
                const unit = "unitName" in item && typeof item.unitName === "string" ? item.unitName : ""
                return <tr key={`${item.productId}-${index}`} role="row">
                  <th scope="row">{item.productName || "-"}</th>
                  {[formatNumber(item.quantity) + (unit ? ` ${unit}` : ""), money(item.unitPrice), money(item.lineTotal)].map((value, column) =>
                    <td key={column} role="cell"><span className="stock-cell-label" aria-hidden="true">{lineLabels[column + 1]}</span><span>{value}</span></td>)}
                </tr>
              })}</tbody>
            </table>}
        </section>
        <SaleInvoicePreview sale={sale} companyName={user?.companyName} revealOnAction showHeading />
      </div>
      <div className="sales-stack">
        <RecordedSaleTotals sale={sale} />
        {(Number.isFinite(sale.totalCostAmount) || Number.isFinite(sale.totalProfitAmount)) && <section className="stock-panel">
          <h2>{labels.business}</h2>
          <StockFacts entries={[
            ...(Number.isFinite(sale.totalCostAmount) ? [[text.totalCost, money(sale.totalCostAmount)] as const] : []),
            ...(Number.isFinite(sale.totalProfitAmount) ? [[text.totalProfit, money(sale.totalProfitAmount)] as const] : []),
          ]} />
        </section>}
        {(actions || sale.cancellationRequestStatus) && <section className="stock-panel">
          <h2>{labels.cancellation}</h2>
          {sale.cancellationRequestStatus && <StockFacts entries={[
            [text.cancellationRequestStatus, sale.cancellationRequestStatus === "PENDING" ? text.cancellationRequested : sale.cancellationRequestStatus],
            ...(sale.cancellationRequestedByName ? [[text.requestedBy, sale.cancellationRequestedByName] as const] : []),
          ]} />}
          {actions && <div className="stock-actions">{actions}</div>}
        </section>}
      </div>
    </div>
  </>
}

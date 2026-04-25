import { useEffect, useMemo, useRef, useState } from "react"
import { getCompanySubscription } from "../../api/companySubscriptionApi"
import { sendSaleInvoiceEmail, type SaleDetailResponse } from "../../api/salesApi"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency, formatDateTime, formatNumber } from "../../utils/format"

type Props = {
  sale: SaleDetailResponse
  companyName?: string | null
}

type BarcodeBar = {
  width: number
  filled: boolean
}

const BARCODE_NARROW = 2
const BARCODE_WIDE = 5
const BARCODE_HEIGHT = 72

export default function SaleInvoicePreview({ sale, companyName }: Props) {
  const { language } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState("")
  const [emailError, setEmailError] = useState("")
  const [invoiceEmailEnabled, setInvoiceEmailEnabled] = useState(false)

  const text = language === "fr"
    ? {
        title: "Facture",
        sendEmail: "Envoyer par e-mail",
        sendingEmail: "Envoi...",
        emailSent: "La facture a ete envoyee par e-mail avec succes.",
        invoiceEmailUnavailable: "L'envoi de facture par e-mail est disponible avec la version Standard uniquement.",
        sendPhone: "Envoyer par telephone",
        print: "Imprimer la facture",
        saleInvoice: "Facture de vente",
        invoiceNumber: "No facture",
        date: "Date",
        status: "Statut",
        customer: "Client",
        walkInCustomer: "Client passage",
        customerEmail: "E-mail du client",
        customerPhone: "Telephone du client",
        paymentMethod: "Methode de paiement",
        product: "Produit",
        quantity: "Quantite",
        unitPrice: "Prix unitaire",
        lineTotal: "Total ligne",
        empty: "Aucune ligne de facture.",
        subtotal: "Sous-total",
        tax: "Taxe",
        total: "Total",
        barcodeLabel: (saleNumber: string) => `Code-barres pour ${saleNumber}`,
      }
    : {
        title: "Invoice",
        sendEmail: "Send by email",
        sendingEmail: "Sending...",
        emailSent: "Invoice email sent successfully.",
        invoiceEmailUnavailable: "Invoice email sending is available on the Standard plan only.",
        sendPhone: "Send by phone",
        print: "Print invoice",
        saleInvoice: "Sales invoice",
        invoiceNumber: "Invoice no",
        date: "Date",
        status: "Status",
        customer: "Customer",
        walkInCustomer: "Walk-in customer",
        customerEmail: "Customer email",
        customerPhone: "Customer phone",
        paymentMethod: "Payment method",
        product: "Product",
        quantity: "Quantity",
        unitPrice: "Unit price",
        lineTotal: "Line total",
        empty: "No invoice lines.",
        subtotal: "Subtotal",
        tax: "Tax",
        total: "Total",
        barcodeLabel: (saleNumber: string) => `Barcode for ${saleNumber}`,
      }

  useEffect(() => {
    function clearPrintState() {
      document.body.classList.remove("invoice-printing")
      document.querySelectorAll(".print-target").forEach((node) => {
        node.classList.remove("print-target")
      })
    }

    window.addEventListener("afterprint", clearPrintState)
    return () => {
      window.removeEventListener("afterprint", clearPrintState)
      clearPrintState()
    }
  }, [])

  useEffect(() => {
    setEmailSuccess("")
    setEmailError("")
  }, [sale.id])

  useEffect(() => {
    let ignore = false

    async function loadSubscriptionFeatures() {
      try {
        const subscription = await getCompanySubscription()
        if (!ignore) {
          setInvoiceEmailEnabled(Boolean(subscription.invoiceEmailEnabled))
        }
      } catch (error) {
        console.error(error)
        if (!ignore) {
          setInvoiceEmailEnabled(false)
        }
      }
    }

    loadSubscriptionFeatures()

    return () => {
      ignore = true
    }
  }, [])

  const barcodeBars = useMemo(() => buildPseudoBarcode(`*${sale.saleNumber.toUpperCase()}*`), [sale.saleNumber])

  function handlePrintInvoice() {
    document.querySelectorAll(".print-target").forEach((node) => {
      node.classList.remove("print-target")
    })

    if (containerRef.current) {
      containerRef.current.classList.add("print-target")
    }

    document.body.classList.add("invoice-printing")
    window.print()
  }

  async function handleEmailInvoice() {
    if (!sale.customerEmail) {
      return
    }
    if (!invoiceEmailEnabled) {
      setEmailSuccess("")
      setEmailError(text.invoiceEmailUnavailable)
      return
    }

    try {
      setSendingEmail(true)
      setEmailSuccess("")
      setEmailError("")
      await sendSaleInvoiceEmail(sale.id)
      setEmailSuccess(text.emailSent)
    } catch (error) {
      console.error(error)
      setEmailError(error instanceof Error ? error.message : "Failed to send invoice email")
    } finally {
      setSendingEmail(false)
    }
  }

  function handlePhoneInvoice() {
    if (!sale.customerPhone) {
      return
    }

    const body = encodeURIComponent(buildInvoiceMessage(sale, companyName, language))
    window.location.href = `sms:${sanitizePhoneNumber(sale.customerPhone)}?body=${body}`
  }

  return (
    <div className="card">
      {emailError && <div className="card error">{emailError}</div>}
      {emailSuccess && <div className="card success">{emailSuccess}</div>}

      <div className="table-actions" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{text.title}</h3>
        <div className="table-actions">
          {sale.customerEmail && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleEmailInvoice}
              disabled={sendingEmail || !invoiceEmailEnabled}
              title={invoiceEmailEnabled ? undefined : text.invoiceEmailUnavailable}
            >
              {sendingEmail ? text.sendingEmail : text.sendEmail}
            </button>
          )}

          {sale.customerPhone && (
            <button type="button" className="secondary-button" onClick={handlePhoneInvoice}>
              {text.sendPhone}
            </button>
          )}

          <button type="button" onClick={handlePrintInvoice}>
            {text.print}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="printable-invoice">
        <div className="invoice-header">
          <div>
            <div className="invoice-company-name">{companyName || "CAMELEYON ERP"}</div>
            <div className="invoice-label">{text.saleInvoice}</div>
          </div>

          <div className="invoice-reference">
            <p><strong>{text.invoiceNumber}:</strong> {sale.saleNumber}</p>
            <p><strong>{text.date}:</strong> {formatDateTime(sale.soldAt)}</p>
            <p><strong>{text.status}:</strong> {sale.status}</p>
          </div>
        </div>

        <div className="invoice-meta-grid">
          <div>
            <span>{text.customer}</span>
            <strong>{sale.customerName || text.walkInCustomer}</strong>
          </div>
          {sale.customerEmail && (
            <div>
              <span>{text.customerEmail}</span>
              <strong>{sale.customerEmail}</strong>
            </div>
          )}
          {sale.customerPhone && (
            <div>
              <span>{text.customerPhone}</span>
              <strong>{sale.customerPhone}</strong>
            </div>
          )}
          <div>
            <span>{text.paymentMethod}</span>
            <strong>{sale.paymentMethod || "-"}</strong>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>{text.product}</th>
              <th>{text.quantity}</th>
              <th>{text.unitPrice}</th>
              <th>{text.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.length === 0 ? (
              <tr>
                <td colSpan={4}>{text.empty}</td>
              </tr>
            ) : (
              sale.items.map((item, index) => (
                <tr key={`${item.productId}-${index}`}>
                  <td>{item.productName || "-"}</td>
                  <td>{formatNumber(item.quantity)}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td>{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="invoice-summary">
          <p><span>{text.subtotal}</span><strong>{formatCurrency(sale.subtotalAmount)}</strong></p>
          <p><span>{text.tax}</span><strong>{formatCurrency(sale.taxAmount)}</strong></p>
          <p className="invoice-total-row"><span>{text.total}</span><strong>{formatCurrency(sale.totalAmount)}</strong></p>
        </div>

        <div className="invoice-barcode-block">
          <svg
            className="invoice-barcode"
            width={barcodeBars.reduce((sum, bar) => sum + bar.width, 0)}
            height={BARCODE_HEIGHT}
            viewBox={`0 0 ${barcodeBars.reduce((sum, bar) => sum + bar.width, 0)} ${BARCODE_HEIGHT}`}
            aria-label={text.barcodeLabel(sale.saleNumber)}
            role="img"
          >
            {renderBarcodeBars(barcodeBars)}
          </svg>
          <div className="invoice-barcode-text">{sale.saleNumber}</div>
        </div>
      </div>
    </div>
  )
}

function buildInvoiceMessage(
  sale: SaleDetailResponse,
  companyName: string | null | undefined,
  language: "fr" | "en" | "es",
) {
  if (language === "fr") {
    const header = `${companyName || "CAMELEYON ERP"}\nFacture de vente ${sale.saleNumber}`
    const customer = `Client : ${sale.customerName || "Client passage"}`
    const date = `Date : ${formatDateTime(sale.soldAt)}`
    const paymentMethod = `Methode de paiement : ${sale.paymentMethod || "-"}`
    const items = sale.items.length === 0
      ? "Articles : aucune ligne de facture."
      : `Articles :\n${sale.items
        .map((item) => `- ${item.productName || "-"} x ${formatNumber(item.quantity)} = ${formatCurrency(item.lineTotal)}`)
        .join("\n")}`
    const totals = [
      `Sous-total : ${formatCurrency(sale.subtotalAmount)}`,
      `Taxe : ${formatCurrency(sale.taxAmount)}`,
      `Total : ${formatCurrency(sale.totalAmount)}`,
    ].join("\n")

    return [header, customer, date, paymentMethod, "", items, "", totals].join("\n")
  }

  if (language === "es") {
    const header = `${companyName || "CAMELEYON ERP"}\nFactura de venta ${sale.saleNumber}`
    const customer = `Cliente: ${sale.customerName || "Cliente ocasional"}`
    const date = `Fecha: ${formatDateTime(sale.soldAt)}`
    const paymentMethod = `Metodo de pago: ${sale.paymentMethod || "-"}`
    const items = sale.items.length === 0
      ? "Articulos: no hay lineas en la factura."
      : `Articulos:\n${sale.items
        .map((item) => `- ${item.productName || "-"} x ${formatNumber(item.quantity)} = ${formatCurrency(item.lineTotal)}`)
        .join("\n")}`
    const totals = [
      `Subtotal: ${formatCurrency(sale.subtotalAmount)}`,
      `Impuesto: ${formatCurrency(sale.taxAmount)}`,
      `Total: ${formatCurrency(sale.totalAmount)}`,
    ].join("\n")

    return [header, customer, date, paymentMethod, "", items, "", totals].join("\n")
  }

  const header = `${companyName || "CAMELEYON ERP"}\nSales invoice ${sale.saleNumber}`
  const customer = `Customer: ${sale.customerName || "Walk-in customer"}`
  const date = `Date: ${formatDateTime(sale.soldAt)}`
  const paymentMethod = `Payment method: ${sale.paymentMethod || "-"}`
  const items = sale.items.length === 0
    ? "Items: no invoice lines."
    : `Items:\n${sale.items
      .map((item) => `- ${item.productName || "-"} x ${formatNumber(item.quantity)} = ${formatCurrency(item.lineTotal)}`)
      .join("\n")}`
  const totals = [
    `Subtotal: ${formatCurrency(sale.subtotalAmount)}`,
    `Tax: ${formatCurrency(sale.taxAmount)}`,
    `Total: ${formatCurrency(sale.totalAmount)}`,
  ].join("\n")

  return [header, customer, date, paymentMethod, "", items, "", totals].join("\n")
}

function sanitizePhoneNumber(phone: string) {
  return phone.replace(/[^+\d]/g, "")
}

function renderBarcodeBars(bars: BarcodeBar[]) {
  let x = 0

  return bars.map((bar, index) => {
    const currentX = x
    x += bar.width

    if (!bar.filled) {
      return null
    }

    return <rect key={`${currentX}-${index}`} x={currentX} y={0} width={bar.width} height={BARCODE_HEIGHT} fill="#111111" />
  })
}

function buildPseudoBarcode(value: string): BarcodeBar[] {
  const encoded: BarcodeBar[] = []

  for (const character of value) {
    const code = character.charCodeAt(0).toString(2).padStart(8, "0")

    for (const digit of code) {
      encoded.push({
        filled: digit === "1",
        width: digit === "1" ? BARCODE_WIDE : BARCODE_NARROW,
      })

      encoded.push({
        filled: false,
        width: BARCODE_NARROW,
      })
    }

    encoded.push({
      filled: false,
      width: BARCODE_WIDE,
    })
  }

  return encoded
}

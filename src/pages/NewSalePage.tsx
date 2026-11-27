import { useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { useMenuSiteChange, type MenuSiteSelection } from "../components/layout/useMenuSiteChange"
import ErrorMessage from "../components/common/ErrorMessage"
import { CompanyCurrencyRequiredError } from "../utils/companyCurrency"
import { getCustomers, type CustomerResponse } from "../api/customerApi"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import { findSalesProduct, type SalesProduct } from "../api/productApi"
import { createSale, type CreateSaleResponse } from "../api/salesApi"
import ProductLookup from "../components/sales/ProductLookup"
import CartTable from "../components/sales/CartTable"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import SaleCompletionDialog from "../components/sales/SaleCompletionDialog"
import QuantityInput from "../components/common/QuantityInput"
import { useAuth } from "../auth/AuthContext"
import { formatCurrency, formatNumber } from "../utils/format"
import { getDefaultLocationId } from "../utils/locations"
import { setupCopy } from "../i18n/setupCopy"
import { parseExactDecimal, parseStockQuantity } from "../utils/decimalInput"
import { receiptErrorMessage } from "../i18n/inventoryReceiptMessages"
import { StockFacts } from "../components/inventory/StockWorkspace"
import { salesWorkspaceCopy } from "../components/sales/salesWorkspaceCopy"
import "../components/sales/salesWorkspace.css"

type CartItem = {
  productId: number
  productName: string
  sku: string
  unitName: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

function resolveUnitPrice(product: SalesProduct, itemQuantity: number) {
  const appliedTier = [...(product.priceTiers ?? [])]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((tier) => itemQuantity >= tier.minQuantity)

  return {
    unitPrice: appliedTier?.unitPrice ?? product.unitPrice,
    appliedTier,
  }
}

export default function NewSalePage({ preferredSiteId, menuSelection, onSiteChange, onSetupReturn }: {
  preferredSiteId?: number; menuSelection?: MenuSiteSelection; onSiteChange?: (id: number) => void; onSetupReturn?: () => void
} = {}) {
  const { user } = useAuth()
  const { copy, language } = useI18n()
  const text = copy.newSalePage
  const labels = salesWorkspaceCopy[language]
  const money = (value: number) => formatCurrency(value, user?.companyCurrencyCode || "USD", language)
  const guide = setupCopy[language]
  const saleHeading = useRef<HTMLHeadingElement>(null)
  const summaryHeading = useRef<HTMLHeadingElement>(null)
  const submittingSale = useRef(false)

  const [productCode, setProductCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)

  const [error, setError] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<SalesProduct | null>(null)
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [locations, setLocations] = useState<CompanyLocationResponse[]>([])
  const [locationId, setLocationId] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("WALK_IN")
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentAuthorizationCode, setPaymentAuthorizationCode] = useState("")
  const [paymentConfirmedManually, setPaymentConfirmedManually] = useState(false)
  const [quantity, setQuantity] = useState("1")
  const [quantityError, setQuantityError] = useState("")
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [completedSale, setCompletedSale] = useState<CreateSaleResponse | null>(null)
  const lookupRequestRef = useRef(0)

  useMenuSiteChange(menuSelection, site => {
    if (locationsLoading || saleLoading || cartItems.length || productCode || selectedProduct
      || selectedCustomerId !== "WALK_IN" || customerSearch || paymentMethod !== "CASH"
      || paymentReference || paymentAuthorizationCode || paymentConfirmedManually) return
    const next = locations.find(location => location.id === site)
    setLocationId(next ? String(next.id) : getDefaultLocationId(locations))
  })

  useEffect(() => {
    void loadCustomers()
    void loadLocations()
    if (preferredSiteId) saleHeading.current?.focus()
  }, [])

  async function loadLocations() {
    try {
      setLocationsLoading(true)
      const data = await getAccessibleCompanyLocations()
      const activeLocations = Array.isArray(data) ? data.filter((location) => location.active) : []
      setLocations(activeLocations)
      setLocationId(preferredSiteId
        ? activeLocations.some(site => site.id === preferredSiteId) ? String(preferredSiteId) : ""
        : getDefaultLocationId(activeLocations))
    } catch (err) {
      console.error(err)
      if (!preferredSiteId) setError(err instanceof Error ? err.message : "Failed to load locations")
    } finally {
      setLocationsLoading(false)
    }
  }

  async function loadCustomers() {
    try {
      setCustomersLoading(true)
      const data = await getCustomers()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadCustomersError)
    } finally {
      setCustomersLoading(false)
    }
  }

  async function handleLookup(code = productCode, selected?: { id: number; sku: string }) {
    if (!locationId) return
    if (!code.trim()) {
      setError(text.barcodeRequired)
      return
    }

    const request = ++lookupRequestRef.current
    try {
      setLookupLoading(true)
      setSelectedProduct(null)
      setError("")

      const product = await findSalesProduct(selected?.sku ?? code.trim(), locationId, !!selected)
      if (request !== lookupRequestRef.current) return
      if (selected && product.id !== selected.id) throw new Error(text.lookupFailed)
      if (!product.active) throw new Error(text.lookupFailed)
      setSelectedProduct(product)
      setProductCode(product.name)
      setQuantity("1")
      setQuantityError("")
    } catch (err) {
      if (request !== lookupRequestRef.current) return
      console.error(err)
      setSelectedProduct(null)
      setError(err instanceof Error ? err.message : text.lookupFailed)
    } finally {
      if (request === lookupRequestRef.current) setLookupLoading(false)
    }
  }

  function handleAddToCart() {
    if (!selectedProduct) {
      setError(text.noProduct)
      return
    }

    const validated = parseStockQuantity(quantity, selectedProduct.quantityType === "INTEGER")
    if (validated.reason) {
      setQuantityError(validated.reason === "whole" ? copy.common.wholeNumberQuantity
        : validated.reason === "positive" ? text.quantityPositive
        : validated.reason === "range" ? receiptErrorMessage("INVENTORY_QUANTITY_RANGE", language, text.quantityPositive)
        : copy.common.saleQuantityPrecision)
      document.getElementById("sale-quantity")?.focus()
      return
    }
    setQuantityError("")
    const quantityValue = validated.quantity

    if (quantityValue > selectedProduct.currentStock) {
      setError(text.quantityExceedsStock)
      return
    }

    const existing = cartItems.find((item) => item.productId === selectedProduct.id)

    if (existing) {
      const prior = parseExactDecimal(String(existing.quantity), 2)
      if ("reason" in prior) return
      const newQuantity = Number(prior.units + validated.cents) / 100
      const pricing = resolveUnitPrice(selectedProduct, newQuantity)

      if (newQuantity > selectedProduct.currentStock) {
        setError(text.cartExceedsStock)
        return
      }

      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === selectedProduct.id
            ? {
                ...item,
                quantity: newQuantity,
                unitPrice: pricing.unitPrice,
                lineTotal: newQuantity * pricing.unitPrice,
              }
            : item,
        ),
      )
    } else {
      const pricing = resolveUnitPrice(selectedProduct, quantityValue)

      setCartItems((prev) => [
        ...prev,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          sku: selectedProduct.sku,
          unitName: selectedProduct.unitName,
          quantity: quantityValue,
          unitPrice: pricing.unitPrice,
          lineTotal: quantityValue * pricing.unitPrice,
        },
      ])
    }

    setSelectedProduct(null)
    setProductCode("")
    setQuantity("1")
    setError("")
  }

  function handleRemoveFromCart(productId: number) {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  async function handleCreateSale() {
    if (submittingSale.current || completedSale) return
    if (cartItems.length === 0) {
      setError(text.cartEmpty)
      return
    }

    if ((paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD") && !paymentConfirmedManually) {
      setError(text.manualCardConfirmationRequired)
      return
    }

    try {
      submittingSale.current = true
      setSaleLoading(true)
      setError("")
      const customerName =
        selectedCustomerId === "WALK_IN"
          ? text.walkInCustomer
          : customers.find((customer) => String(customer.id) === selectedCustomerId)?.name || text.walkInCustomer

      const response = await createSale({
        locationId: locationId ? Number(locationId) : null,
        customerId: selectedCustomerId === "WALK_IN" ? null : Number(selectedCustomerId),
        customerName,
        paymentMethod,
        paymentReference: paymentReference.trim() || null,
        paymentAuthorizationCode: paymentAuthorizationCode.trim() || null,
        paymentConfirmedManually,
        notes: text.notes,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })

      setCompletedSale(response)
      setCartItems([])
      setSelectedProduct(null)
      setProductCode("")
      setQuantity("1")
      setSelectedCustomerId("WALK_IN")
      setCustomerSearch("")
      setPaymentMethod("CASH")
      setPaymentReference("")
      setPaymentAuthorizationCode("")
      setPaymentConfirmedManually(false)
    } catch (err) {
      console.error(err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.saleError)
      }
    } finally {
      submittingSale.current = false
      setSaleLoading(false)
    }
  }

  function handleDetectedBarcode(value: string) {
    setProductCode(value)
    setShowScanner(false)
    void handleLookup(value)
  }

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase()

    if (!search) {
      return []
    }

    return customers
      .filter((customer) => {
        const haystack = [
          customer.name,
          customer.phone ?? "",
          customer.email ?? "",
        ]
          .join(" ")
          .toLowerCase()

        return haystack.includes(search)
      })
      .sort((left, right) => {
        const leftName = left.name.toLowerCase()
        const rightName = right.name.toLowerCase()
        const leftStarts = leftName.startsWith(search) ? 0 : 1
        const rightStarts = rightName.startsWith(search) ? 0 : 1

        if (leftStarts !== rightStarts) {
          return leftStarts - rightStarts
        }

        return left.name.localeCompare(right.name)
      })
      .slice(0, 8)
  }, [customers, customerSearch])

  const selectedCustomer = selectedCustomerId === "WALK_IN"
    ? null
    : customers.find((customer) => String(customer.id) === selectedCustomerId) ?? null

  function handleSelectCustomer(customer: CustomerResponse) {
    setSelectedCustomerId(String(customer.id))
    setCustomerSearch(customer.name)
    setCustomerSuggestionsOpen(false)
  }

  function handlePaymentMethodChange(nextMethod: string) {
    setPaymentMethod(nextMethod)

    if (nextMethod === "CASH") {
      setPaymentReference("")
      setPaymentAuthorizationCode("")
      setPaymentConfirmedManually(false)
    }
  }

  const quantityValue = parseStockQuantity(quantity, selectedProduct?.quantityType === "INTEGER").quantity ?? 0
  const selectedPricing = selectedProduct ? resolveUnitPrice(selectedProduct, quantityValue) : null

  return (
    <div className="stock-workspace sales-workspace">
      <div className="page-title-row">
        <h1 ref={saleHeading} tabIndex={-1}>{text.title}</h1>

        {locations.length > 0 && (
          <label className="page-title-site-filter">
            <select aria-label={guide.site} value={locationId} onChange={(event) => {
              lookupRequestRef.current++
              setLookupLoading(false)
              setSelectedProduct(null)
              setProductCode("")
              setLocationId(event.target.value)
              if (event.target.value) onSiteChange?.(Number(event.target.value))
            }} disabled={locationsLoading || saleLoading || cartItems.length > 0}>
              {!locationId && <option value="">{guide.selectSite}</option>}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <button type="button" className="workspace-outline sales-summary-jump" onClick={() => {
        summaryHeading.current?.focus()
        summaryHeading.current?.scrollIntoView({ block: "start" })
      }}>{labels.viewSummary}</button>
      {preferredSiteId && !locationsLoading && !locationId && <div className="card">
        <p role="status">{locations.length ? guide.unavailable : guide.siteBlocked}</p>
        {onSetupReturn && <button type="button" className="secondary-button" onClick={onSetupReturn}>{guide.back}</button>}
      </div>}

      {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}

      <div className="sales-layout">
      <div className="sales-stack">
      <section className="stock-panel">
      <ProductLookup
        embedded
        headingAction={<button type="button" className="workspace-outline" aria-expanded={showScanner}
          onClick={() => setShowScanner(previous => !previous)}>{showScanner ? text.closeScanner : text.openScanner}</button>}
        key={locationId}
        salesLocationId={locationId}
        disabled={!locationId}
        value={productCode}
        onChange={value => {
          lookupRequestRef.current++
          setLookupLoading(false)
          setSelectedProduct(null)
          setProductCode(value)
        }}
        onLookup={() => { void handleLookup() }}
        lookupLoading={lookupLoading}
        onError={setError}
        onSelect={product => {
          setProductCode(product.name)
          void handleLookup(product.sku, product)
        }}
      />
      {showScanner && <div className="scanner-container"><BarcodeScanner onDetected={handleDetectedBarcode} /></div>}
      </section>

      {selectedProduct && (
        <section className="stock-panel">
          <h3>{text.selectedProduct}</h3>
          <p><strong>{text.name}:</strong> {selectedProduct.name}</p>
          <p><strong>{text.sku}:</strong> {selectedProduct.sku}</p>
          <p><strong>{text.basePrice}:</strong> {money(selectedProduct.unitPrice)}</p>
          {selectedPricing && (
            <p>
              <strong>{text.appliedPrice}:</strong> {money(selectedPricing.unitPrice)}
              {selectedPricing.appliedTier
                ? ` (${selectedPricing.appliedTier.label || text.wholesalePriceApplied})`
                : ""}
            </p>
          )}
          <p>
            <strong>{text.currentStock}:</strong> {formatNumber(selectedProduct.currentStock)}
            {selectedProduct.unitName ? ` ${selectedProduct.unitName}` : ""}
          </p>

          <div className="sale-form-row">
            <label>
              {text.quantity} {selectedProduct.unitName ? `(${selectedProduct.unitName})` : ""}
              <QuantityInput
                inputId="sale-quantity"
                step={selectedProduct.quantityType === "INTEGER" ? 1 : 0.01}
                buttonStep={1}
                value={quantity}
                onChange={value => { setQuantityError(""); setQuantity(value) }}
                ariaLabel={text.quantity}
                error={quantityError || undefined}
              />
              {quantityError && <small id="sale-quantity-error" className="inventory-field-error" role="alert">{quantityError}</small>}
            </label>

            <button onClick={handleAddToCart}>{text.addToCart}</button>
          </div>

          <p>
            <strong>{text.linePreview}:</strong>{" "}
            {money(quantityValue * (selectedPricing?.unitPrice ?? selectedProduct.unitPrice))}
          </p>
        </section>
      )}

      <CartTable items={cartItems} money={money} onRemove={handleRemoveFromCart} />

      <section className="stock-panel">
        <h2 className="sales-panel-title">{labels.customerPayment}</h2>

        <div className="sale-customer-payment-row">
          <div className="sale-customer-search-block" onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setCustomerSuggestionsOpen(false)
          }}>
            <label className="sale-inline-field sale-customer-search-field">
              <span>{text.chooseCustomer}</span>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  if (selectedCustomerId !== "WALK_IN") {
                    setSelectedCustomerId("WALK_IN")
                  }
                  setCustomerSuggestionsOpen(true)
                }}
                onFocus={() => {
                  if (customerSearch.trim()) {
                    setCustomerSuggestionsOpen(true)
                  }
                }}
                placeholder={text.searchCustomerPlaceholder}
                disabled={customersLoading}
              />
            </label>

            {customerSuggestionsOpen && !customersLoading && filteredCustomers.length > 0 && (
              <div className="sale-customer-suggestions">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className={`sale-customer-suggestion ${selectedCustomerId === String(customer.id) ? "selected" : ""}`}
                    onMouseDown={(event) => {
                      event.preventDefault()
                    }}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sale-payment-choice-group">
            <span>{text.paymentMethod}</span>
            <div className="sale-payment-choice-buttons">
              <button
                type="button"
                className={`workspace-outline ${paymentMethod === "CASH" ? "active-choice" : ""}`}
                aria-pressed={paymentMethod === "CASH"}
                onClick={() => handlePaymentMethodChange("CASH")}
              >
                {text.cash}
              </button>
              <button
                type="button"
                className={`workspace-outline ${paymentMethod === "CREDIT_CARD" ? "active-choice" : ""}`}
                aria-pressed={paymentMethod === "CREDIT_CARD"}
                onClick={() => handlePaymentMethodChange("CREDIT_CARD")}
              >
                {text.creditCard}
              </button>
              <button
                type="button"
                className={`workspace-outline ${paymentMethod === "DEBIT_CARD" ? "active-choice" : ""}`}
                aria-pressed={paymentMethod === "DEBIT_CARD"}
                onClick={() => handlePaymentMethodChange("DEBIT_CARD")}
              >
                {text.debitCard}
              </button>
            </div>
          </div>
        </div>

        <div className="sale-customer-results">
          {selectedCustomer && (
            <p className="sale-customer-selected">
              <strong>{text.selectedCustomer}:</strong> {selectedCustomer.name}
              {selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ""}
            </p>
          )}

          {!customersLoading && customerSearch.trim() && filteredCustomers.length === 0 && (
            <p className="sale-customer-empty">{text.noCustomerMatch}</p>
          )}

          {paymentMethod !== "CASH" && (
            <div className="inventory-form-grid">
              <label>
                {text.paymentReference}
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={text.paymentReferencePlaceholder}
                />
              </label>

              <label>
                {text.authorizationCode}
                <input
                  type="text"
                  value={paymentAuthorizationCode}
                  onChange={(e) => setPaymentAuthorizationCode(e.target.value)}
                  placeholder={text.authorizationCodePlaceholder}
                />
              </label>

              <label className="checkbox-field full-width">
                <input
                  type="checkbox"
                  checked={paymentConfirmedManually}
                  onChange={(e) => setPaymentConfirmedManually(e.target.checked)}
                />
                <span>{text.manualCardConfirmation}</span>
              </label>
            </div>
          )}
        </div>
      </section>
      </div>
      <aside className="stock-panel stock-highlight sales-summary" aria-labelledby="sale-summary-heading">
        <h2 id="sale-summary-heading" ref={summaryHeading} tabIndex={-1}>{labels.summary}</h2>
        <StockFacts entries={[
          [guide.site, locations.find(site => String(site.id) === locationId)?.name ?? "-"],
          [text.customer, selectedCustomer?.name ?? text.walkInCustomer],
          [text.paymentMethod, paymentMethod === "CREDIT_CARD" ? text.creditCard : paymentMethod === "DEBIT_CARD" ? text.debitCard : text.cash],
        ]} />
        <div>
          <span>{copy.cartTable.subtotal}</span>
          <strong className="sales-subtotal">{money(cartItems.reduce((sum, item) => sum + item.lineTotal, 0))}</strong>
        </div>
        <p className="stock-muted">{labels.finalTotalNote}</p>
        <button type="button" className="workspace-primary" onClick={handleCreateSale} disabled={saleLoading || cartItems.length === 0}>
          {saleLoading ? text.creating : text.submit}
        </button>
      </aside>
      </div>

      {completedSale && (
        <SaleCompletionDialog recorded={completedSale} companyName={user?.companyName}
          onClose={() => { setCompletedSale(null); saleHeading.current?.focus() }} />
      )}
    </div>
  )
}

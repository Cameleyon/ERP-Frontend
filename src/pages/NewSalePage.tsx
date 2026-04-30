import { useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { getCustomers, type CustomerResponse } from "../api/customerApi"
import { getProductByCode, type ProductLookupResponse } from "../api/productApi"
import { createSale, getSaleDetail, type SaleDetailResponse } from "../api/salesApi"
import BarcodeLookup from "../components/sales/BarcodeLookup"
import CartTable from "../components/sales/CartTable"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import SaleInvoicePreview from "../components/sales/SaleInvoicePreview"
import { useAuth } from "../auth/AuthContext"
import { formatCurrency, formatNumber } from "../utils/format"

type CartItem = {
  productId: number
  productName: string
  sku: string
  unitCode: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

function resolveUnitPrice(product: ProductLookupResponse, itemQuantity: number) {
  const appliedTier = [...(product.priceTiers ?? [])]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((tier) => itemQuantity >= tier.minQuantity)

  return {
    unitPrice: appliedTier?.unitPrice ?? product.unitPrice,
    appliedTier,
  }
}

export default function NewSalePage() {
  const { user } = useAuth()
  const { copy } = useI18n()
  const text = copy.newSalePage

  const [productCode, setProductCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(true)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupResponse | null>(null)
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("WALK_IN")
  const [customerSearch, setCustomerSearch] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentAuthorizationCode, setPaymentAuthorizationCode] = useState("")
  const [paymentConfirmedManually, setPaymentConfirmedManually] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [lastSaleInvoice, setLastSaleInvoice] = useState<SaleDetailResponse | null>(null)

  const successTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    void loadCustomers()
  }, [])

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

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

  async function handleLookup() {
    if (!productCode.trim()) {
      setError(text.barcodeRequired)
      return
    }

    try {
      setLookupLoading(true)
      setError("")
      setSuccess("")

      const product = await getProductByCode(productCode.trim())
      setSelectedProduct(product)
      setQuantity(1)
    } catch (err) {
      console.error(err)
      setSelectedProduct(null)
      setError(err instanceof Error ? err.message : text.lookupFailed)
    } finally {
      setLookupLoading(false)
    }
  }

  function handleAddToCart() {
    if (!selectedProduct) {
      setError(text.noProduct)
      return
    }

    if (quantity <= 0) {
      setError(text.quantityPositive)
      return
    }

    if (quantity > selectedProduct.currentStock) {
      setError(text.quantityExceedsStock)
      return
    }

    const existing = cartItems.find((item) => item.productId === selectedProduct.id)

    if (existing) {
      const newQuantity = existing.quantity + quantity
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
      const pricing = resolveUnitPrice(selectedProduct, quantity)

      setCartItems((prev) => [
        ...prev,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          sku: selectedProduct.sku,
          unitCode: selectedProduct.unitCode,
          quantity,
          unitPrice: pricing.unitPrice,
          lineTotal: quantity * pricing.unitPrice,
        },
      ])
    }

    setSelectedProduct(null)
    setProductCode("")
    setQuantity(1)
    setError("")
  }

  function handleRemoveFromCart(productId: number) {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  async function handleCreateSale() {
    if (cartItems.length === 0) {
      setError(text.cartEmpty)
      return
    }

    if ((paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD") && !paymentConfirmedManually) {
      setError(text.manualCardConfirmationRequired)
      return
    }

    try {
      setSaleLoading(true)
      setError("")
      setSuccess("")

      const customerName =
        selectedCustomerId === "WALK_IN"
          ? text.walkInCustomer
          : customers.find((customer) => String(customer.id) === selectedCustomerId)?.name || text.walkInCustomer

      const response = await createSale({
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

      const saleDetail = await getSaleDetail(response.id)

      setSuccess(text.saleSuccess(response.saleNumber))
      setCartItems([])
      setSelectedProduct(null)
      setProductCode("")
      setQuantity(1)
      setSelectedCustomerId("WALK_IN")
      setCustomerSearch("")
      setPaymentMethod("CASH")
      setPaymentReference("")
      setPaymentAuthorizationCode("")
      setPaymentConfirmedManually(false)
      setLastSaleInvoice(saleDetail)

      window.scrollTo({ top: 0, behavior: "smooth" })

      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
      }

      successTimeoutRef.current = window.setTimeout(() => {
        setSuccess("")
      }, 4000)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.saleError)
    } finally {
      setSaleLoading(false)
    }
  }

  function handleDetectedBarcode(value: string) {
    setProductCode(value)
    setError("")
    setSuccess("")
  }

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase()

    if (!search) {
      return customers
    }

    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.phone ?? "",
        customer.email ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(search)
    })
  }, [customers, customerSearch])

  const selectedCustomer = selectedCustomerId === "WALK_IN"
    ? null
    : customers.find((customer) => String(customer.id) === selectedCustomerId) ?? null

  function handleSelectCustomer(customer: CustomerResponse) {
    setSelectedCustomerId(String(customer.id))
    setCustomerSearch(customer.name)
  }

  function handleWalkInCustomer() {
    setSelectedCustomerId("WALK_IN")
    setCustomerSearch("")
  }

  const selectedPricing = selectedProduct ? resolveUnitPrice(selectedProduct, quantity) : null

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <BarcodeScanner onDetected={handleDetectedBarcode} />

      <BarcodeLookup
        productCode={productCode}
        onProductCodeChange={setProductCode}
        onLookup={handleLookup}
        loading={lookupLoading}
      />

      {selectedProduct && (
        <div className="card">
          <h3>{text.selectedProduct}</h3>
          <p><strong>{text.name}:</strong> {selectedProduct.name}</p>
          <p><strong>{text.sku}:</strong> {selectedProduct.sku}</p>
          <p><strong>{text.basePrice}:</strong> {formatCurrency(selectedProduct.unitPrice)}</p>
          {selectedPricing && (
            <p>
              <strong>{text.appliedPrice}:</strong> {formatCurrency(selectedPricing.unitPrice)}
              {selectedPricing.appliedTier
                ? ` (${selectedPricing.appliedTier.label || text.wholesalePriceApplied})`
                : ""}
            </p>
          )}
          <p>
            <strong>{text.currentStock}:</strong> {formatNumber(selectedProduct.currentStock)}
            {selectedProduct.unitCode ? ` ${selectedProduct.unitCode}` : ""}
          </p>
          <p>
            <strong>{text.minimumStock}:</strong> {formatNumber(selectedProduct.minimumStock)}
            {selectedProduct.unitCode ? ` ${selectedProduct.unitCode}` : ""}
          </p>

          <div className="sale-form-row">
            <label>
              {text.quantity} {selectedProduct.unitCode ? `(${selectedProduct.unitCode})` : ""}
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>

            <button onClick={handleAddToCart}>{text.addToCart}</button>
          </div>

          <p>
            <strong>{text.linePreview}:</strong>{" "}
            {formatCurrency(quantity * (selectedPricing?.unitPrice ?? selectedProduct.unitPrice))}
          </p>
        </div>
      )}

      <CartTable items={cartItems} onRemove={handleRemoveFromCart} />

      <div className="card">
        <h3>{text.customer}</h3>

        <div className="sale-form-row">
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
              }}
              placeholder={text.searchCustomerPlaceholder}
              disabled={customersLoading}
            />
          </label>
        </div>

        <div className="sale-customer-results">
          <button
            type="button"
            className={`secondary-button ${selectedCustomerId === "WALK_IN" ? "active-choice" : ""}`}
            onClick={handleWalkInCustomer}
            disabled={customersLoading}
          >
            {text.walkInCustomer}
          </button>

          {selectedCustomer && (
            <p className="sale-customer-selected">
              <strong>{text.selectedCustomer}:</strong> {selectedCustomer.name}
              {selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ""}
            </p>
          )}

          {!customersLoading && customerSearch.trim() && filteredCustomers.length === 0 && (
            <p className="sale-customer-empty">{text.noCustomerMatch}</p>
          )}

          {!customersLoading && filteredCustomers.length > 0 && (
            <div className="sale-customer-options">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={`sale-customer-option ${selectedCustomerId === String(customer.id) ? "selected" : ""}`}
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <span>{customer.name}</span>
                  <small>
                    {[customer.phone, customer.email].filter(Boolean).join(" - ")}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>{text.paymentMethod}</h3>

        <div className="inventory-form-grid">
          <label>
            {text.paymentMethod}
            <select
              value={paymentMethod}
              onChange={(e) => {
                const nextMethod = e.target.value
                setPaymentMethod(nextMethod)
                if (nextMethod === "CASH") {
                  setPaymentReference("")
                  setPaymentAuthorizationCode("")
                  setPaymentConfirmedManually(false)
                }
              }}
            >
              <option value="CASH">{text.cash}</option>
              <option value="CREDIT_CARD">{text.creditCard}</option>
              <option value="DEBIT_CARD">{text.debitCard}</option>
            </select>
          </label>

          {paymentMethod !== "CASH" && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="card">
        <button onClick={handleCreateSale} disabled={saleLoading || cartItems.length === 0}>
          {saleLoading ? text.creating : text.submit}
        </button>
      </div>

      {lastSaleInvoice && (
        <SaleInvoicePreview sale={lastSaleInvoice} companyName={user?.companyName} />
      )}
    </div>
  )
}

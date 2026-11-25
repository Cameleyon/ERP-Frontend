import { useEffect, useMemo, useRef, useState } from "react"
import { getProductByCode, getProductBySku, type ProductLookupResponse } from "../api/productApi"
import ProductLookup from "../components/sales/ProductLookup"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import {
  createInventoryReceipt,
  createInventoryReceiptWithdrawal,
  getActiveInventoryReceipts,
  InventoryReceiptError,
  updateInventoryReceiptQuantity,
  type InventoryReceiptResponse,
  type CreateInventoryReceiptRequest,
} from "../api/inventoryReceiptApi"
import { getCostRubrics, type CompanyCostRubricResponse } from "../api/costRubricApi"
import TablePagination from "../components/common/TablePagination"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import QuantityInput from "../components/common/QuantityInput"
import ReceiptCostConfirmationDialog from "../components/inventory/ReceiptCostConfirmationDialog"
import { useAuth } from "../auth/AuthContext"
import { useI18n } from "../i18n/I18nContext"
import ErrorMessage from "../components/common/ErrorMessage"
import { CompanyCurrencyRequiredError } from "../utils/companyCurrency"
import { messages } from "../i18n/messages"
import { receiptErrorMessage } from "../i18n/inventoryReceiptMessages"
import { getLocalizedCostRubricName } from "../utils/costRubrics"
import { formatCurrency, formatReceiptDateTime, formatNumber } from "../utils/format"
import { getDefaultLocationId } from "../utils/locations"
import { assessReceiptCosts, readReceiptCost, type ReceiptConfirmationType } from "../utils/receiptCosts"
import { parseStockQuantity } from "../utils/decimalInput"
import { getProduct } from "../api/productManagementApi"
import { preferredSetupSite } from "../utils/setupGuide"
import { setupCopy } from "../i18n/setupCopy"

type CostAmountMap = Record<number, string>
type InventoryPageCopy = (typeof messages)[keyof typeof messages]["inventoryPage"]
const dateLocales = { en: "en-CA", fr: "fr-CA", es: "es" }
type ReceiptSortKey =
  | "productName"
  | "receivedQuantity"
  | "remainingQuantity"
  | "totalCostAmount"
  | "createdAt"
  | "updatedAt"
  | "lastAction"
type SortDirection = "asc" | "desc"
const RECEIPTS_PER_PAGE = 12

type PendingReceipt = {
  key: string
  payload: CreateInventoryReceiptRequest
  productName: string
  sku: string
}
type ReceiptDraft = Omit<PendingReceipt, "key">
type CostReview = { draft: ReceiptDraft; type: ReceiptConfirmationType; firstZeroId?: number }

type OpeningProps = { productId?: number; preferredSiteId?: number; onReviewProducts?: () => void }

export default function InventoryPage(props: OpeningProps = {}) {
  const { user } = useAuth()
  if (!user?.companyId) return null
  const scope = `cameleyon:pending-receipt:${user.companyId}:${user.id}`
  return <InventoryContent key={scope} storageKey={scope} {...props} />
}

function InventoryContent({ storageKey, productId, preferredSiteId, onReviewProducts }: OpeningProps & { storageKey: string }) {
  const { copy, language } = useI18n()
  const text = copy.inventoryPage
  const guide = setupCopy[language]

  const [productCode, setProductCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [pending, setPending] = useState<PendingReceipt | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || "null") } catch { return null }
  })
  const [receiptConflict, setReceiptConflict] = useState(false)
  const [handoffId, setHandoffId] = useState(pending ? undefined : productId)
  const [handoffError, setHandoffError] = useState("")
  const [siteReview, setSiteReview] = useState<string | null>(null)
  const inventoryHeading = useRef<HTMLHeadingElement>(null)
  const siteControl = useRef<HTMLSelectElement>(null)
  const [refreshWarning, setRefreshWarning] = useState("")
  const receiptInFlight = useRef(false)
  const [showScanner, setShowScanner] = useState(false)
  const [locations, setLocations] = useState<CompanyLocationResponse[]>([])
  const [locationId, setLocationId] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupResponse | null>(null)
  const [quantity, setQuantity] = useState("1")
  const [notes, setNotes] = useState("")
  const [rubrics, setRubrics] = useState<CompanyCostRubricResponse[]>([])
  const [rubricsLoading, setRubricsLoading] = useState(true)
  const [costAmounts, setCostAmounts] = useState<CostAmountMap>({})
  const [showMoreCosts, setShowMoreCosts] = useState(false)
  const [costReview, setCostReview] = useState<CostReview | null>(null)
  const receiveButton = useRef<HTMLButtonElement>(null)
  const [activeReceipts, setActiveReceipts] = useState<InventoryReceiptResponse[]>([])
  const [withdrawalReceiptId, setWithdrawalReceiptId] = useState<number | null>(null)
  const [withdrawalQuantity, setWithdrawalQuantity] = useState("1")
  const [withdrawalReason, setWithdrawalReason] = useState("")
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null)
  const [editedReceiptQuantity, setEditedReceiptQuantity] = useState("1")
  const [error, setError] = useState("")
  const [fieldError, setFieldError] = useState<{ id: string; message: string } | null>(null)
  const [success, setSuccess] = useState("")
  const lookupRequestRef = useRef(0)
  const receiptListRequest = useRef(0)

  function errorFor(err: unknown, fallback: string) {
    return err instanceof InventoryReceiptError ? receiptErrorMessage(err.code, language, fallback) : fallback
  }

  function showFieldError(id: string, message: string) {
    if (id.startsWith("receipt-cost-")) setShowMoreCosts(true)
    setFieldError({ id, message })
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  function readQuantity(value: string, integerOnly: boolean, inputId: string): number | undefined {
    const result = parseStockQuantity(value, integerOnly)
    if (!result.reason) return result.quantity
    const message = result.reason === "whole" ? copy.common.wholeNumberQuantity : result.reason === "positive" ? text.quantityPositive
      : receiptErrorMessage(result.reason === "range" ? "INVENTORY_QUANTITY_RANGE" : "INVALID_INVENTORY_QUANTITY_PRECISION", language, text.quantityPositive)
    showFieldError(inputId, message)
    return undefined
  }

  function clearFieldError(inputId: string) {
    setFieldError(current => current?.id === inputId ? null : current)
  }

  useEffect(() => {
    void loadInitialData()
    if (productId && !pending) inventoryHeading.current?.focus()
    return () => { lookupRequestRef.current++; receiptListRequest.current++ }
  }, [])

  async function loadInitialData() {
      try {
        setHandoffError("")
        setRubricsLoading(true)
        const [locationData, rubricData] = await Promise.all([
          getAccessibleCompanyLocations(),
          getCostRubrics(),
        ])
        const activeLocations = Array.isArray(locationData) ? locationData.filter((location) => location.active) : []
        const activeRubrics = Array.isArray(rubricData) ? rubricData.filter(isApplicableRubric) : []
        const pendingLocation = activeLocations.find(location => location.id === pending?.payload.locationId)
        const guidedLocation = preferredSetupSite(activeLocations, preferredSiteId)
        const defaultLocationId = pending ? (pendingLocation ? String(pendingLocation.id) : "")
          : handoffId ? String(guidedLocation?.id ?? "") : getDefaultLocationId(activeLocations)

        setLocations(activeLocations)
        setLocationId(defaultLocationId)
        setRubrics(activeRubrics)

        if (defaultLocationId) {
          if (handoffId && !pending) void verifyOpeningProduct(handoffId, defaultLocationId)
          await loadOpenReceipts(Number(defaultLocationId))
        }
      } catch (err) {
        console.error(err)
        if (handoffId && !pending) setHandoffError(guide.unavailable)
        else setError(errorFor(err, text.historyLoadError))
      } finally {
        setRubricsLoading(false)
      }
  }

  async function verifyOpeningProduct(id: number, site: string) {
    const attempt = ++lookupRequestRef.current
    setHandoffError("")
    setLookupLoading(true)
    try {
      const product = await getProduct(id)
      if (attempt !== lookupRequestRef.current) return
      if (product.id !== id || !product.active) {
        setHandoffError(product.id === id ? guide.inactive : guide.unavailable)
        return
      }
      const lookup = await getProductBySku(product.sku, Number(site))
      if (attempt !== lookupRequestRef.current) return
      if (lookup.id !== id || !lookup.active) {
        setHandoffError(lookup.id === id ? guide.inactive : guide.unavailable)
        return
      }
      setSelectedProduct(lookup)
      setProductCode(lookup.name)
    } catch {
      if (attempt === lookupRequestRef.current) setHandoffError(guide.unavailable)
    } finally {
      if (attempt === lookupRequestRef.current) setLookupLoading(false)
    }
  }

  async function loadOpenReceipts(nextLocationId: number) {
    const request = ++receiptListRequest.current
    const openReceipts = await getActiveInventoryReceipts(nextLocationId)
    if (request === receiptListRequest.current) setActiveReceipts(openReceipts)
  }

  async function handleLocationChange(nextLocationId: string, confirmed = false) {
    if (pending || receiptInFlight.current) return
    if (nextLocationId && !locations.some(site => String(site.id) === nextLocationId && site.active)) return
    if (!confirmed && handoffId && selectedProduct && (quantity !== "1" || notes.trim()
        || Object.values(costAmounts).some(value => value.trim()))) {
      setSiteReview(nextLocationId)
      return
    }
    clearProductSelection()
    setLocationId(nextLocationId)
    setProductCode("")
    setWithdrawalReceiptId(null)
    setEditingReceiptId(null)
    setHandoffError("")
    receiptListRequest.current++
    setActiveReceipts([])

    if (!nextLocationId) return

    try {
      setError("")
      if (handoffId) void verifyOpeningProduct(handoffId, nextLocationId)
      await loadOpenReceipts(Number(nextLocationId))
    } catch (err) {
      console.error(err)
      setError(errorFor(err, text.historyLoadError))
    }
  }

  function clearProductSelection() {
    lookupRequestRef.current++
    setLookupLoading(false)
    setSelectedProduct(null)
    setQuantity("1")
    setCostAmounts({})
    setNotes("")
    setShowMoreCosts(false)
    setCostReview(null)
    setFieldError(null)
  }

  async function handleLookup(code = productCode, selected?: { id: number; sku: string }) {
    if (saveLoading || pending || receiptInFlight.current) return
    if (!code.trim()) {
      setError(copy.newSalePage.barcodeRequired)
      return
    }

    const request = ++lookupRequestRef.current
    try {
      setLookupLoading(true)
      setSelectedProduct(null)
      setCostAmounts({})
      setNotes("")
      setError("")
      setSuccess("")
      const site = locationId ? Number(locationId) : null
      const product = selected ? await getProductBySku(selected.sku, site) : await getProductByCode(code.trim(), site)
      if (request !== lookupRequestRef.current) return
      if (!product.active || selected && product.id !== selected.id) throw new Error(text.lookupError)
      setSelectedProduct(product)
      setProductCode(product.name)
      setQuantity("1")
    } catch (err) {
      if (request !== lookupRequestRef.current) return
      console.error(err)
      setSelectedProduct(null)
      setError(text.lookupError)
    } finally {
      if (request === lookupRequestRef.current) setLookupLoading(false)
    }
  }

  async function handleReceipt() {
    if (saveLoading || receiptInFlight.current || receiptConflict) return
    if (pending) {
      await submitReceipt(pending)
      return
    }
    if (!selectedProduct) {
      setError(text.noProduct)
      return
    }
    if (!locationId || costReview) return
    const quantityValue = readQuantity(quantity, selectedProduct.quantityType === "INTEGER", "receipt-quantity")
    if (quantityValue === undefined) return
    if (!costAssessment) {
      const invalid = rubrics.find(rubric => "reason" in readReceiptCost(costAmounts[rubric.id] ?? ""))
      if (invalid) {
        const result = readReceiptCost(costAmounts[invalid.id] ?? "")
        const message = "reason" in result && result.reason === "precision"
          ? receiptErrorMessage("INVALID_RECEIPT_COST_PRECISION", language, text.invalidAcquisitionCost)
          : text.invalidAcquisitionCost
        showFieldError(`receipt-cost-${invalid.id}`, message)
      } else setError(text.invalidAcquisitionCost)
      return
    }
    const draft: ReceiptDraft = {
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      payload: {
        locationId: Number(locationId),
        productId: selectedProduct.id,
        receivedQuantity: quantityValue,
        notes,
        costLines: rubrics.map(rubric => ({
          companyCostRubricId: rubric.id,
          amount: costAssessment.amounts[rubric.id],
        })),
      },
    }
    if (costAssessment.type) {
      draft.payload.costConfirmation = { type: costAssessment.type, amounts: costAssessment.amounts }
      setCostReview({ draft, type: costAssessment.type, firstZeroId: costAssessment.zeroIds[0] })
      return
    }
    await startReceipt(draft)
  }

  async function startReceipt(draft: ReceiptDraft) {
    if (saveLoading || pending || receiptInFlight.current) return
    let operation: PendingReceipt
    try {
      operation = { ...draft, key: crypto.randomUUID() }
      sessionStorage.setItem(storageKey, JSON.stringify(operation))
    } catch {
      setError(text.receiptRetryStorageError)
      return
    }
    setPending(operation)
    await submitReceipt(operation)
  }

  function reviewCosts() {
    const id = costReview?.firstZeroId
    setCostReview(null)
    if (id != null && additionalRubrics.some(rubric => rubric.id === id)) setShowMoreCosts(true)
    requestAnimationFrame(() => {
      const field = id == null ? null : document.getElementById(`receipt-cost-${id}`)
      ;(field ?? receiveButton.current)?.focus()
    })
  }

  async function confirmCosts() {
    const review = costReview
    if (!review) return
    setCostReview(null)
    const payload = review.draft.payload
    const validatedQuantity = parseStockQuantity(quantity, selectedProduct?.quantityType === "INTEGER")
    if (!costAssessment || payload.locationId !== Number(locationId) || payload.productId !== selectedProduct?.id
        || payload.receivedQuantity !== validatedQuantity.quantity || payload.notes !== notes
        || JSON.stringify(payload.costConfirmation?.amounts) !== JSON.stringify(costAssessment.amounts)) return
    await startReceipt(review.draft)
  }

  function finishPending() {
    try { sessionStorage.removeItem(storageKey) } catch { /* The same key remains safe to replay. */ }
    setPending(null)
    setReceiptConflict(false)
  }

  async function submitReceipt(operation: PendingReceipt) {
    receiptInFlight.current = true
    setSaveLoading(true)
    setShowScanner(false)
    setError("")
    setFieldError(null)
    setSuccess("")
    setRefreshWarning("")
    try {
      const response = await createInventoryReceipt(operation.payload, operation.key)
      finishPending()
      setHandoffId(undefined)
      clearProductSelection()
      setProductCode("")
      setSuccess(text.receiptSuccess(response.id))
      // A committed receipt stays confirmed even if this independent read fails.
      try {
        await loadOpenReceipts(Number(response.locationId))
      } catch {
        setRefreshWarning(text.receiptRefreshWarning)
      }
    } catch (err) {
      if (err instanceof InventoryReceiptError && err.rejected) {
        finishPending()
        const quantityError = err.code === "INVALID_INVENTORY_QUANTITY_PRECISION"
        const costError = err.code === "INVALID_RECEIPT_COST_PRECISION"
          && rubrics.some(rubric => rubric.id === err.rubricId)
        if (quantityError || costError) {
          if (!selectedProduct && operation.payload.locationId) {
            setQuantity(String(operation.payload.receivedQuantity))
            setNotes(operation.payload.notes)
            setCostAmounts(Object.fromEntries(operation.payload.costLines.map(line => [line.companyCostRubricId, String(line.amount)])))
            await verifyOpeningProduct(operation.payload.productId, String(operation.payload.locationId))
          }
          showFieldError(quantityError ? "receipt-quantity" : `receipt-cost-${err.rubricId}`, errorFor(err, text.receiptError))
          return
        }
        setError(err.code === "DUPLICATE_RECEIPT_COST_RUBRIC" ? text.duplicateReceiptCostRubric
          : err.code === "INACTIVE_RECEIPT_PRODUCT" ? text.inactiveReceiptProduct : errorFor(err, text.receiptError))
        if (err.code === "RECEIPT_COST_CONFIRMATION_REQUIRED" || err.code === "RECEIPT_COST_CONFIRMATION_MISMATCH") {
          try { setRubrics((await getCostRubrics()).filter(isApplicableRubric)) } catch { /* Keep the draft for review. */ }
        }
      } else if (err instanceof InventoryReceiptError && err.code === "RECEIPT_OPERATION_CONFLICT") {
        setReceiptConflict(true)
        setError(text.receiptOperationConflict)
      } else if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(errorFor(err, text.receiptOutcomeUnknown))
      }
    } finally {
      receiptInFlight.current = false
      setSaveLoading(false)
    }
  }

  async function handleReceiptWithdrawal(receipt: InventoryReceiptResponse) {
    if (saveLoading || pending || receiptInFlight.current) return
    const inputId = `withdrawal-quantity-${receipt.id}`
    const withdrawalQuantityValue = readQuantity(withdrawalQuantity, receipt.quantityType === "INTEGER", inputId)
    if (withdrawalQuantityValue === undefined) return
    clearFieldError(inputId)

    try {
      setSaveLoading(true)
      setError("")
      setSuccess("")
      const response = await createInventoryReceiptWithdrawal(receipt.id, {
        quantity: withdrawalQuantityValue,
        reason: withdrawalReason,
      })

      setSuccess(text.withdrawalSuccess(response.productName))
      setWithdrawalReceiptId(null)
      setWithdrawalQuantity("1")
      setWithdrawalReason("")
      if (locationId) await refreshAfterUpdate(Number(locationId))
    } catch (err) {
      console.error(err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        if (err instanceof InventoryReceiptError && err.code === "INVALID_INVENTORY_QUANTITY_PRECISION") {
          showFieldError(inputId, errorFor(err, text.withdrawalError))
        } else setError(errorFor(err, text.withdrawalError))
      }
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleReceiptQuantityUpdate(receipt: InventoryReceiptResponse) {
    if (saveLoading || pending || receiptInFlight.current) return
    const inputId = `correction-quantity-${receipt.id}`
    const editedReceiptQuantityValue = readQuantity(editedReceiptQuantity, receipt.quantityType === "INTEGER", inputId)
    if (editedReceiptQuantityValue === undefined) return
    clearFieldError(inputId)

    try {
      setSaveLoading(true)
      setError("")
      setSuccess("")
      const response = await updateInventoryReceiptQuantity(receipt.id, {
        receivedQuantity: editedReceiptQuantityValue,
      })

      setSuccess(text.receiptUpdated(response.id))
      setEditingReceiptId(null)
      if (locationId) await refreshAfterUpdate(Number(locationId))
    } catch (err) {
      console.error(err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        if (err instanceof InventoryReceiptError && ["INVALID_INVENTORY_QUANTITY_PRECISION", "LEGACY_RECEIPT_QUANTITY_PRECISION"].includes(err.code)) {
          showFieldError(inputId, errorFor(err, text.receiptUpdateError))
        } else setError(err instanceof InventoryReceiptError && err.code === "RECEIPT_QUANTITY_HISTORY_LOCKED"
          ? text.receiptQuantityHistoryLocked : errorFor(err, text.receiptUpdateError))
      }
    } finally {
      setSaveLoading(false)
    }
  }

  async function refreshAfterUpdate(site: number) {
    setRefreshWarning("")
    try {
      await loadOpenReceipts(site)
    } catch {
      setRefreshWarning(text.receiptRefreshWarning)
    }
  }

  function handleDetectedBarcode(value: string) {
    if (saveLoading || pending || receiptInFlight.current || rubricsLoading || !locationId) return
    setProductCode(value)
    setShowScanner(false)
    void handleLookup(value)
  }

  function updateCostAmount(rubricId: number, value: string) {
    clearFieldError(`receipt-cost-${rubricId}`)
    setCostReview(null)
    setCostAmounts((prev) => ({ ...prev, [rubricId]: value }))
  }

  function startWithdrawal(receipt: InventoryReceiptResponse) {
    setFieldError(null)
    setWithdrawalReceiptId(receipt.id)
    setWithdrawalQuantity("1")
    setWithdrawalReason("")
    setEditingReceiptId(null)
  }

  function startEdit(receipt: InventoryReceiptResponse) {
    setFieldError(null)
    setEditingReceiptId(receipt.id)
    setEditedReceiptQuantity(String(receipt.receivedQuantity))
    setWithdrawalReceiptId(null)
  }

  function cancelReceiptCreation() {
    clearProductSelection()
    setProductCode("")
    setError("")
    setSuccess("")
  }

  const costAssessment = useMemo(() => assessReceiptCosts(rubrics.map(rubric => rubric.id), costAmounts), [rubrics, costAmounts])
  const totalCost = costAssessment?.total ?? 0
  const primaryRubrics = rubrics.filter(rubric => ["COST_OF_GOODS", "TRANSPORT"].includes(rubric.catalog?.code ?? rubric.code))
  const additionalRubrics = rubrics.filter(rubric => !primaryRubrics.includes(rubric))
  const visibleRubrics = [...primaryRubrics, ...additionalRubrics.filter(rubric =>
    showMoreCosts || (costAmounts[rubric.id] ?? "").trim() !== "")]
  const validQuantity = parseStockQuantity(quantity, selectedProduct?.quantityType === "INTEGER")
  const unitCost = costAssessment && validQuantity.cents
    ? Number((costAssessment.totalUnits * 100n + validQuantity.cents / 2n) / validQuantity.cents) / 10000
    : null
  const unitLabel = selectedProduct?.unitName ? ` ${selectedProduct.unitName}` : ""

  return (
    <div>
      <div className="page-title-row">
        <h1 ref={inventoryHeading} tabIndex={-1}>{text.title}</h1>

        {locations.length > 0 && (
          <label className="page-title-site-filter">
            <select ref={siteControl} aria-label={guide.site} value={locationId} disabled={saveLoading || !!pending} onChange={(event) => void handleLocationChange(event.target.value)}>
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

      {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
      {success && <div className="card success">{success}</div>}
      {refreshWarning && <p role="status">{refreshWarning}</p>}
      {handoffId && !pending && (handoffError || !rubricsLoading && !locations.length) && <div className="card">
        <p role="status">{handoffError || guide.siteBlocked}</p>
        <button type="button" onClick={() => locationId ? void verifyOpeningProduct(handoffId, locationId) : void loadInitialData()}>{guide.retry}</button>
        {onReviewProducts && <button type="button" className="secondary-button" onClick={onReviewProducts}>{guide.products}</button>}
      </div>}
      {handoffId && !pending && (rubricsLoading || lookupLoading) && <p role="status">{guide.loading}</p>}
      {siteReview !== null && <ReceiptCostConfirmationDialog title={guide.switchTitle} message={guide.switchReason}
        prompt="" reviewLabel={text.cancel} confirmLabel={guide.switchSite}
        onReview={() => { setSiteReview(null); requestAnimationFrame(() => siteControl.current?.focus()) }}
        onConfirm={() => { const next = siteReview; setSiteReview(null); void handleLocationChange(next, true) }} />}

      <div className="card inventory-receipt-editor">
        <h3>{text.inventoryForm}</h3>
        <div className="card nested-card scanner-toggle-card">
          <div className="scanner-header">
            <h3>{text.scannerTitle}</h3>
            <button type="button" className="secondary-button" disabled={saveLoading || !!pending || rubricsLoading || !locationId} onClick={() => setShowScanner((prev) => !prev)}>
              {showScanner ? text.closeScanner : text.openScanner}
            </button>
          </div>
          {showScanner && (
            <div className="scanner-container">
              <BarcodeScanner onDetected={handleDetectedBarcode} />
            </div>
          )}
        </div>
        <ProductLookup key={locationId} embedded disabled={saveLoading || !!pending || rubricsLoading || !locationId}
          value={productCode} lookupLoading={lookupLoading} onError={setError}
          onChange={value => { setHandoffId(undefined); setHandoffError(""); clearProductSelection(); setProductCode(value) }}
          onLookup={() => { void handleLookup() }}
          onSelect={product => { setProductCode(product.name); void handleLookup(product.sku, product) }} />

        {selectedProduct && (
          <fieldset disabled={saveLoading || !!pending} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <h3>{text.createReceipt}</h3>
          <p><strong>{text.name}:</strong> {selectedProduct.name}</p>
          <p><strong>SKU:</strong> {selectedProduct.sku}</p>
          <p><strong>{text.unit}:</strong> {selectedProduct.unitName || "-"}</p>
          <p><strong>{text.currentStock}:</strong> {formatNumber(selectedProduct.currentStock)}{unitLabel}</p>
          <p><strong>{text.minimumStock}:</strong> {formatNumber(selectedProduct.minimumStock)}{unitLabel}</p>

          <div className="inventory-form-grid">
            <label>
              {text.receivedQuantity}{unitLabel ? ` (${selectedProduct.unitName})` : ""}
              <QuantityInput
                inputId="receipt-quantity"
                step={selectedProduct.quantityType === "INTEGER" ? 1 : 0.01}
                value={quantity}
                onChange={value => { clearFieldError("receipt-quantity"); setQuantity(value) }}
                ariaLabel={text.receivedQuantity}
                error={fieldError?.id === "receipt-quantity" ? fieldError.message : undefined}
              />
              <FieldError id="receipt-quantity" error={fieldError} />
            </label>

            <label className="full-width">
              {text.notes}
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={text.notesPlaceholder}
              />
            </label>
          </div>

          <div className="card nested-card">
            <h3>{text.costRubrics}</h3>
            {rubricsLoading ? (
              <p>{text.rubricsLoading}</p>
            ) : rubrics.length === 0 ? (
              <p>{text.rubricsEmpty}</p>
            ) : (
              <div id="receipt-cost-fields" className="inventory-form-grid">
                {visibleRubrics.map((rubric) => {
                  const code = rubric.catalog?.code ?? rubric.code
                  const name = code === "COST_OF_GOODS" ? text.totalPurchasePrice : code === "TRANSPORT"
                    ? text.transportDelivery : getLocalizedCostRubricName(rubric.code, rubric.name, language, rubric.catalog)
                  const inputId = `receipt-cost-${rubric.id}`
                  return (
                    <div className="inventory-cost-field" key={rubric.id}>
                      <label htmlFor={inputId}>{name}</label>
                      <QuantityInput
                        inputId={inputId}
                        min={0}
                        step={0.0001}
                        buttonStep={1}
                        value={costAmounts[rubric.id] ?? ""}
                        onChange={(value) => updateCostAmount(rubric.id, value)}
                        arrowLabels={{
                          decrease: text.decreaseCost(name),
                          increase: text.increaseCost(name),
                        }}
                        error={fieldError?.id === inputId ? fieldError.message : undefined}
                      />
                      <FieldError id={inputId} error={fieldError} />
                    </div>
                  )
                })}
              </div>
            )}
            {additionalRubrics.length > 0 && <button type="button" className="secondary-button"
              aria-expanded={showMoreCosts} aria-controls="receipt-cost-fields" onClick={() => setShowMoreCosts(show => !show)}>
              {showMoreCosts ? text.hideMoreCosts : text.showMoreCosts}
            </button>}
            <div className="receipt-summary">
              <p><strong>{text.totalAcquisitionCost}:</strong> {costAssessment ? formatCurrency(totalCost) : "-"}</p>
              <p><strong>{text.unitAcquisitionCost}:</strong> {unitCost !== null ? formatCurrency(unitCost) : "-"}</p>
            </div>
          </div>

          <div className="form-actions">
            <button ref={receiveButton} type="button" onClick={handleReceipt} disabled={saveLoading}>
              {saveLoading ? text.submitting : text.receiveStock}
            </button>
            <button type="button" className="secondary-button" onClick={cancelReceiptCreation}>
              {text.cancel}
            </button>
          </div>
          </fieldset>
        )}
        {costReview && <ReceiptCostConfirmationDialog
          title={costReview.type === "ZERO_TOTAL" ? text.zeroCostsTitle : text.partialCostsTitle}
          message={costReview.type === "ZERO_TOTAL" ? text.zeroCostsMessage : text.partialCostsMessage}
          prompt={costReview.type === "ZERO_TOTAL" ? text.zeroCostsPrompt : text.partialCostsPrompt}
          reviewLabel={text.reviewCosts} confirmLabel={text.confirmCosts}
          onReview={reviewCosts} onConfirm={() => void confirmCosts()} />}
        {pending && <div>
          <p role="status">{saveLoading ? text.submitting : receiptConflict ? text.receiptOperationConflict : text.receiptOutcomeUnknown}</p>
          <p>{pending.productName} ({pending.sku}) · {formatNumber(pending.payload.receivedQuantity)}</p>
          <button type="button" disabled={saveLoading || receiptConflict} onClick={() => void handleReceipt()}>{text.retryReceipt}</button>
        </div>}

        <ActiveReceiptTable
          fieldError={fieldError}
          rows={activeReceipts}
          text={text}
          locale={dateLocales[language]}
          withdrawalReceiptId={withdrawalReceiptId}
          withdrawalQuantity={withdrawalQuantity}
          withdrawalReason={withdrawalReason}
          editingReceiptId={editingReceiptId}
          editedReceiptQuantity={editedReceiptQuantity}
          saveLoading={saveLoading || !!pending}
          onStartWithdrawal={startWithdrawal}
          onCancelWithdrawal={() => setWithdrawalReceiptId(null)}
          onWithdrawalQuantityChange={value => { clearFieldError(`withdrawal-quantity-${withdrawalReceiptId}`); setWithdrawalQuantity(value) }}
          onWithdrawalReasonChange={setWithdrawalReason}
          onSubmitWithdrawal={handleReceiptWithdrawal}
          onStartEdit={startEdit}
          onCancelEdit={() => setEditingReceiptId(null)}
          onEditedQuantityChange={value => { clearFieldError(`correction-quantity-${editingReceiptId}`); setEditedReceiptQuantity(value) }}
          onSubmitEdit={handleReceiptQuantityUpdate}
        />
      </div>

    </div>
  )
}

function FieldError({ id, error }: { id: string; error: { id: string; message: string } | null }) {
  return error?.id === id ? <small id={`${id}-error`} className="inventory-field-error" role="alert">{error.message}</small> : null
}

function isApplicableRubric(rubric: CompanyCostRubricResponse) {
  return rubric.active && rubric.catalog?.treatment !== "DEDUCT"
}

function ActiveReceiptTable({
  fieldError,
  rows,
  text,
  locale,
  withdrawalReceiptId,
  withdrawalQuantity,
  withdrawalReason,
  editingReceiptId,
  editedReceiptQuantity,
  saveLoading,
  onStartWithdrawal,
  onCancelWithdrawal,
  onWithdrawalQuantityChange,
  onWithdrawalReasonChange,
  onSubmitWithdrawal,
  onStartEdit,
  onCancelEdit,
  onEditedQuantityChange,
  onSubmitEdit,
}: {
  fieldError: { id: string; message: string } | null
  rows: InventoryReceiptResponse[]
  text: InventoryPageCopy
  locale: string
  withdrawalReceiptId: number | null
  withdrawalQuantity: string
  withdrawalReason: string
  editingReceiptId: number | null
  editedReceiptQuantity: string
  saveLoading: boolean
  onStartWithdrawal: (receipt: InventoryReceiptResponse) => void
  onCancelWithdrawal: () => void
  onWithdrawalQuantityChange: (quantity: string) => void
  onWithdrawalReasonChange: (reason: string) => void
  onSubmitWithdrawal: (receipt: InventoryReceiptResponse) => Promise<void>
  onStartEdit: (receipt: InventoryReceiptResponse) => void
  onCancelEdit: () => void
  onEditedQuantityChange: (quantity: string) => void
  onSubmitEdit: (receipt: InventoryReceiptResponse) => Promise<void>
}) {
  const [filterValue, setFilterValue] = useState("")
  const [sortKey, setSortKey] = useState<ReceiptSortKey>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)

  const visibleRows = useMemo(() => {
    const normalizedFilter = filterValue.trim().toLocaleLowerCase()
    const filteredRows = normalizedFilter
      ? rows.filter((row) => row.productName.toLocaleLowerCase().includes(normalizedFilter))
      : rows

    return [...filteredRows].sort((left, right) => {
      const comparison = compareReceiptRows(left, right, sortKey)
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filterValue, rows, sortDirection, sortKey])

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / RECEIPTS_PER_PAGE))
  const paginatedRows = visibleRows.slice(
    (currentPage - 1) * RECEIPTS_PER_PAGE,
    currentPage * RECEIPTS_PER_PAGE,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filterValue, rows])

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount)
    }
  }, [currentPage, pageCount])

  function handleSort(nextKey: ReceiptSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection("asc")
  }

  return (
    <div className="nested-card inventory-open-receipts">
      <h3 id="active-receipts-heading">{text.activeReceipts}</h3>
      <label className="inventory-receipt-filter">
        {text.filter}
        <input
          type="text"
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          placeholder={text.productFilterPlaceholder}
        />
      </label>
      <div className="inventory-receipt-scroll" role="region" aria-labelledby="active-receipts-heading" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <SortableHeader label={text.product} sortKey="productName" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader
                label={text.receivedQuantity}
                sortKey="receivedQuantity"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className="inventory-quantity-header"
              />
              <SortableHeader
                label={text.remainingQuantity}
                sortKey="remainingQuantity"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className="inventory-quantity-header"
              />
              <SortableHeader label={text.totalCost} sortKey="totalCostAmount" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader label={text.createdAt} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader label={text.updatedAt} sortKey="updatedAt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortableHeader label={text.lastAction} sortKey="lastAction" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <th className="mobile-sticky-actions" scope="col" aria-label={text.actions} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr><td colSpan={8}>{text.noActiveReceipts}</td></tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.productName}</td>
                  <td>{formatNumber(row.receivedQuantity)}</td>
                  <td>{formatNumber(row.remainingQuantity)}</td>
                  <td>{formatCurrency(row.totalCostAmount)}</td>
                  <td>{row.receivedAtInstant && row.receivedAtZoneId
                    ? formatReceiptDateTime(row.receivedAtInstant, locale, row.receivedAtZoneId)
                    : <>{formatReceiptDateTime(row.createdAt, locale)} <small>({text.receiptZoneUnverified})</small></>}</td>
                  <td>{row.updatedAt && row.updatedAt !== row.createdAt
                    ? <>{formatReceiptDateTime(row.updatedAt, locale)} <small>({text.receiptZoneUnverified})</small></> : "-"}</td>
                  <td>{formatReceiptAction(row.lastAction, text)}</td>
                  <td className="mobile-sticky-actions">
                    {withdrawalReceiptId === row.id ? (
                      <div className="inventory-inline-actions">
                        <QuantityInput
                          inputId={`withdrawal-quantity-${row.id}`}
                          step={row.quantityType === "INTEGER" ? 1 : 0.01}
                          ariaLabel={text.withdraw}
                          error={fieldError?.id === `withdrawal-quantity-${row.id}` ? fieldError.message : undefined}
                          value={withdrawalQuantity}
                          onChange={onWithdrawalQuantityChange}
                        />
                        <FieldError id={`withdrawal-quantity-${row.id}`} error={fieldError} />
                        <input
                          type="text"
                          value={withdrawalReason}
                          onChange={(event) => onWithdrawalReasonChange(event.target.value)}
                          placeholder={text.reasonPlaceholder}
                        />
                        <button type="button" onClick={() => void onSubmitWithdrawal(row)} disabled={saveLoading}>
                          {text.confirm}
                        </button>
                        <button type="button" className="secondary-button" onClick={onCancelWithdrawal}>
                          {text.cancel}
                        </button>
                      </div>
                    ) : editingReceiptId === row.id ? (
                      <div className="inventory-inline-actions">
                        <QuantityInput
                          inputId={`correction-quantity-${row.id}`}
                          step={row.quantityType === "INTEGER" ? 1 : 0.01}
                          ariaLabel={text.receivedQuantity}
                          error={fieldError?.id === `correction-quantity-${row.id}` ? fieldError.message : undefined}
                          value={editedReceiptQuantity}
                          onChange={onEditedQuantityChange}
                        />
                        <FieldError id={`correction-quantity-${row.id}`} error={fieldError} />
                        <button type="button" onClick={() => void onSubmitEdit(row)} disabled={saveLoading}>
                          {text.save}
                        </button>
                        <button type="button" className="secondary-button" onClick={onCancelEdit}>
                          {text.cancel}
                        </button>
                      </div>
                    ) : (
                      <div className="inventory-receipt-actions">
                        <button type="button" className="compact-action-button" onClick={() => onStartWithdrawal(row)}>
                          {text.withdraw}
                        </button>
                        <button
                          type="button"
                          className="secondary-button compact-action-button"
                          onClick={() => onStartEdit(row)}
                        >
                          {text.edit}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {visibleRows.length > RECEIPTS_PER_PAGE && (
        <TablePagination
          currentPage={currentPage}
          pageCount={pageCount}
          paginationLabel={text.paginationLabel}
          firstPageLabel={text.firstPage}
          previousPageLabel={text.previousPage}
          nextPageLabel={text.nextPage}
          lastPageLabel={text.lastPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string
  sortKey: ReceiptSortKey
  activeKey: ReceiptSortKey
  direction: SortDirection
  onSort: (sortKey: ReceiptSortKey) => void
  className?: string
}) {
  return (
    <th className={className}>
      <button type="button" className="table-sort-button" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span aria-hidden="true">{activeKey === sortKey ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  )
}

function compareReceiptRows(
  left: InventoryReceiptResponse,
  right: InventoryReceiptResponse,
  sortKey: ReceiptSortKey,
) {
  switch (sortKey) {
    case "receivedQuantity":
    case "remainingQuantity":
    case "totalCostAmount":
      return left[sortKey] - right[sortKey]
    case "createdAt":
      return receiptDateSortValue(left.receivedAtInstant ?? left.createdAt) - receiptDateSortValue(right.receivedAtInstant ?? right.createdAt)
    case "updatedAt":
      return receiptDateSortValue(left.updatedAt ?? left.createdAt) - receiptDateSortValue(right.updatedAt ?? right.createdAt)
    case "lastAction":
      return left.lastAction.localeCompare(right.lastAction)
    case "productName":
    default:
      return left.productName.localeCompare(right.productName)
  }
}

function receiptDateSortValue(value: string) {
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + "Z")
}

function formatReceiptAction(action: InventoryReceiptResponse["lastAction"], text: InventoryPageCopy) {
  switch (action) {
    case "WITHDRAWAL":
      return text.withdrawalActionLabel
    case "MODIFICATION":
      return text.modificationActionLabel
    case "CREATION":
    default:
      return text.creationActionLabel
  }
}

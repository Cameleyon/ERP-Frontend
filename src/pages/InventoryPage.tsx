import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
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
import { stockWorkspaceCopy } from "../i18n/stockWorkspaceCopy"
import { StockFacts, StockHeading, StockStatus } from "../components/inventory/StockWorkspace"

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
  opening?: boolean
}
type ReceiptDraft = Omit<PendingReceipt, "key">
type CostReview = { draft: ReceiptDraft; type: ReceiptConfirmationType; firstZeroId?: number }

type OpeningProps = { productId?: number; preferredSiteId?: number; inspectStock?: boolean; onReviewProducts?: () => void }

export default function InventoryPage(props: OpeningProps = {}) {
  const { user } = useAuth()
  if (!user?.companyId) return null
  const scope = `cameleyon:pending-receipt:${user.companyId}:${user.id}`
  return <InventoryContent key={scope} storageKey={scope} {...props} />
}

function InventoryContent({ storageKey, productId, preferredSiteId, inspectStock, onReviewProducts }: OpeningProps & { storageKey: string }) {
  const { copy, language } = useI18n()
  const { user } = useAuth()
  const text = copy.inventoryPage
  const guide = setupCopy[language]
  const labels = stockWorkspaceCopy[language]
  const currency = user?.companyCurrencyCode || "USD"
  const money = (value: number) => formatCurrency(value, currency, language)

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
  const [view, setView] = useState<"receive" | "active">("receive")
  const [focusedReceiptProduct, setFocusedReceiptProduct] = useState<{ id: number; name: string } | null>(null)
  const [received, setReceived] = useState<{ receipt: InventoryReceiptResponse; productName: string; unit: string } | null>(null)
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
    setFocusedReceiptProduct(null)
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
      opening: handoffId === selectedProduct.id && !inspectStock,
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
    setReceived(null)
    setRefreshWarning("")
    try {
      const response = await createInventoryReceipt(operation.payload, operation.key)
      const opening = operation.opening ?? (handoffId === operation.payload.productId && !inspectStock)
      setReceived({ receipt: response, productName: operation.productName, unit: selectedProduct?.unitName || "" })
      finishPending()
      setHandoffId(undefined)
      clearProductSelection()
      setProductCode("")
      setSuccess(text.receiptSuccess(response.id))
      if (opening) {
        setFocusedReceiptProduct({ id: operation.payload.productId, name: operation.productName })
        setView("active")
        requestAnimationFrame(() => inventoryHeading.current?.focus())
      }
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
    showMoreCosts || fieldError?.id === `receipt-cost-${rubric.id}` || (costAmounts[rubric.id] ?? "").trim() !== "")]
  const validQuantity = parseStockQuantity(quantity, selectedProduct?.quantityType === "INTEGER")
  const unitCost = costAssessment && validQuantity.cents
    ? Number((costAssessment.totalUnits * 100n + validQuantity.cents / 2n) / validQuantity.cents) / 10000
    : null
  const unitLabel = selectedProduct?.unitName ? ` ${selectedProduct.unitName}` : ""
  const selectedSiteName = locations.find(site => String(site.id) === locationId)?.name
  const opening = !!handoffId && !inspectStock
  const showReceiptEditor = view === "receive"
  const siteField = (label: string) => locations.length > 0 && <label className="stock-field">
    {label}
    <select ref={siteControl} aria-label={guide.site} value={locationId} disabled={saveLoading || !!pending}
      onChange={event => void handleLocationChange(event.target.value)}>
      {!locationId && <option value="">{guide.selectSite}</option>}
      {locations.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
    </select>
  </label>

  return (
    <div className="stock-workspace">
      <StockHeading headingRef={inventoryHeading} title={text.title} description={showReceiptEditor ? labels.receiveHelp : labels.activeHelp}>
        {!showReceiptEditor && <button type="button" className="workspace-primary" onClick={() => setView("receive")}>{text.receiveStock}</button>}
      </StockHeading>
      <div className="stock-view-switch" role="group" aria-label={text.title}>
        <button type="button" aria-pressed={showReceiptEditor} aria-controls="stock-receiving-view" onClick={() => setView("receive")}>{labels.receiving}</button>
        <button type="button" aria-pressed={!showReceiptEditor} aria-controls="stock-active-view" disabled={saveLoading || !!pending}
          onClick={() => { setShowScanner(false); setView("active") }}>{text.activeReceipts}</button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
      {success && <div className="stock-panel stock-highlight" role="status">
        <strong>{success}</strong>
        {received && success === text.receiptSuccess(received.receipt.id) && <p>
          {[received.productName, received.receipt.locationName || selectedSiteName,
          Number.isFinite(received.receipt.receivedQuantity) ? `${formatNumber(received.receipt.receivedQuantity)} ${received.unit}`.trim() : null,
          Number.isFinite(received.receipt.totalCostAmount) ? `${text.totalCost}: ${money(received.receipt.totalCostAmount)}` : null,
          Number.isFinite(received.receipt.unitCost) ? `${text.unitAcquisitionCost}: ${money(received.receipt.unitCost)}` : null].filter(Boolean).join(" · ")}
        </p>}
      </div>}
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

      <div id="stock-receiving-view" className="stock-receive-layout inventory-receipt-editor" hidden={!showReceiptEditor}>
        <section className="stock-panel stock-receive-context">
          <div className="stock-panel-heading"><h2>{opening ? guide.opening : text.createReceipt}</h2>
            <button type="button" className="workspace-outline" aria-expanded={showScanner}
              disabled={saveLoading || !!pending || rubricsLoading || !locationId} onClick={() => setShowScanner(prev => !prev)}>
              {showScanner ? text.closeScanner : text.scannerTitle}
            </button></div>
          {showScanner && <div className="scanner-container"><BarcodeScanner onDetected={handleDetectedBarcode} /></div>}
          <div className="stock-field-pair">
          {showReceiptEditor && siteField(labels.site)}
          <ProductLookup key={locationId} embedded disabled={saveLoading || !!pending || rubricsLoading || !locationId}
            value={productCode} lookupLoading={lookupLoading} onError={setError}
            onChange={value => { setHandoffId(undefined); setHandoffError(""); clearProductSelection(); setProductCode(value) }}
            onLookup={() => { void handleLookup() }}
            onSelect={product => { setProductCode(product.name); void handleLookup(product.sku, product) }} />
        </div>

        {selectedProduct && (
          <fieldset disabled={saveLoading || !!pending} className="stock-fieldset">
          <div className="stock-context">
            <div><strong>{selectedProduct.name}</strong>
              <p className="stock-muted">{[selectedProduct.sku, selectedProduct.unitName,
                selectedProduct.quantityType === "INTEGER" ? copy.productsPage.quantityInteger : copy.productsPage.quantityDecimal].filter(Boolean).join(" · ")}</p>
            </div>
            <div><strong>{text.currentStock}: {formatNumber(selectedProduct.currentStock)}{unitLabel}</strong>
              <p className="stock-muted">{text.minimumStock}: {formatNumber(selectedProduct.minimumStock)}{unitLabel}</p>
            </div>
          </div>

          <div className="stock-field-pair stock-receive-quantity">
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

            <label>
              {labels.notes}
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={text.notesPlaceholder}
              />
            </label>
          </div>
          </fieldset>
        )}
        </section>
        {selectedProduct && <>
          <fieldset className="stock-panel stock-receive-costs" disabled={saveLoading || !!pending} aria-labelledby="stock-cost-heading">
            <h2 id="stock-cost-heading">{labels.acquisition} <small>({currency})</small></h2>
            <p className="stock-muted">{labels.costHint}</p>
            {rubricsLoading ? (
              <p>{text.rubricsLoading}</p>
            ) : rubrics.length === 0 ? (
              <p>{text.rubricsEmpty}</p>
            ) : (
              <div id="receipt-cost-fields" className="stock-field-pair">
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
            {additionalRubrics.length > 0 && <button type="button" className="stock-disclosure-button"
              aria-expanded={showMoreCosts} aria-controls="receipt-cost-fields" onClick={() => setShowMoreCosts(show => !show)}>
              <span aria-hidden="true">{showMoreCosts ? "− " : "+ "}</span>{showMoreCosts ? text.hideMoreCosts : text.showMoreCosts}
            </button>}
          </fieldset>
          <section className="stock-panel stock-highlight stock-receive-summary">
            <h2>{labels.bill}</h2>
            <StockFacts entries={[[labels.site, selectedSiteName || guide.selectSite],
              [text.receivedQuantity, validQuantity.quantity === undefined ? "-" : `${formatNumber(validQuantity.quantity)}${unitLabel}`],
              [text.totalAcquisitionCost, costAssessment ? money(totalCost) : "-"],
              [text.unitAcquisitionCost, unitCost !== null ? money(unitCost) : "-"]]} />
            <button ref={receiveButton} className="workspace-primary stock-full-action" type="button" onClick={handleReceipt} disabled={saveLoading || !!pending}>
              {saveLoading ? text.submitting : text.receiveStock}
            </button>
            <button type="button" className="workspace-text-action stock-full-action" disabled={saveLoading || !!pending} onClick={cancelReceiptCreation}>
              {text.cancel}
            </button>
          </section>
        </>}
      </div>
        {costReview && <ReceiptCostConfirmationDialog
          title={costReview.type === "ZERO_TOTAL" ? text.zeroCostsTitle : text.partialCostsTitle}
          message={costReview.type === "ZERO_TOTAL" ? text.zeroCostsMessage : text.partialCostsMessage}
          prompt={costReview.type === "ZERO_TOTAL" ? text.zeroCostsPrompt : text.partialCostsPrompt}
          reviewLabel={text.reviewCosts} confirmLabel={text.confirmCosts}
          onReview={reviewCosts} onConfirm={() => void confirmCosts()}>
          <StockFacts entries={[[text.product, `${costReview.draft.productName} · ${costReview.draft.sku}`],
            [labels.site, selectedSiteName || "-"],
            [text.receivedQuantity, `${formatNumber(costReview.draft.payload.receivedQuantity)}${unitLabel}`],
            [text.totalAcquisitionCost, money(totalCost)], [text.unitAcquisitionCost, unitCost !== null ? money(unitCost) : "-"]]} />
        </ReceiptCostConfirmationDialog>}
        {pending && <div className="stock-panel">
          <p role="status">{saveLoading ? text.submitting : receiptConflict ? text.receiptOperationConflict : text.receiptOutcomeUnknown}</p>
          <p>{pending.productName} ({pending.sku}) · {formatNumber(pending.payload.receivedQuantity)}</p>
          <button type="button" disabled={saveLoading || receiptConflict} onClick={() => void handleReceipt()}>{text.retryReceipt}</button>
        </div>}

        <div id="stock-active-view" hidden={showReceiptEditor}>
        <ActiveReceiptTable
          fieldError={fieldError}
          rows={activeReceipts}
          text={text}
          locale={dateLocales[language]}
          money={money}
          siteField={!showReceiptEditor && siteField(guide.site)}
          siteName={selectedSiteName}
          focusedProduct={focusedReceiptProduct}
          onClearFocusedProduct={() => setFocusedReceiptProduct(null)}
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
        {onReviewProducts && <button type="button" className="workspace-outline stock-back-action" onClick={onReviewProducts}>{labels.backProducts}</button>}
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
  money,
  siteField,
  siteName,
  focusedProduct,
  onClearFocusedProduct,
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
  money: (value: number) => string
  siteField: ReactNode
  siteName?: string
  focusedProduct: { id: number; name: string } | null
  onClearFocusedProduct: () => void
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
  const { language } = useI18n()
  const labels = stockWorkspaceCopy[language]
  const [filterValue, setFilterValue] = useState("")
  const [sortKey, setSortKey] = useState<ReceiptSortKey>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [pagination, setPagination] = useState<{ page: number; rows: InventoryReceiptResponse[]; product: typeof focusedProduct }>()

  const visibleRows = useMemo(() => {
    const normalizedFilter = filterValue.trim().toLocaleLowerCase()
    const filteredRows = focusedProduct ? rows.filter(row => row.productId === focusedProduct.id) : normalizedFilter
      ? rows.filter((row) => row.productName.toLocaleLowerCase().includes(normalizedFilter))
      : rows

    return [...filteredRows].sort((left, right) => {
      const comparison = compareReceiptRows(left, right, sortKey)
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filterValue, focusedProduct, rows, sortDirection, sortKey])

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / RECEIPTS_PER_PAGE))
  const currentPage = pagination?.rows === rows && pagination.product === focusedProduct ? Math.min(pagination.page, pageCount) : 1
  const paginatedRows = visibleRows.slice(
    (currentPage - 1) * RECEIPTS_PER_PAGE,
    currentPage * RECEIPTS_PER_PAGE,
  )

  function handleSort(nextKey: ReceiptSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection("asc")
  }
  const columns = [[text.product, "productName"], [text.receivedQuantity, "receivedQuantity"],
    [text.remainingQuantity, "remainingQuantity"], [text.totalCost, "totalCostAmount"], [text.createdAt, "createdAt"],
    [text.updatedAt, "updatedAt"], [text.lastAction, "lastAction"]] as const

  return (
    <section className="stock-panel inventory-open-receipts">
      <div className="stock-panel-heading"><h2 id="active-receipts-heading">{text.activeReceipts}</h2>
        {siteName && <StockStatus active={false}>{siteName}</StockStatus>}</div>
      <div className="stock-field-pair">
      {siteField}
      <label className="inventory-receipt-filter">
        {text.filter}
        <input
          type="text"
          value={focusedProduct?.name ?? filterValue}
          onChange={(event) => { onClearFocusedProduct(); setFilterValue(event.target.value); setPagination(undefined) }}
          placeholder={text.productFilterPlaceholder}
        />
      </label>
      </div>
      {visibleRows.length > 0 && <label className="stock-mobile-sort stock-field">{labels.sortBy}
        <select aria-label={labels.sortBy} value={`${sortKey}:${sortDirection}`} onChange={event => {
          const [key, direction] = event.target.value.split(":") as [ReceiptSortKey, SortDirection]
          setSortKey(key); setSortDirection(direction)
        }}>
          {columns.map(([label, key]) => <optgroup key={key} label={label}>
            <option value={`${key}:asc`}>{label} · {labels.ascending}</option>
            <option value={`${key}:desc`}>{label} · {labels.descending}</option>
          </optgroup>)}
        </select>
      </label>}
      <div className="stock-receipt-list">
        {visibleRows.length === 0 ? <p className="stock-empty">{text.noActiveReceipts}</p> :
        <table className="stock-responsive-rows" role="table" aria-labelledby="active-receipts-heading">
          <thead role="rowgroup">
            <tr role="row">
              {columns.map(([label, key]) => <SortableHeader key={key} label={label} sortKey={key} activeKey={sortKey}
                direction={sortDirection} onSort={handleSort} />)}
              <th scope="col" aria-label={text.actions} />
            </tr>
          </thead>
          <tbody role="rowgroup">
            {paginatedRows.map((row) => (
                <tr key={row.id} role="row">
                  <th scope="row" role="rowheader">{row.productName}</th>
                  <ReceiptCell label={text.receivedQuantity}>{formatNumber(row.receivedQuantity)}</ReceiptCell>
                  <ReceiptCell label={text.remainingQuantity}><StockStatus active>{formatNumber(row.remainingQuantity)}</StockStatus></ReceiptCell>
                  <ReceiptCell label={text.totalCost}>{money(row.totalCostAmount)}</ReceiptCell>
                  <ReceiptCell label={text.createdAt}>{row.receivedAtInstant && row.receivedAtZoneId
                    ? formatReceiptDateTime(row.receivedAtInstant, locale, row.receivedAtZoneId)
                    : <>{formatReceiptDateTime(row.createdAt, locale)} <small>({text.receiptZoneUnverified})</small></>}</ReceiptCell>
                  <ReceiptCell label={text.updatedAt}>{row.updatedAt && row.updatedAt !== row.createdAt
                    ? <>{formatReceiptDateTime(row.updatedAt, locale)} <small>({text.receiptZoneUnverified})</small></> : "-"}</ReceiptCell>
                  <ReceiptCell label={text.lastAction}>{formatReceiptAction(row.lastAction, text)}</ReceiptCell>
                  <td role="cell" className="stock-table-actions">
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
                        <button type="button" className="workspace-text-action" onClick={() => onStartWithdrawal(row)}>
                          {text.withdraw}
                        </button>
                        <button
                          type="button"
                          className="workspace-outline"
                          onClick={() => onStartEdit(row)}
                        >
                          {text.edit}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>}
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
          onPageChange={page => setPagination({ page, rows, product: focusedProduct })}
        />
      )}
      <p className="stock-muted">{labels.activeHelp}</p>
    </section>
  )
}

function ReceiptCell({ label, children }: { label: string; children: ReactNode }) {
  return <td role="cell"><span className="stock-cell-label" aria-hidden="true">{label}</span><span>{children}</span></td>
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

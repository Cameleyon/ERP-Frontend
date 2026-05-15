import { useEffect, useMemo, useState } from "react"
import { getProductByCode, type ProductLookupResponse } from "../api/productApi"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import {
  createInventoryAdjustment,
  getRecentInventoryWithdrawals,
  type InventoryAdjustmentResponse,
} from "../api/inventoryApi"
import {
  createInventoryReceipt,
  getRecentInventoryReceipts,
  type InventoryReceiptResponse,
} from "../api/inventoryReceiptApi"
import { getCostRubrics, type CompanyCostRubricResponse } from "../api/costRubricApi"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import { useAuth } from "../auth/AuthContext"
import { useI18n } from "../i18n/I18nContext"
import { messages } from "../i18n/messages"
import { getLocalizedCostRubricName } from "../utils/costRubrics"
import { formatCurrency, formatDateTime, formatNumber } from "../utils/format"
import { getDefaultLocationId } from "../utils/locations"

type InventoryAction = "RECEIPT" | "WITHDRAWAL"
type CostAmountMap = Record<number, string>
type InventoryPageCopy = (typeof messages)[keyof typeof messages]["inventoryPage"]

export default function InventoryPage() {
  useAuth()
  const { copy, language } = useI18n()
  const text = copy.inventoryPage

  const [action, setAction] = useState<InventoryAction>("RECEIPT")
  const [productCode, setProductCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [locations, setLocations] = useState<CompanyLocationResponse[]>([])
  const [locationId, setLocationId] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupResponse | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [rubrics, setRubrics] = useState<CompanyCostRubricResponse[]>([])
  const [rubricsLoading, setRubricsLoading] = useState(true)
  const [costAmounts, setCostAmounts] = useState<CostAmountMap>({})
  const [lastWithdrawal, setLastWithdrawal] = useState<InventoryAdjustmentResponse | null>(null)
  const [lastReceipt, setLastReceipt] = useState<InventoryReceiptResponse | null>(null)
  const [recentWithdrawals, setRecentWithdrawals] = useState<InventoryAdjustmentResponse[]>([])
  const [recentReceipts, setRecentReceipts] = useState<InventoryReceiptResponse[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [locationData, rubricData] = await Promise.all([
          getAccessibleCompanyLocations(),
          getCostRubrics(),
        ])
        const activeLocations = Array.isArray(locationData) ? locationData.filter((location) => location.active) : []
        const activeRubrics = Array.isArray(rubricData) ? rubricData.filter((rubric) => rubric.active) : []
        const defaultLocationId = getDefaultLocationId(activeLocations)

        setLocations(activeLocations)
        setLocationId(defaultLocationId)
        setRubrics(activeRubrics)
        setCostAmounts(createInitialCostAmounts(activeRubrics))

        if (defaultLocationId) {
          await loadHistory(Number(defaultLocationId))
        }
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : text.historyLoadError)
      } finally {
        setRubricsLoading(false)
      }
    }

    void loadInitialData()
  }, [])

  async function loadHistory(nextLocationId: number) {
    const [withdrawals, receipts] = await Promise.all([
      getRecentInventoryWithdrawals(nextLocationId),
      getRecentInventoryReceipts(nextLocationId),
    ])
    setRecentWithdrawals(withdrawals)
    setRecentReceipts(receipts)
  }

  async function handleLocationChange(nextLocationId: string) {
    setLocationId(nextLocationId)
    setSelectedProduct(null)
    setLastWithdrawal(null)
    setLastReceipt(null)

    if (!nextLocationId) return

    try {
      setError("")
      await loadHistory(Number(nextLocationId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.historyLoadError)
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
      const product = await getProductByCode(productCode.trim(), locationId ? Number(locationId) : null)
      setSelectedProduct(product)
      setLastWithdrawal(null)
      setLastReceipt(null)
    } catch (err) {
      console.error(err)
      setSelectedProduct(null)
      setError(err instanceof Error ? err.message : text.lookupError)
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleWithdrawal() {
    if (!selectedProduct) {
      setError(text.noProduct)
      return
    }
    if (quantity <= 0) {
      setError(text.quantityPositive)
      return
    }

    try {
      setSaveLoading(true)
      setError("")
      setSuccess("")
      const response = await createInventoryAdjustment({
        locationId: locationId ? Number(locationId) : null,
        productId: selectedProduct.id,
        adjustmentType: "REMOVE",
        quantity,
        reason,
      })

      setLastWithdrawal(response)
      setSuccess(text.withdrawalSuccess(response.productName))
      setSelectedProduct({ ...selectedProduct, currentStock: response.stockAfter })
      setQuantity(1)
      setReason("")
      if (locationId) await loadHistory(Number(locationId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.withdrawalError)
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleReceipt() {
    if (!selectedProduct) {
      setError(text.noProduct)
      return
    }
    if (quantity <= 0) {
      setError(text.quantityPositive)
      return
    }
    if (rubrics.length === 0) {
      setError(text.noRubrics)
      return
    }

    try {
      setSaveLoading(true)
      setError("")
      setSuccess("")
      const response = await createInventoryReceipt({
        locationId: locationId ? Number(locationId) : null,
        productId: selectedProduct.id,
        receivedQuantity: quantity,
        notes,
        costLines: rubrics.map((rubric) => ({
          companyCostRubricId: rubric.id,
          amount: Number(costAmounts[rubric.id] ?? "0"),
        })),
      })

      setLastReceipt(response)
      setSuccess(text.receiptSuccess(response.id))
      setSelectedProduct({ ...selectedProduct, currentStock: selectedProduct.currentStock + response.receivedQuantity })
      setQuantity(1)
      setNotes("")
      setCostAmounts(createInitialCostAmounts(rubrics))
      if (locationId) await loadHistory(Number(locationId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.receiptError)
    } finally {
      setSaveLoading(false)
    }
  }

  function handleDetectedBarcode(value: string) {
    setProductCode(value)
    setShowScanner(false)
    setError("")
    setSuccess("")
  }

  function updateCostAmount(rubricId: number, value: string) {
    setCostAmounts((prev) => ({ ...prev, [rubricId]: value }))
  }

  const totalCost = useMemo(
    () =>
      rubrics.reduce((sum, rubric) => {
        const value = Number(costAmounts[rubric.id] ?? "0")
        return sum + (Number.isFinite(value) ? value : 0)
      }, 0),
    [rubrics, costAmounts],
  )
  const unitCost = quantity > 0 ? totalCost / quantity : 0
  const unitLabel = selectedProduct?.unitCode ? ` ${selectedProduct.unitCode}` : ""

  return (
    <div>
      <div className="page-title-row">
        <h1>{text.title}</h1>

        {locations.length > 0 && (
          <label className="page-title-site-filter">
            <select value={locationId} onChange={(event) => void handleLocationChange(event.target.value)}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <h3>{text.actionTitle}</h3>
        <div className="sale-payment-choice-buttons">
          <button
            type="button"
            className={`secondary-button ${action === "RECEIPT" ? "active-choice" : ""}`}
            onClick={() => setAction("RECEIPT")}
          >
            {text.receiptAction}
          </button>
          <button
            type="button"
            className={`secondary-button ${action === "WITHDRAWAL" ? "active-choice" : ""}`}
            onClick={() => setAction("WITHDRAWAL")}
          >
            {text.withdrawalAction}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>{text.lookupTitle}</h3>
        <div className="card nested-card scanner-toggle-card">
          <div className="scanner-header">
            <h3>{text.scannerTitle}</h3>
            <button type="button" className="secondary-button" onClick={() => setShowScanner((prev) => !prev)}>
              {showScanner ? text.closeScanner : text.openScanner}
            </button>
          </div>
          {showScanner && (
            <div className="scanner-container">
              <BarcodeScanner onDetected={handleDetectedBarcode} />
            </div>
          )}
        </div>
        <div className="sale-form-row">
          <input
            type="text"
            placeholder={text.barcodePlaceholder}
            value={productCode}
            onChange={(event) => setProductCode(event.target.value)}
          />
          <button onClick={handleLookup} disabled={lookupLoading}>
            {lookupLoading ? text.lookupLoading : text.lookup}
          </button>
        </div>
      </div>

      {selectedProduct && (
        <div className="card">
          <h3>{text.selectedProduct}</h3>
          <p><strong>{text.name}:</strong> {selectedProduct.name}</p>
          <p><strong>SKU:</strong> {selectedProduct.sku}</p>
          <p><strong>{text.unit}:</strong> {selectedProduct.unitName || selectedProduct.unitCode || "-"}</p>
          <p><strong>{text.currentStock}:</strong> {formatNumber(selectedProduct.currentStock)}{unitLabel}</p>
          <p><strong>{text.minimumStock}:</strong> {formatNumber(selectedProduct.minimumStock)}{unitLabel}</p>

          <div className="inventory-form-grid">
            <label>
              {action === "RECEIPT" ? text.receivedQuantity : text.quantity}{unitLabel ? ` (${selectedProduct.unitCode})` : ""}
              <input
                type="number"
                min={0.0001}
                step="0.0001"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </label>

            {action === "WITHDRAWAL" ? (
              <label className="full-width">
                {text.reason}
                <input
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={text.reasonPlaceholder}
                />
              </label>
            ) : (
              <label className="full-width">
                {text.notes}
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={text.notesPlaceholder}
                />
              </label>
            )}
          </div>

          {action === "RECEIPT" && (
            <div className="card nested-card">
              <h3>{text.costRubrics}</h3>
              {rubricsLoading ? (
                <p>{text.rubricsLoading}</p>
              ) : rubrics.length === 0 ? (
                <p>{text.rubricsEmpty}</p>
              ) : (
                <div className="inventory-form-grid">
                  {rubrics.map((rubric) => (
                    <label key={rubric.id}>
                      {getLocalizedCostRubricName(rubric.code, rubric.name, language)}
                      <input
                        type="number"
                        min={0}
                        step="0.0001"
                        value={costAmounts[rubric.id] ?? "0"}
                        onChange={(event) => updateCostAmount(rubric.id, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              )}
              <div className="receipt-summary">
                <p><strong>{text.totalCost}:</strong> {formatCurrency(totalCost)}</p>
                <p><strong>{text.unitCost}:</strong> {formatCurrency(unitCost)}</p>
              </div>
            </div>
          )}

          <button onClick={action === "RECEIPT" ? handleReceipt : handleWithdrawal} disabled={saveLoading}>
            {saveLoading ? text.submitting : action === "RECEIPT" ? text.createReceipt : text.createWithdrawal}
          </button>
        </div>
      )}

      {action === "WITHDRAWAL" && lastWithdrawal && <WithdrawalDetail row={lastWithdrawal} text={text} />}
      {action === "RECEIPT" && lastReceipt && <ReceiptDetail row={lastReceipt} text={text} unitLabel={unitLabel} />}

      {action === "WITHDRAWAL" ? (
        <WithdrawalHistory rows={recentWithdrawals} text={text} />
      ) : (
        <ReceiptHistory rows={recentReceipts} text={text} />
      )}
    </div>
  )
}

function createInitialCostAmounts(rubrics: CompanyCostRubricResponse[]) {
  const initial: CostAmountMap = {}
  rubrics.forEach((rubric) => {
    initial[rubric.id] = "0"
  })
  return initial
}

function WithdrawalDetail({
  row,
  text,
}: {
  row: InventoryAdjustmentResponse
  text: InventoryPageCopy
}) {
  return (
    <div className="card">
      <h3>{text.lastWithdrawal}</h3>
      <p><strong>{text.product}:</strong> {row.productName}</p>
      <p><strong>{text.quantity}:</strong> {formatNumber(row.quantity)}</p>
      <p><strong>{text.totalCost}:</strong> {formatCurrency(row.totalCostAmount ?? 0)}</p>
      <p><strong>{text.reason}:</strong> {row.reason || "-"}</p>
      <p><strong>{text.createdAt}:</strong> {formatDateTime(row.createdAt)}</p>
    </div>
  )
}

function ReceiptDetail({
  row,
  text,
  unitLabel,
}: {
  row: InventoryReceiptResponse
  text: InventoryPageCopy
  unitLabel: string
}) {
  return (
    <div className="card">
      <h3>{text.lastReceipt}</h3>
      <p><strong>{text.product}:</strong> {row.productName}</p>
      <p><strong>{text.receivedQuantity}:</strong> {formatNumber(row.receivedQuantity)}{unitLabel}</p>
      <p><strong>{text.remainingQuantity}:</strong> {formatNumber(row.remainingQuantity)}{unitLabel}</p>
      <p><strong>{text.totalCost}:</strong> {formatCurrency(row.totalCostAmount)}</p>
      <p><strong>{text.receivedAt}:</strong> {formatDateTime(row.receivedAt)}</p>
    </div>
  )
}

function WithdrawalHistory({
  rows,
  text,
}: {
  rows: InventoryAdjustmentResponse[]
  text: InventoryPageCopy
}) {
  return (
    <div className="card">
      <h3>{text.recentWithdrawals}</h3>
      <table>
        <thead>
          <tr>
            <th>{text.product}</th>
            <th>{text.quantity}</th>
            <th>{text.totalCost}</th>
            <th>{text.reason}</th>
            <th>{text.createdAt}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5}>{text.noRecentWithdrawals}</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.productName}</td>
                <td>{formatNumber(row.quantity)}</td>
                <td>{formatCurrency(row.totalCostAmount ?? 0)}</td>
                <td>{row.reason || "-"}</td>
                <td>{formatDateTime(row.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReceiptHistory({
  rows,
  text,
}: {
  rows: InventoryReceiptResponse[]
  text: InventoryPageCopy
}) {
  return (
    <div className="card">
      <h3>{text.recentReceipts}</h3>
      <table>
        <thead>
          <tr>
            <th>{text.product}</th>
            <th>{text.receivedQuantity}</th>
            <th>{text.remainingQuantity}</th>
            <th>{text.totalCost}</th>
            <th>{text.receivedAt}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5}>{text.noRecentReceipts}</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.productName}</td>
                <td>{formatNumber(row.receivedQuantity)}</td>
                <td>{formatNumber(row.remainingQuantity)}</td>
                <td>{formatCurrency(row.totalCostAmount)}</td>
                <td>{formatDateTime(row.receivedAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

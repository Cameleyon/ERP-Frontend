import { useEffect, useMemo, useState } from "react"
import { getProductByCode, type ProductLookupResponse } from "../api/productApi"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import {
  createInventoryReceipt,
  createInventoryReceiptWithdrawal,
  getActiveInventoryReceipts,
  updateInventoryReceiptQuantity,
  type InventoryReceiptResponse,
} from "../api/inventoryReceiptApi"
import { getCostRubrics, type CompanyCostRubricResponse } from "../api/costRubricApi"
import TablePagination from "../components/common/TablePagination"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import { useAuth } from "../auth/AuthContext"
import { useI18n } from "../i18n/I18nContext"
import { messages } from "../i18n/messages"
import { getLocalizedCostRubricName } from "../utils/costRubrics"
import { formatCurrency, formatDateTime, formatNumber } from "../utils/format"
import { getDefaultLocationId } from "../utils/locations"

type CostAmountMap = Record<number, string>
type InventoryPageCopy = (typeof messages)[keyof typeof messages]["inventoryPage"]
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

export default function InventoryPage() {
  useAuth()
  const { copy, language } = useI18n()
  const text = copy.inventoryPage

  const [productCode, setProductCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [locations, setLocations] = useState<CompanyLocationResponse[]>([])
  const [locationId, setLocationId] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupResponse | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const [rubrics, setRubrics] = useState<CompanyCostRubricResponse[]>([])
  const [rubricsLoading, setRubricsLoading] = useState(true)
  const [costAmounts, setCostAmounts] = useState<CostAmountMap>({})
  const [activeReceipts, setActiveReceipts] = useState<InventoryReceiptResponse[]>([])
  const [withdrawalReceiptId, setWithdrawalReceiptId] = useState<number | null>(null)
  const [withdrawalQuantity, setWithdrawalQuantity] = useState(1)
  const [withdrawalReason, setWithdrawalReason] = useState("")
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null)
  const [editedReceiptQuantity, setEditedReceiptQuantity] = useState(1)
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
          await loadOpenReceipts(Number(defaultLocationId))
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

  async function loadOpenReceipts(nextLocationId: number) {
    const openReceipts = await getActiveInventoryReceipts(nextLocationId)
    setActiveReceipts(openReceipts)
  }

  async function handleLocationChange(nextLocationId: string) {
    setLocationId(nextLocationId)
    setSelectedProduct(null)
    setWithdrawalReceiptId(null)
    setEditingReceiptId(null)

    if (!nextLocationId) return

    try {
      setError("")
      await loadOpenReceipts(Number(nextLocationId))
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
    } catch (err) {
      console.error(err)
      setSelectedProduct(null)
      setError(err instanceof Error ? err.message : text.lookupError)
    } finally {
      setLookupLoading(false)
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

      setSuccess(text.receiptSuccess(response.id))
      setSelectedProduct({ ...selectedProduct, currentStock: selectedProduct.currentStock + response.receivedQuantity })
      setQuantity(1)
      setNotes("")
      setCostAmounts(createInitialCostAmounts(rubrics))
      if (locationId) await loadOpenReceipts(Number(locationId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.receiptError)
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleReceiptWithdrawal(receipt: InventoryReceiptResponse) {
    if (withdrawalQuantity <= 0) {
      setError(text.quantityPositive)
      return
    }

    try {
      setSaveLoading(true)
      setError("")
      setSuccess("")
      const response = await createInventoryReceiptWithdrawal(receipt.id, {
        quantity: withdrawalQuantity,
        reason: withdrawalReason,
      })

      setSuccess(text.withdrawalSuccess(response.productName))
      setWithdrawalReceiptId(null)
      setWithdrawalQuantity(1)
      setWithdrawalReason("")
      if (locationId) await loadOpenReceipts(Number(locationId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.withdrawalError)
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleReceiptQuantityUpdate(receipt: InventoryReceiptResponse) {
    if (editedReceiptQuantity <= 0) {
      setError(text.quantityPositive)
      return
    }

    try {
      setSaveLoading(true)
      setError("")
      setSuccess("")
      const response = await updateInventoryReceiptQuantity(receipt.id, {
        receivedQuantity: editedReceiptQuantity,
      })

      setSuccess(text.receiptUpdated(response.id))
      setEditingReceiptId(null)
      if (locationId) await loadOpenReceipts(Number(locationId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.receiptUpdateError)
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

  function startWithdrawal(receipt: InventoryReceiptResponse) {
    setWithdrawalReceiptId(receipt.id)
    setWithdrawalQuantity(1)
    setWithdrawalReason("")
    setEditingReceiptId(null)
  }

  function startEdit(receipt: InventoryReceiptResponse) {
    setEditingReceiptId(receipt.id)
    setEditedReceiptQuantity(receipt.receivedQuantity)
    setWithdrawalReceiptId(null)
  }

  function cancelReceiptCreation() {
    setSelectedProduct(null)
    setProductCode("")
    setQuantity(1)
    setNotes("")
    setCostAmounts(createInitialCostAmounts(rubrics))
    setError("")
    setSuccess("")
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
        <h3>{text.inventoryForm}</h3>
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

        {selectedProduct && (
          <>
          <h3>{text.createReceipt}</h3>
          <p><strong>{text.name}:</strong> {selectedProduct.name}</p>
          <p><strong>SKU:</strong> {selectedProduct.sku}</p>
          <p><strong>{text.unit}:</strong> {selectedProduct.unitName || selectedProduct.unitCode || "-"}</p>
          <p><strong>{text.currentStock}:</strong> {formatNumber(selectedProduct.currentStock)}{unitLabel}</p>
          <p><strong>{text.minimumStock}:</strong> {formatNumber(selectedProduct.minimumStock)}{unitLabel}</p>

          <div className="inventory-form-grid">
            <label>
              {text.receivedQuantity}{unitLabel ? ` (${selectedProduct.unitCode})` : ""}
              <input
                type="number"
                min={0.0001}
                step="0.0001"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
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

          <div className="form-actions">
            <button onClick={handleReceipt} disabled={saveLoading}>
              {saveLoading ? text.submitting : text.createReceipt}
            </button>
            <button type="button" className="secondary-button" onClick={cancelReceiptCreation}>
              {text.cancel}
            </button>
          </div>
          </>
        )}

        <ActiveReceiptTable
          rows={activeReceipts}
          text={text}
          withdrawalReceiptId={withdrawalReceiptId}
          withdrawalQuantity={withdrawalQuantity}
          withdrawalReason={withdrawalReason}
          editingReceiptId={editingReceiptId}
          editedReceiptQuantity={editedReceiptQuantity}
          saveLoading={saveLoading}
          onStartWithdrawal={startWithdrawal}
          onCancelWithdrawal={() => setWithdrawalReceiptId(null)}
          onWithdrawalQuantityChange={setWithdrawalQuantity}
          onWithdrawalReasonChange={setWithdrawalReason}
          onSubmitWithdrawal={handleReceiptWithdrawal}
          onStartEdit={startEdit}
          onCancelEdit={() => setEditingReceiptId(null)}
          onEditedQuantityChange={setEditedReceiptQuantity}
          onSubmitEdit={handleReceiptQuantityUpdate}
        />
      </div>

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

function ActiveReceiptTable({
  rows,
  text,
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
  rows: InventoryReceiptResponse[]
  text: InventoryPageCopy
  withdrawalReceiptId: number | null
  withdrawalQuantity: number
  withdrawalReason: string
  editingReceiptId: number | null
  editedReceiptQuantity: number
  saveLoading: boolean
  onStartWithdrawal: (receipt: InventoryReceiptResponse) => void
  onCancelWithdrawal: () => void
  onWithdrawalQuantityChange: (quantity: number) => void
  onWithdrawalReasonChange: (reason: string) => void
  onSubmitWithdrawal: (receipt: InventoryReceiptResponse) => Promise<void>
  onStartEdit: (receipt: InventoryReceiptResponse) => void
  onCancelEdit: () => void
  onEditedQuantityChange: (quantity: number) => void
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
      <h3>{text.activeReceipts}</h3>
      <label className="inventory-receipt-filter">
        {text.filter}
        <input
          type="text"
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          placeholder={text.productFilterPlaceholder}
        />
      </label>
      <table>
        <thead>
          <tr>
            <SortableHeader label={text.product} sortKey="productName" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label={text.receivedQuantity} sortKey="receivedQuantity" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label={text.remainingQuantity} sortKey="remainingQuantity" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label={text.totalCost} sortKey="totalCostAmount" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label={text.createdAt} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label={text.updatedAt} sortKey="updatedAt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label={text.lastAction} sortKey="lastAction" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            <th aria-label={text.actions} />
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
                <td>{formatDateTime(row.createdAt)}</td>
                <td>{row.updatedAt ? formatDateTime(row.updatedAt) : "-"}</td>
                <td>{formatReceiptAction(row.lastAction, text)}</td>
                <td>
                  {withdrawalReceiptId === row.id ? (
                    <div className="inventory-inline-actions">
                      <input
                        type="number"
                        min={0.0001}
                        step="0.0001"
                        value={withdrawalQuantity}
                        onChange={(event) => onWithdrawalQuantityChange(Number(event.target.value))}
                      />
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
                      <input
                        type="number"
                        min={0.0001}
                        step="0.0001"
                        value={editedReceiptQuantity}
                        onChange={(event) => onEditedQuantityChange(Number(event.target.value))}
                      />
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
}: {
  label: string
  sortKey: ReceiptSortKey
  activeKey: ReceiptSortKey
  direction: SortDirection
  onSort: (sortKey: ReceiptSortKey) => void
}) {
  return (
    <th>
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
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    case "updatedAt":
      return new Date(left.updatedAt ?? left.createdAt).getTime() - new Date(right.updatedAt ?? right.createdAt).getTime()
    case "lastAction":
      return left.lastAction.localeCompare(right.lastAction)
    case "productName":
    default:
      return left.productName.localeCompare(right.productName)
  }
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

import { useState } from "react"
import { getProductByCode, type ProductLookupResponse } from "../api/productApi"
import {
  createInventoryAdjustment,
  type InventoryAdjustmentResponse,
} from "../api/inventoryApi"
import BarcodeScanner from "../components/sales/BarcodeScanner"

import { useAuth } from "../auth/AuthContext"
import { useI18n } from "../i18n/I18nContext"
import { formatDateTime, formatNumber } from "../utils/format"

export default function InventoryPage() {
  useAuth()
  const { language } = useI18n()

  const [productCode, setProductCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [adjustmentLoading, setAdjustmentLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<ProductLookupResponse | null>(null)
  const [adjustmentType, setAdjustmentType] = useState("ADD")
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState("")
  const [lastAdjustment, setLastAdjustment] = useState<InventoryAdjustmentResponse | null>(null)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const text = language === "fr"
    ? {
        title: "Inventaire",
        barcodeRequired: "Le code-barres ou SKU est requis",
        lookupError: "Échec de la recherche",
        noProduct: "Aucun produit sélectionné",
        quantityPositive: "La quantité doit être supérieure à zéro",
        adjustSuccess: (name: string) => `L'inventaire a été ajusté avec succès pour ${name}`,
        adjustError: "Échec de l'ajustement d'inventaire",
        lookupTitle: "Rechercher un produit",
        scannerTitle: "Scanner le code-barres",
        closeScanner: "Fermer le scanner",
        openScanner: "Ouvrir le scanner",
        barcodePlaceholder: "Saisir le code-barres ou le SKU",
        lookupLoading: "Recherche...",
        lookup: "Rechercher le produit",
        selectedProduct: "Produit sélectionné",
        name: "Nom",
        unit: "Unité",
        currentStock: "Stock actuel",
        minimumStock: "Stock minimum",
        adjustmentType: "Type d'ajustement",
        quantity: "Quantité",
        reason: "Raison",
        reasonPlaceholder: "Raison de l'ajustement",
        submitting: "Envoi...",
        submit: "Valider l'ajustement",
        lastAdjustment: "Dernier ajustement",
        product: "Produit",
        type: "Type",
        stockAfter: "Stock après",
        createdAt: "Créé le",
        add: "AJOUT",
        remove: "RETRAIT",
        correction: "CORRECTION",
      }
    : {
        title: "Inventory",
        barcodeRequired: "Barcode or SKU is required",
        lookupError: "Lookup failed",
        noProduct: "No product selected",
        quantityPositive: "Quantity must be greater than zero",
        adjustSuccess: (name: string) => `Inventory adjusted successfully for ${name}`,
        adjustError: "Failed to adjust inventory",
        lookupTitle: "Find a product",
        scannerTitle: "Scan barcode",
        closeScanner: "Close scanner",
        openScanner: "Open scanner",
        barcodePlaceholder: "Enter the barcode or SKU",
        lookupLoading: "Looking up...",
        lookup: "Find product",
        selectedProduct: "Selected product",
        name: "Name",
        unit: "Unit",
        currentStock: "Current stock",
        minimumStock: "Minimum stock",
        adjustmentType: "Adjustment type",
        quantity: "Quantity",
        reason: "Reason",
        reasonPlaceholder: "Reason for the adjustment",
        submitting: "Submitting...",
        submit: "Apply adjustment",
        lastAdjustment: "Last adjustment",
        product: "Product",
        type: "Type",
        stockAfter: "Stock after",
        createdAt: "Created at",
        add: "ADD",
        remove: "REMOVE",
        correction: "CORRECTION",
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
      setLastAdjustment(null)
    } catch (err) {
      console.error(err)
      setSelectedProduct(null)
      setError(err instanceof Error ? err.message : text.lookupError)
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleAdjust() {
    if (!selectedProduct) {
      setError(text.noProduct)
      return
    }

    if (quantity <= 0) {
      setError(text.quantityPositive)
      return
    }

    try {
      setAdjustmentLoading(true)
      setError("")
      setSuccess("")
      setLastAdjustment(null)

      const response = await createInventoryAdjustment({
        productId: selectedProduct.id,
        adjustmentType,
        quantity,
        reason,
      })

      setLastAdjustment(response)
      setSuccess(text.adjustSuccess(response.productName))

      setSelectedProduct({
        ...selectedProduct,
        currentStock: response.stockAfter,
      })

      setQuantity(1)
      setReason("")
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.adjustError)
    } finally {
      setAdjustmentLoading(false)
    }
  }

  function handleDetectedBarcode(value: string) {
    setProductCode(value)
    setShowScanner(false)
    setError("")
    setSuccess("")
  }

  const unitLabel = selectedProduct?.unitCode ? ` ${selectedProduct.unitCode}` : ""

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <h3>{text.lookupTitle}</h3>
        <div className="card nested-card scanner-toggle-card">
          <div className="scanner-header">
            <h3>{text.scannerTitle}</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowScanner((prev) => !prev)}
            >
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
            onChange={(e) => setProductCode(e.target.value)}
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
          <p><strong>Code-barres:</strong> {selectedProduct.barcode || "-"}</p>
          <p>
            <strong>{text.unit}:</strong> {selectedProduct.unitName || selectedProduct.unitCode || "-"}
          </p>
          <p>
            <strong>{text.currentStock}:</strong> {formatNumber(selectedProduct.currentStock)}{unitLabel}
          </p>
          <p>
            <strong>{text.minimumStock}:</strong> {formatNumber(selectedProduct.minimumStock)}{unitLabel}
          </p>

          <div className="inventory-form-grid">
            <label>
              {text.adjustmentType}
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                <option value="ADD">{text.add}</option>
                <option value="REMOVE">{text.remove}</option>
                <option value="CORRECTION">{text.correction}</option>
              </select>
            </label>

            <label>
              {text.quantity}{unitLabel ? ` (${selectedProduct.unitCode})` : ""}
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>

            <label className="full-width">
              {text.reason}
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={text.reasonPlaceholder}
              />
            </label>
          </div>

          <button onClick={handleAdjust} disabled={adjustmentLoading}>
            {adjustmentLoading ? text.submitting : text.submit}
          </button>
        </div>
      )}

      {lastAdjustment && (
        <div className="card">
          <h3>{text.lastAdjustment}</h3>
          <p><strong>{text.product}:</strong> {lastAdjustment.productName}</p>
          <p><strong>{text.type}:</strong> {lastAdjustment.adjustmentType}</p>
          <p>
            <strong>{text.quantity}:</strong> {formatNumber(lastAdjustment.quantity)}{unitLabel}
          </p>
          <p>
            <strong>{text.stockAfter}:</strong> {formatNumber(lastAdjustment.stockAfter)}{unitLabel}
          </p>
          <p><strong>{text.reason}:</strong> {lastAdjustment.reason || "-"}</p>
          <p><strong>{text.createdAt}:</strong> {formatDateTime(lastAdjustment.createdAt)}</p>
        </div>
      )}
    </div>
  )
}

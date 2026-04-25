import { useEffect, useMemo, useState } from "react"
import { getProductByCode, type ProductLookupResponse } from "../api/productApi"
import {
  getCostRubrics,
  type CompanyCostRubricResponse,
} from "../api/costRubricApi"
import {
  createInventoryReceipt,
  type InventoryReceiptResponse,
} from "../api/inventoryReceiptApi"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import { useI18n } from "../i18n/I18nContext"
import { getLocalizedCostRubricName } from "../utils/costRubrics"
import { formatCurrency, formatDateTime, formatNumber } from "../utils/format"

type CostAmountMap = Record<number, string>

export default function InventoryReceiptPage() {
  const { language } = useI18n()
  const [productCode, setProductCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [rubricsLoading, setRubricsLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<ProductLookupResponse | null>(null)
  const [rubrics, setRubrics] = useState<CompanyCostRubricResponse[]>([])

  const [receivedQuantity, setReceivedQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const [costAmounts, setCostAmounts] = useState<CostAmountMap>({})
  const [lastReceipt, setLastReceipt] = useState<InventoryReceiptResponse | null>(null)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const text = language === "fr"
    ? {
        loadRubricsError: "Échec du chargement des rubriques de coût",
        barcodeRequired: "Le code-barres ou SKU est requis",
        lookupError: "Échec de la recherche",
        noProduct: "Aucun produit sélectionné",
        quantityPositive: "La quantité reçue doit être supérieure à zéro",
        noRubrics: "Aucune rubrique de coût active trouvée pour cette entreprise",
        createSuccess: (id: number) => `La réception d'inventaire ${id} a été créée avec succès`,
        createError: "Échec de la création de la réception d'inventaire",
        title: "Réception d'inventaire",
        lookupTitle: "Rechercher un produit",
        scannerTitle: "Scanner le code-barres",
        closeScanner: "Fermer le scanner",
        openScanner: "Ouvrir le scanner",
        barcodePlaceholder: "Saisir le code-barres ou le SKU",
        lookupLoading: "Recherche...",
        lookup: "Rechercher le produit",
        selectedProduct: "Produit sélectionné",
        name: "Nom",
        currentStock: "Stock actuel",
        minimumStock: "Stock minimum",
        receivedQuantity: "Quantité reçue",
        notes: "Notes",
        notesPlaceholder: "Livraison fournisseur, solde d'ouverture, etc.",
        costRubrics: "Rubriques de coût",
        rubricsLoading: "Chargement des rubriques de coût...",
        rubricsEmpty: "Aucune rubrique de coût active n'est configurée pour cette entreprise.",
        totalCost: "Coût total",
        unitCost: "Coût unitaire",
        creating: "Création...",
        create: "Créer la réception d'inventaire",
        lastReceipt: "Dernière réception d'inventaire",
        receiptId: "ID réception",
        product: "Produit",
        remainingQuantity: "Quantité restante",
        receivedAt: "Reçu le",
      }
    : {
        loadRubricsError: "Failed to load cost rubrics",
        barcodeRequired: "Barcode or SKU is required",
        lookupError: "Lookup failed",
        noProduct: "No product selected",
        quantityPositive: "Received quantity must be greater than zero",
        noRubrics: "No active cost rubrics found for this company",
        createSuccess: (id: number) => `Inventory receipt ${id} was created successfully`,
        createError: "Failed to create inventory receipt",
        title: "Inventory receipt",
        lookupTitle: "Find a product",
        scannerTitle: "Scan barcode",
        closeScanner: "Close scanner",
        openScanner: "Open scanner",
        barcodePlaceholder: "Enter the barcode or SKU",
        lookupLoading: "Looking up...",
        lookup: "Find product",
        selectedProduct: "Selected product",
        name: "Name",
        currentStock: "Current stock",
        minimumStock: "Minimum stock",
        receivedQuantity: "Received quantity",
        notes: "Notes",
        notesPlaceholder: "Supplier delivery, opening balance, etc.",
        costRubrics: "Cost rubrics",
        rubricsLoading: "Loading cost rubrics...",
        rubricsEmpty: "No active cost rubrics are configured for this company.",
        totalCost: "Total cost",
        unitCost: "Unit cost",
        creating: "Creating...",
        create: "Create inventory receipt",
        lastReceipt: "Last inventory receipt",
        receiptId: "Receipt ID",
        product: "Product",
        remainingQuantity: "Remaining quantity",
        receivedAt: "Received at",
      }

  useEffect(() => {
    async function loadRubrics() {
      try {
        setRubricsLoading(true)
        const data = await getCostRubrics()
        setRubrics(data)

        const initial: CostAmountMap = {}
        data.forEach((rubric) => {
          initial[rubric.id] = "0"
        })
        setCostAmounts(initial)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : text.loadRubricsError)
      } finally {
        setRubricsLoading(false)
      }
    }

    loadRubrics()
  }, [])

  const totalCost = useMemo(() => {
    return rubrics.reduce((sum, rubric) => {
      const value = Number(costAmounts[rubric.id] ?? "0")
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)
  }, [rubrics, costAmounts])

  const unitCost = useMemo(() => {
    if (receivedQuantity <= 0) return 0
    return totalCost / receivedQuantity
  }, [totalCost, receivedQuantity])

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
      setLastReceipt(null)
    } catch (err) {
      console.error(err)
      setSelectedProduct(null)
      setError(err instanceof Error ? err.message : text.lookupError)
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleCreateReceipt() {
    if (!selectedProduct) {
      setError(text.noProduct)
      return
    }

    if (receivedQuantity <= 0) {
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
      setLastReceipt(null)

      const response = await createInventoryReceipt({
        productId: selectedProduct.id,
        receivedQuantity,
        notes,
        costLines: rubrics.map((rubric) => ({
          companyCostRubricId: rubric.id,
          amount: Number(costAmounts[rubric.id] ?? "0"),
        })),
      })

      setLastReceipt(response)
      setSuccess(text.createSuccess(response.id))

      setSelectedProduct((prev) =>
        prev
          ? {
              ...prev,
              currentStock: response.remainingQuantity + (prev.currentStock - response.receivedQuantity),
            }
          : prev,
      )

      setProductCode("")
      setReceivedQuantity(1)
      setNotes("")

      const reset: CostAmountMap = {}
      rubrics.forEach((rubric) => {
        reset[rubric.id] = "0"
      })
      setCostAmounts(reset)

      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.createError)
    } finally {
      setSaveLoading(false)
    }
  }

  function updateCostAmount(rubricId: number, value: string) {
    setCostAmounts((prev) => ({
      ...prev,
      [rubricId]: value,
    }))
  }

  function handleDetectedBarcode(value: string) {
    setProductCode(value)
    setShowScanner(false)
    setError("")
    setSuccess("")
  }

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
          <p>
            <strong>{text.currentStock}:</strong> {formatNumber(selectedProduct.currentStock)}
            {selectedProduct.unitCode ? ` ${selectedProduct.unitCode}` : ""}
          </p>
          <p>
            <strong>{text.minimumStock}:</strong> {formatNumber(selectedProduct.minimumStock)}
            {selectedProduct.unitCode ? ` ${selectedProduct.unitCode}` : ""}
          </p>

          <div className="inventory-form-grid">
            <label>
              {text.receivedQuantity} {selectedProduct.unitCode ? `(${selectedProduct.unitCode})` : ""}
              <input
                type="number"
                min={0.0001}
                step="0.0001"
                value={receivedQuantity}
                onChange={(e) => setReceivedQuantity(Number(e.target.value))}
              />
            </label>

            <label className="full-width">
              {text.notes}
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                      onChange={(e) => updateCostAmount(rubric.id, e.target.value)}
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

          <button onClick={handleCreateReceipt} disabled={saveLoading || rubricsLoading}>
            {saveLoading ? text.creating : text.create}
          </button>
        </div>
      )}

      {lastReceipt && (
        <div className="card">
          <h3>{text.lastReceipt}</h3>
          <p><strong>{text.receiptId}:</strong> {lastReceipt.id}</p>
          <p><strong>{text.product}:</strong> {lastReceipt.productName}</p>
          <p>
            <strong>{text.receivedQuantity}:</strong> {formatNumber(lastReceipt.receivedQuantity)}
            {selectedProduct?.unitCode ? ` ${selectedProduct.unitCode}` : ""}
          </p>
          <p>
            <strong>{text.remainingQuantity}:</strong> {formatNumber(lastReceipt.remainingQuantity)}
            {selectedProduct?.unitCode ? ` ${selectedProduct.unitCode}` : ""}
          </p>
          <p><strong>{text.totalCost}:</strong> {formatCurrency(lastReceipt.totalCostAmount)}</p>
          <p><strong>{text.unitCost}:</strong> {formatCurrency(lastReceipt.unitCost)}</p>
          <p><strong>{text.receivedAt}:</strong> {formatDateTime(lastReceipt.receivedAt)}</p>
        </div>
      )}
    </div>
  )
}

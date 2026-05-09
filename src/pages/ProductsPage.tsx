import { useEffect, useMemo, useState } from "react"
import {
  createProduct,
  getProducts,
  updateProduct,
  type CreateProductRequest,
  type ProductResponse,
} from "../api/productManagementApi"
import { getUnits, type UnitResponse } from "../api/unitApi"
import { useI18n } from "../i18n/I18nContext"
import { formatCurrency, formatNumber } from "../utils/format"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import { findPresetCategoryKey, getLocalizedPresetCategories } from "../utils/productCategories"
import { parseCsvText } from "../utils/csv"

type ProductFormState = {
  barcode: string
  name: string
  description: string
  category: string
  unitPrice: string
  minimumStock: string
  active: boolean
  unitId: string
  priceTiers: PriceTierFormState[]
}

type PriceTierFormState = {
  label: string
  minQuantity: string
  unitPrice: string
}

const emptyForm: ProductFormState = {
  barcode: "",
  name: "",
  description: "",
  category: "",
  unitPrice: "",
  minimumStock: "0",
  active: true,
  unitId: "",
  priceTiers: [],
}

const MAX_PRICE_TIERS = 3
const PRODUCT_CSV_REQUIRED_HEADERS = ["name", "category", "unit", "unitPrice"] as const
const PRODUCT_CSV_OPTIONAL_HEADERS = ["description", "barcode", "minimumStock", "active"] as const

type CsvPreviewRow = {
  rowNumber: number
  rawValues: Record<string, string>
  errors: string[]
  payload?: CreateProductRequest
}

type ImportRunResult = {
  createdCount: number
  failedRows: Array<{ rowNumber: number; message: string }>
}

function normalizeCsvHeader(value: string) {
  return value.trim().replace(/[\s_-]+/g, "").toLowerCase()
}

function parseBooleanLike(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  if (["true", "1", "yes", "y", "oui", "si", "active", "actif", "activo"].includes(normalized)) {
    return true
  }
  if (["false", "0", "no", "n", "non", "inactive", "inactif", "inactivo"].includes(normalized)) {
    return false
  }
  return null
}

export default function ProductsPage() {
  const { language, copy } = useI18n()
  const text = copy.productsPage
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [units, setUnits] = useState<UnitResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unitsLoading, setUnitsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [showScanner, setShowScanner] = useState(false)
  const [csvFileName, setCsvFileName] = useState("")
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([])
  const [csvMissingHeaders, setCsvMissingHeaders] = useState<string[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportResult, setCsvImportResult] = useState<ImportRunResult | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [categorySelection, setCategorySelection] = useState("")

  const isEditMode = editingProductId !== null

  const localizedPresetCategories = useMemo(
    () => getLocalizedPresetCategories(language),
    [language],
  )

  useEffect(() => {
    void loadProducts()
    void loadUnits()
  }, [])

  useEffect(() => {
    if (!categorySelection || categorySelection === "OTHER") {
      return
    }

    const matchedOption = localizedPresetCategories.find((option) => option.key === categorySelection)
    if (!matchedOption) {
      return
    }

    setForm((prev) =>
      prev.category === matchedOption.label
        ? prev
        : {
            ...prev,
            category: matchedOption.label,
          },
    )
  }, [categorySelection, localizedPresetCategories])

  async function loadProducts() {
    try {
      setLoading(true)
      setError("")
      const data = await getProducts()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadProductsError)
    } finally {
      setLoading(false)
    }
  }

  async function loadUnits() {
    try {
      setUnitsLoading(true)
      const data = await getUnits()
      setUnits(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadUnitsError)
    } finally {
      setUnitsLoading(false)
    }
  }

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category?.trim())
      .filter((value): value is string => !!value)

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "ALL" || (product.category ?? "") === selectedCategory

      const matchesSearch =
        normalizedSearch === "" ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch) ||
        (product.barcode ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.description ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.category ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.unitCode ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.unitName ?? "").toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesSearch
    })
  }, [products, searchTerm, selectedCategory])

  const unitLookup = useMemo(() => {
    const lookup = new Map<string, UnitResponse>()

    units.forEach((unit) => {
      lookup.set(unit.code.trim().toLowerCase(), unit)
      lookup.set(unit.name.trim().toLowerCase(), unit)
    })

    return lookup
  }, [units])

  const csvRequiredHeaders = useMemo(
    () => [...PRODUCT_CSV_REQUIRED_HEADERS],
    []
  )

  const csvOptionalHeaders = useMemo(
    () => [...PRODUCT_CSV_OPTIONAL_HEADERS],
    []
  )

  function updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function resetCsvImportState() {
    setCsvFileName("")
    setCsvPreviewRows([])
    setCsvMissingHeaders([])
    setCsvImportResult(null)
  }

  function buildCsvPreviewRows(content: string) {
    const rows = parseCsvText(content)
    if (rows.length === 0) {
      throw new Error(text.csvEmptyFile)
    }

    const [headerRow, ...dataRows] = rows
    const normalizedHeaders = headerRow.map(normalizeCsvHeader)
    const headerIndex = new Map<string, number>()

    normalizedHeaders.forEach((header, index) => {
      if (header && !headerIndex.has(header)) {
        headerIndex.set(header, index)
      }
    })

    const headerAliases: Record<string, string[]> = {
      name: ["name", "productname"],
      category: ["category"],
      unit: ["unit", "unitcode", "unitname"],
      unitPrice: ["unitprice", "price"],
      description: ["description"],
      barcode: ["barcode", "codebarres", "codigobarras"],
      minimumStock: ["minimumstock", "minimumstocklevel", "minstock", "stockminimum"],
      active: ["active", "isactive", "status"],
    }

    const resolvedHeaderNames = new Map<string, string>()
    const missingHeaders = csvRequiredHeaders.filter((requiredHeader) => {
      const alias = headerAliases[requiredHeader].find((candidate) => headerIndex.has(candidate))
      if (alias) {
        resolvedHeaderNames.set(requiredHeader, alias)
        return false
      }
      return true
    })

    csvOptionalHeaders.forEach((optionalHeader) => {
      const alias = headerAliases[optionalHeader].find((candidate) => headerIndex.has(candidate))
      if (alias) {
        resolvedHeaderNames.set(optionalHeader, alias)
      }
    })

    const previewRows = dataRows
      .map((row, rowIndex) => {
        const rowNumber = rowIndex + 2
        const rawValues = {
          name: row[headerIndex.get(resolvedHeaderNames.get("name") ?? "") ?? -1]?.trim() ?? "",
          category: row[headerIndex.get(resolvedHeaderNames.get("category") ?? "") ?? -1]?.trim() ?? "",
          unit: row[headerIndex.get(resolvedHeaderNames.get("unit") ?? "") ?? -1]?.trim() ?? "",
          unitPrice: row[headerIndex.get(resolvedHeaderNames.get("unitPrice") ?? "") ?? -1]?.trim() ?? "",
          description: row[headerIndex.get(resolvedHeaderNames.get("description") ?? "") ?? -1]?.trim() ?? "",
          barcode: row[headerIndex.get(resolvedHeaderNames.get("barcode") ?? "") ?? -1]?.trim() ?? "",
          minimumStock: row[headerIndex.get(resolvedHeaderNames.get("minimumStock") ?? "") ?? -1]?.trim() ?? "",
          active: row[headerIndex.get(resolvedHeaderNames.get("active") ?? "") ?? -1]?.trim() ?? "",
        }

        return { rowNumber, rawValues }
      })
      .filter((row) => Object.values(row.rawValues).some((value) => value !== ""))
      .map(({ rowNumber, rawValues }) => {
        const errors: string[] = []
        const matchedUnit = rawValues.unit ? unitLookup.get(rawValues.unit.toLowerCase()) : undefined
        const parsedUnitPrice = Number(rawValues.unitPrice)
        const parsedMinimumStock = rawValues.minimumStock ? Number(rawValues.minimumStock) : 0
        const parsedActive = parseBooleanLike(rawValues.active)

        if (!rawValues.name) {
          errors.push(text.csvRowNameRequired)
        }
        if (!rawValues.category) {
          errors.push(text.csvRowCategoryRequired)
        }
        if (!rawValues.unit) {
          errors.push(text.csvRowUnitRequired)
        } else if (!matchedUnit) {
          errors.push(text.csvRowUnitUnknown(rawValues.unit))
        }
        if (!rawValues.unitPrice) {
          errors.push(text.csvRowUnitPriceRequired)
        } else if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
          errors.push(text.csvRowUnitPriceInvalid)
        }
        if (rawValues.minimumStock && (!Number.isFinite(parsedMinimumStock) || parsedMinimumStock < 0)) {
          errors.push(text.csvRowMinimumStockInvalid)
        }
        if (parsedActive === null) {
          errors.push(text.csvRowActiveInvalid)
        }

        const payload: CreateProductRequest | undefined = errors.length > 0 || !matchedUnit
          ? undefined
          : {
              barcode: rawValues.barcode,
              name: rawValues.name,
              description: rawValues.description,
              category: rawValues.category,
              unitPrice: parsedUnitPrice,
              minimumStock: parsedMinimumStock,
              active: parsedActive ?? true,
              unitId: matchedUnit.id,
              priceTiers: [],
            }

        return {
          rowNumber,
          rawValues,
          errors,
          payload,
        }
      })

    return { missingHeaders, previewRows }
  }

  function handleDownloadCsvTemplate() {
    const lines = [
      [...csvRequiredHeaders, ...csvOptionalHeaders].join(","),
      "Soda 3,Boisson,UNIT,2.00,Soft drink,1234567890123,5,true",
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "cameleyon-products-template.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      resetCsvImportState()
      return
    }

    try {
      const content = await file.text()
      const { missingHeaders, previewRows } = buildCsvPreviewRows(content)

      setCsvFileName(file.name)
      setCsvMissingHeaders(missingHeaders)
      setCsvPreviewRows(previewRows)
      setCsvImportResult(null)

      if (previewRows.length === 0) {
        setError(text.csvNoRows)
        return
      }

      if (missingHeaders.length > 0) {
        setError(text.csvMissingHeaders(missingHeaders.join(", ")))
        return
      }

      if (previewRows.some((row) => row.errors.length > 0)) {
        setError(text.csvFixRows)
        return
      }

      setError("")
      setSuccess(text.csvReady(previewRows.length))
    } catch (err) {
      console.error(err)
      resetCsvImportState()
      setError(err instanceof Error ? err.message : text.csvReadError)
    } finally {
      event.target.value = ""
    }
  }

  async function handleImportCsv() {
    const validRows = csvPreviewRows.filter((row) => row.payload && row.errors.length === 0)
    if (csvMissingHeaders.length > 0) {
      setError(text.csvMissingHeaders(csvMissingHeaders.join(", ")))
      return
    }
    if (validRows.length === 0) {
      setError(text.csvNoValidRows)
      return
    }

    try {
      setCsvImporting(true)
      setError("")
      setSuccess("")

      let createdCount = 0
      const failedRows: Array<{ rowNumber: number; message: string }> = []

      for (const row of validRows) {
        try {
          await createProduct(row.payload as CreateProductRequest)
          createdCount += 1
        } catch (err) {
          console.error(err)
          failedRows.push({
            rowNumber: row.rowNumber,
            message: err instanceof Error ? err.message : text.csvImportRowFailed,
          })
        }
      }

      setCsvImportResult({ createdCount, failedRows })
      if (failedRows.length === 0) {
        setSuccess(text.csvImportSuccess(createdCount))
        resetCsvImportState()
      } else {
        setError(text.csvImportPartial(createdCount, failedRows.length))
      }

      await loadProducts()
    } finally {
      setCsvImporting(false)
    }
  }

  function handleEdit(product: ProductResponse) {
    const presetCategoryKey = findPresetCategoryKey(product.category ?? "")

    setEditingProductId(product.id)
    setError("")
    setSuccess("")
    setCategorySelection(presetCategoryKey || (product.category?.trim() ? "OTHER" : ""))
    setForm({
      barcode: product.barcode ?? "",
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? "",
      unitPrice: String(product.unitPrice),
      minimumStock: String(product.minimumStock),
      active: product.active,
      unitId: product.unitId ? String(product.unitId) : "",
      priceTiers: (product.priceTiers ?? []).map((tier) => ({
        label: tier.label ?? "",
        minQuantity: String(tier.minQuantity),
        unitPrice: String(tier.unitPrice),
      })),
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleCancelEdit() {
    setEditingProductId(null)
    setForm(emptyForm)
    setCategorySelection("")
    setShowScanner(false)
    setError("")
    setSuccess("")
  }

  function handleClearFilters() {
    setSearchTerm("")
    setSelectedCategory("ALL")
  }

  function handleDetectedBarcode(value: string) {
    updateForm("barcode", value)
    setShowScanner(false)
    setError("")
    setSuccess("")
  }

  function handleCategorySelectionChange(value: string) {
    setCategorySelection(value)

    if (!value) {
      updateForm("category", "")
      return
    }

    if (value === "OTHER") {
      if (findPresetCategoryKey(form.category)) {
        updateForm("category", "")
      }
      return
    }

    const matchedOption = localizedPresetCategories.find((option) => option.key === value)
    updateForm("category", matchedOption?.label ?? "")
  }

  function handleAddPriceTier() {
    if (form.priceTiers.length >= MAX_PRICE_TIERS) {
      setError(text.maxWholesalePrices)
      return
    }

    updateForm("priceTiers", [
      ...form.priceTiers,
      {
        label: "",
        minQuantity: "",
        unitPrice: "",
      },
    ])
  }

  function handleUpdatePriceTier<K extends keyof PriceTierFormState>(
    index: number,
    key: K,
    value: PriceTierFormState[K],
  ) {
    updateForm(
      "priceTiers",
      form.priceTiers.map((tier, tierIndex) =>
        tierIndex === index
          ? {
              ...tier,
              [key]: value,
            }
          : tier,
      ),
    )
  }

  function handleRemovePriceTier(index: number) {
    updateForm(
      "priceTiers",
      form.priceTiers.filter((_, tierIndex) => tierIndex !== index),
    )
  }

  function normalizePriceTiers() {
    const completedTiers = form.priceTiers.filter(
      (tier) =>
        tier.label.trim() !== "" ||
        tier.minQuantity.trim() !== "" ||
        tier.unitPrice.trim() !== "",
    )

    if (completedTiers.length > MAX_PRICE_TIERS) {
      throw new Error(text.maxWholesalePrices)
    }

    const usedQuantities = new Set<string>()

    return completedTiers.map((tier) => {
      const minQuantity = Number(tier.minQuantity)
      const unitPrice = Number(tier.unitPrice)

      if (!Number.isFinite(minQuantity) || minQuantity <= 1) {
        throw new Error(text.invalidWholesaleMinimum)
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(text.invalidWholesalePrice)
      }

      const normalizedQuantityKey = minQuantity.toFixed(4)
      if (usedQuantities.has(normalizedQuantityKey)) {
        throw new Error(text.duplicateWholesaleMinimum)
      }
      usedQuantities.add(normalizedQuantityKey)

      return {
        label: tier.label.trim() || null,
        minQuantity,
        unitPrice,
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      setError(text.nameRequired)
      return
    }
    if (form.unitPrice.trim() === "") {
      setError(text.unitPriceRequired)
      return
    }
    if (!form.unitId) {
      setError(text.unitRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const priceTiers = normalizePriceTiers()

      const payload = {
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        unitPrice: Number(form.unitPrice),
        minimumStock: Number(form.minimumStock || "0"),
        active: form.active,
        unitId: Number(form.unitId),
        priceTiers,
      }

      if (isEditMode && editingProductId !== null) {
        await updateProduct(editingProductId, payload)
        setSuccess(text.updateSuccess)
      } else {
        await createProduct(payload)
        setSuccess(text.createSuccess)
      }

      setEditingProductId(null)
      setForm(emptyForm)
      setCategorySelection("")
      setShowScanner(false)
      await loadProducts()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <div className="scanner-header">
          <div>
            <h3>{text.csvImportTitle}</h3>
            <p>{text.csvImportHelp}</p>
          </div>

          <button type="button" className="secondary-button" onClick={handleDownloadCsvTemplate}>
            {text.csvTemplateDownload}
          </button>
        </div>

        <div className="csv-import-meta">
          <div>
            <strong>{text.csvRequiredColumns}</strong>
            <p>{csvRequiredHeaders.join(", ")}</p>
          </div>

          <div>
            <strong>{text.csvOptionalColumns}</strong>
            <p>{csvOptionalHeaders.join(", ")}</p>
          </div>
        </div>

        <div className="csv-import-actions">
          <label className="csv-file-picker">
            <span>{text.csvChooseFile}</span>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} />
          </label>

          {csvFileName && <span>{text.csvSelectedFile(csvFileName)}</span>}

          <button
            type="button"
            onClick={handleImportCsv}
            disabled={
              csvImporting ||
              csvPreviewRows.length === 0 ||
              csvMissingHeaders.length > 0 ||
              csvPreviewRows.some((row) => row.errors.length > 0)
            }
          >
            {csvImporting ? text.csvImporting : text.csvImportButton}
          </button>
        </div>

        {csvPreviewRows.length > 0 && (
          <div className="csv-preview-table">
            <h4>{text.csvPreviewTitle}</h4>

            <table>
              <thead>
                <tr>
                  <th>{text.csvRowNumber}</th>
                  <th>{text.name}</th>
                  <th>{text.category}</th>
                  <th>{text.unit}</th>
                  <th>{text.unitPrice}</th>
                  <th>{text.minimumStock}</th>
                  <th>{text.status}</th>
                  <th>{text.csvErrors}</th>
                </tr>
              </thead>
              <tbody>
                {csvPreviewRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.rawValues.name || "-"}</td>
                    <td>{row.rawValues.category || "-"}</td>
                    <td>{row.rawValues.unit || "-"}</td>
                    <td>{row.rawValues.unitPrice || "-"}</td>
                    <td>{row.rawValues.minimumStock || "0"}</td>
                    <td>{row.errors.length === 0 ? text.csvRowReady : text.csvRowInvalid}</td>
                    <td>
                      {row.errors.length === 0 ? (
                        "-"
                      ) : (
                        <ul className="csv-error-list">
                          {row.errors.map((rowError) => (
                            <li key={rowError}>{rowError}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {csvImportResult && (
          <div className="csv-import-meta">
            <div>
              <strong>{text.csvCreatedCount}</strong>
              <p>{csvImportResult.createdCount}</p>
            </div>

            <div>
              <strong>{text.csvFailedCount}</strong>
              <p>{csvImportResult.failedRows.length}</p>
            </div>
          </div>
        )}

        {csvImportResult && csvImportResult.failedRows.length > 0 && (
          <div className="card error nested-card">
            <strong>{text.csvFailedRowsTitle}</strong>
            <ul className="csv-error-list">
              {csvImportResult.failedRows.map((row) => (
                <li key={`${row.rowNumber}-${row.message}`}>
                  {text.csvFailedRow(row.rowNumber, row.message)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{isEditMode ? text.editTitle : text.newTitle}</h3>

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

        <form onSubmit={handleSubmit} className="product-form-grid">
          <label>
            {text.barcode}
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => updateForm("barcode", e.target.value)}
              placeholder={text.barcodePlaceholder}
            />
          </label>

          <label className="full-width">
            {text.name}
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
            />
          </label>

          <label className="full-width">
            {text.description}
            <input
              type="text"
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
            />
          </label>

          <label>
            {text.category}
            <select
              value={categorySelection}
              onChange={(e) => handleCategorySelectionChange(e.target.value)}
            >
              <option value="">{text.chooseCategory}</option>
              {localizedPresetCategories.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
              <option value="OTHER">{text.otherCategory}</option>
            </select>
          </label>

          {categorySelection === "OTHER" && (
            <label>
              {text.customCategory}
              <input
                type="text"
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
                placeholder={text.customCategoryPlaceholder}
              />
            </label>
          )}

          <label>
            {text.unit}
            <select
              value={form.unitId}
              onChange={(e) => updateForm("unitId", e.target.value)}
              disabled={unitsLoading}
            >
              <option value="">{text.selectUnit}</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          </label>

          <label>
            {text.unitPrice}
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => updateForm("unitPrice", e.target.value)}
            />
          </label>

          <div className="full-width card nested-card">
            <div className="scanner-header">
              <div>
                <h3>{text.wholesalePrices}</h3>
                <p>{text.wholesalePricesHelp}</p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={handleAddPriceTier}
                disabled={form.priceTiers.length >= MAX_PRICE_TIERS}
              >
                {text.addWholesalePrice}
              </button>
            </div>

            {form.priceTiers.length === 0 ? (
              <p>{text.noWholesalePrices}</p>
            ) : (
              <div className="product-form-grid">
                {form.priceTiers.map((tier, index) => (
                  <div key={index} className="full-width product-form-grid">
                    <label>
                      {text.wholesaleLabel}
                      <input
                        type="text"
                        value={tier.label}
                        onChange={(e) => handleUpdatePriceTier(index, "label", e.target.value)}
                        placeholder={text.wholesaleLabelPlaceholder}
                      />
                    </label>

                    <label>
                      {text.wholesaleMinimum}
                      <input
                        type="number"
                        min={2}
                        step="0.0001"
                        value={tier.minQuantity}
                        onChange={(e) => handleUpdatePriceTier(index, "minQuantity", e.target.value)}
                        placeholder="3"
                      />
                    </label>

                    <label>
                      {text.wholesaleUnitPrice}
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={tier.unitPrice}
                        onChange={(e) => handleUpdatePriceTier(index, "unitPrice", e.target.value)}
                        placeholder="0.00"
                      />
                    </label>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleRemovePriceTier(index)}
                      >
                        {text.removeWholesalePrice}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label>
            {text.minimumStock}
            <input
              type="number"
              min={0}
              step="0.0001"
              value={form.minimumStock}
              onChange={(e) => updateForm("minimumStock", e.target.value)}
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => updateForm("active", e.target.checked)}
            />
            {text.active}
          </label>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving || unitsLoading}>
              {saving
                ? isEditMode
                  ? text.updating
                  : text.creating
                : isEditMode
                  ? text.update
                  : text.create}
            </button>

            {isEditMode && (
              <button type="button" className="secondary-button" onClick={handleCancelEdit}>
                {text.cancel}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>{text.listTitle}</h3>

        <div className="product-filters">
          <label>
            {text.search}
            <input
              type="text"
              placeholder={text.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          <label>
            {text.category}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">{text.allCategories}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="product-filter-actions">
            <button type="button" className="secondary-button" onClick={handleClearFilters}>
              {text.clearFilters}
            </button>
          </div>
        </div>

        {loading ? (
          <p>{text.loading}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{text.name}</th>
                <th>{text.sku}</th>
                <th>{text.barcode}</th>
                <th>{text.category}</th>
                <th>{text.unit}</th>
                <th>{text.unitPrice}</th>
                <th>{text.referenceCost}</th>
                <th>{text.stock}</th>
                <th>{text.minimumStock}</th>
                <th>{text.status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    {products.length === 0 ? text.empty : text.emptyFiltered}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.barcode || "-"}</td>
                    <td>{product.category || "-"}</td>
                    <td>{product.unitCode || "-"}</td>
                    <td>{formatCurrency(product.unitPrice)}</td>
                    <td>
                      {product.costPrice === null ? "-" : formatCurrency(product.costPrice)}
                    </td>
                    <td>
                      {formatNumber(product.currentStock)}
                      {product.unitCode ? ` ${product.unitCode}` : ""}
                    </td>
                    <td>
                      {formatNumber(product.minimumStock)}
                      {product.unitCode ? ` ${product.unitCode}` : ""}
                    </td>
                    <td>{product.active ? text.active : text.inactive}</td>
                    <td>
                      <button onClick={() => handleEdit(product)}>{text.edit}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

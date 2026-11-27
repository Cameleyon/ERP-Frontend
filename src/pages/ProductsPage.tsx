import { useEffect, useMemo, useRef, useState } from "react"
import {
  createProduct,
  getProducts,
  ProductResponseError,
  updateProduct,
  type CreateProductRequest,
  type ProductResponse,
} from "../api/productManagementApi"
import type { ProductQuantityType } from "../api/productApi"
import { useI18n } from "../i18n/I18nContext"
import ErrorMessage from "../components/common/ErrorMessage"
import { CompanyCurrencyRequiredError } from "../utils/companyCurrency"
import { formatCurrency, formatNumber } from "../utils/format"
import BarcodeScanner from "../components/sales/BarcodeScanner"
import TablePagination from "../components/common/TablePagination"
import { findPresetCategoryKey, getLocalizedPresetCategories } from "../utils/productCategories"
import { parseCsvText } from "../utils/csv"
import { useAuth } from "../auth/AuthContext"
import { getAccessibleCompanyLocations } from "../api/companyLocationsApi"
import { setupCopy } from "../i18n/setupCopy"
import { stockWorkspaceCopy } from "../i18n/stockWorkspaceCopy"
import { StockFacts, StockHeading, StockStatus } from "../components/inventory/StockWorkspace"

type ProductFormState = {
  barcode: string
  name: string
  description: string
  category: string
  unitPrice: string
  minimumStock: string
  active: boolean
  unitName: string
  quantityType: ProductQuantityType
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
  unitName: "",
  quantityType: "DECIMAL",
  priceTiers: [],
}

const MAX_PRICE_TIERS = 3
const PRODUCTS_PER_PAGE = 12
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

type ProductSortKey = "name" | "unitName" | "unitPrice" | "currentStock" | "active"

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

type ProductView = "list" | "editor" | "details" | "tools"

export default function ProductsPage({ guided = false, visible = true, onOpeningStock, onInspectStock }: {
  guided?: boolean; visible?: boolean; onOpeningStock?: (productId: number) => void; onInspectStock?: (productId: number) => void
} = {}) {
  const { language, copy } = useI18n()
  const { user } = useAuth()
  const guide = setupCopy[language]
  const text = copy.productsPage
  const labels = stockWorkspaceCopy[language]
  const money = (value: number) => formatCurrency(value, user?.companyCurrencyCode || "USD", language)
  const [view, setView] = useState<ProductView>(() => guided ? "editor" : "list")
  const [detailSnapshot, setDetailSnapshot] = useState<ProductResponse | null>(null)
  const [toolCode, setToolCode] = useState("")
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [createdProduct, setCreatedProduct] = useState<ProductResponse | null>(null)
  const [siteAvailability, setSiteAvailability] = useState<"checking" | "ready" | "blocked" | "error">("checking")
  const [listWarning, setListWarning] = useState("")
  const [uncertainCreate, setUncertainCreate] = useState(false)
  const [optionalOpen, setOptionalOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const productListHeading = useRef<HTMLHeadingElement>(null)
  const submitLock = useRef(false)
  const wasVisible = useRef(visible)
  const invalidOptionalField = useRef<string | null>(null)
  const confirmationDialog = useRef<HTMLDialogElement>(null)
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
  const [sort, setSort] = useState<{ key: ProductSortKey; direction: "asc" | "desc" } | null>(null)
  const [page, setPage] = useState(1)

  const isEditMode = editingProductId !== null
  const guidedForm = guided && !isEditMode
  const detail = products.find(product => product.id === detailSnapshot?.id) ?? detailSnapshot

  const localizedPresetCategories = useMemo(
    () => getLocalizedPresetCategories(language),
    [language],
  )

  useEffect(() => {
    void loadProducts()
  }, [])

  useEffect(() => {
    const dialog = confirmationDialog.current
    if (createdProduct && dialog && !dialog.open) dialog.showModal()
  }, [createdProduct])

  useEffect(() => {
    if (visible && (guided || !wasVisible.current)) nameRef.current?.focus()
    wasVisible.current = visible
  }, [guided, visible])

  useEffect(() => {
    if (siteAvailability === "ready" && createdProduct?.active) {
      confirmationDialog.current?.querySelector<HTMLElement>("[data-opening-stock]")?.focus()
    }
  }, [siteAvailability, createdProduct])

  async function checkReceiptSite() {
    setSiteAvailability("checking")
    try {
      const sites = await getAccessibleCompanyLocations()
      setSiteAvailability(sites.some(site => site.active) ? "ready" : "blocked")
    } catch { setSiteAvailability("error") }
  }

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

  async function loadProducts(quiet = false) {
    try {
      setLoading(true)
      if (!quiet) setError("")
      const data = await getProducts()
      setProducts(Array.isArray(data) ? data : [])
      return true
    } catch (err) {
      console.error(err)
      if (!quiet) setError(err instanceof Error ? err.message : text.loadProductsError)
      return false
    } finally {
      setLoading(false)
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

    const matches = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "ALL" || (product.category ?? "") === selectedCategory

      const matchesSearch =
        normalizedSearch === "" ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch) ||
        (product.barcode ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.description ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.category ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.unitName ?? "").toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesSearch
    })
    if (!sort) return matches

    const { key, direction } = sort
    const collator = new Intl.Collator(language, { numeric: true, sensitivity: "accent" })
    return matches.sort((left, right) => {
      const a = left[key]
      const b = right[key]
      if (a == null || a === "") return b == null || b === "" ? 0 : 1
      if (b == null || b === "") return -1

      const comparison = typeof a === "number" && typeof b === "number" ? a - b
        : typeof a === "boolean" && typeof b === "boolean" ? Number(b) - Number(a)
        : collator.compare(String(a), String(b))
      return direction === "asc" ? comparison : -comparison
    })
  }, [products, searchTerm, selectedCategory, sort, language])

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE))
  const currentPage = Math.min(page, pageCount)
  const visibleProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE)
  const listColumns = [
    { key: "name", label: text.name }, { key: "unitName", label: text.unit }, { key: "unitPrice", label: text.unitPrice },
    { key: "currentStock", label: labels.stock }, { key: "active", label: text.status },
  ] as const

  const unitSuggestions = useMemo(() => {
    const values = products
      .map((product) => product.unitName)
      .filter((value): value is string => !!value?.trim())

    return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
  }, [products])

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

        const payload: CreateProductRequest | undefined = errors.length > 0
          ? undefined
          : {
              barcode: rawValues.barcode,
              name: rawValues.name,
              description: rawValues.description,
              category: rawValues.category,
              unitPrice: parsedUnitPrice,
              minimumStock: parsedMinimumStock,
              active: parsedActive ?? true,
              unitName: rawValues.unit.trim(),
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
      "Soda 3,Boisson,piece,2.00,Soft drink,1234567890123,5,true",
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
      let blockedByCurrency = false
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
          if (err instanceof CompanyCurrencyRequiredError) {
            blockedByCurrency = true
            break
          }
        }
      }

      setCsvImportResult({ createdCount, failedRows })
      if (failedRows.length === 0) {
        setSuccess(text.csvImportSuccess(createdCount))
        resetCsvImportState()
      } else if (!blockedByCurrency) {
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
    setDetailSnapshot(product)
    setOptionalOpen(false)
    setShowScanner(false)
    showView("editor")
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
      unitName: product.unitName || "",
      quantityType: product.quantityType ?? "DECIMAL",
      priceTiers: (product.priceTiers ?? []).map((tier) => ({
        label: tier.label ?? "",
        minQuantity: String(tier.minQuantity),
        unitPrice: String(tier.unitPrice),
      })),
    })
  }

  function handleCancelEdit() {
    setEditingProductId(null)
    setForm(emptyForm)
    setCategorySelection("")
    setShowScanner(false)
    setError("")
    setSuccess("")
    showView(isEditMode && detailSnapshot ? "details" : "list")
  }

  function showView(next: ProductView) {
    setView(next)
    setShowScanner(false)
    if (next !== "details") setSuccess("")
    requestAnimationFrame(() => (next === "editor" ? nameRef.current : headingRef.current)?.focus())
  }

  function startNewProduct(barcode = "") {
    if (uncertainCreate) return
    setEditingProductId(null)
    setCategorySelection("")
    setForm({ ...emptyForm, barcode })
    setOptionalOpen(Boolean(barcode))
    setError("")
    setSuccess("")
    showView("editor")
  }

  function viewProduct(product: ProductResponse) {
    setDetailSnapshot(product)
    setSuccess("")
    showView("details")
  }

  function findBarcode() {
    if (!toolCode.trim()) return
    setSearchTerm(toolCode.trim())
    setSelectedCategory("ALL")
    setPage(1)
    showView("list")
  }

  function handleClearFilters() {
    setSearchTerm("")
    setSelectedCategory("ALL")
    setPage(1)
  }

  function cycleSort(key: ProductSortKey) {
    setSort(current => {
      if (current?.key !== key) return { key, direction: "asc" }
      return current.direction === "asc" ? { key, direction: "desc" } : null
    })
    setPage(1)
  }

  function sortButton(key: ProductSortKey, label: string, mobile = false) {
    const direction = sort?.key === key ? sort.direction : undefined
    return <button type="button" className="table-sort-button"
      aria-pressed={mobile ? direction !== undefined : undefined}
      aria-description={mobile ? direction === "asc" ? labels.ascending : direction === "desc" ? labels.descending : labels.defaultSort : undefined}
      onClick={() => cycleSort(key)}>
      <span>{label}</span>
      <span aria-hidden="true">{direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}</span>
    </button>
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
      if (form.quantityType === "INTEGER" && !Number.isInteger(minQuantity)) {
        throw new Error(copy.common.wholeNumberQuantity)
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
    if (submitLock.current || uncertainCreate && !isEditMode) return

    if (!form.name.trim()) {
      setError(text.nameRequired)
      return
    }
    if (form.unitPrice.trim() === "") {
      setError(text.unitPriceRequired)
      return
    }
    if (!form.unitName.trim()) {
      setError(text.unitRequired)
      return
    }
    if (form.quantityType === "INTEGER" && !Number.isInteger(Number(form.minimumStock))) {
      revealOptional("product-minimum-stock")
      setError(copy.common.wholeNumberQuantity)
      return
    }

    let creationStarted = false
    try {
      submitLock.current = true
      setSaving(true)
      setError("")
      setSuccess("")
      setListWarning("")

      const priceTiers = normalizePriceTiers()

      const payload = {
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        unitPrice: Number(form.unitPrice),
        minimumStock: Number(form.minimumStock || "0"),
        active: form.active,
        unitName: form.unitName.trim(),
        priceTiers,
      }

      if (isEditMode && editingProductId !== null) {
        const product = await updateProduct(editingProductId, payload)
        setDetailSnapshot(product)
        setSuccess(text.updateSuccess)
      } else {
        creationStarted = true
        const product = await createProduct({ ...payload, quantityType: form.quantityType })
        setSiteAvailability("checking")
        setCreatedProduct(product)
        setDetailSnapshot(product)
        if (product.active && onOpeningStock) void checkReceiptSite()
      }

      setEditingProductId(null)
      setForm(emptyForm)
      setCategorySelection("")
      setShowScanner(false)
      if (!await loadProducts(!isEditMode) && !isEditMode) setListWarning(guide.listFailed)
      if (isEditMode) showView("details")
      else setView("details")
    } catch (err) {
      console.error(err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        if (creationStarted && (!(err instanceof ProductResponseError) || err.status >= 500 || err.status === 408)) {
          setUncertainCreate(true)
          setError(guide.uncertain)
        } else {
          const message = err instanceof Error ? err.message : text.saveError
          if (!creationStarted && !isEditMode || /wholesale|tier/i.test(message)) revealOptional("product-wholesale")
          else if (/barcode/i.test(message)) revealOptional("product-barcode")
          setError(message)
        }
      }
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  function revealOptional(id: string) {
    invalidOptionalField.current = id
    setOptionalOpen(true)
    requestAnimationFrame(() => {
      if (document.querySelector("dialog[open]")) return
      document.getElementById(id)?.focus()
    })
  }

  return (
    <div className="stock-workspace">
      <StockHeading headingRef={headingRef}
        title={view === "editor" ? isEditMode ? text.editTitle : labels.newProduct : view === "tools" ? labels.toolTitle :
          view === "details" && detail ? detail.name : text.title}
        description={view === "list" ? labels.catalog : (view === "details" || isEditMode) && detail ?
          `${detail.sku} · ${view === "details" ? labels.details : text.editTitle}` : undefined}>
        {view === "list" ? <>
          <button type="button" className="workspace-primary" disabled={uncertainCreate || csvImporting} onClick={() => startNewProduct()}><span aria-hidden="true">+</span>{labels.newProduct}</button>
          <button type="button" className="workspace-outline" onClick={() => showView("tools")}>{text.csvImportButton}</button>
        </> : <>
          {view === "details" && detail && <button className="workspace-outline" type="button" onClick={() => handleEdit(detail)}>{labels.edit}</button>}
          <button type="button" className="workspace-text-action" disabled={saving || csvImporting}
            onClick={() => view === "editor" ? handleCancelEdit() : showView("list")}>{labels.backProducts}</button>
        </>}
      </StockHeading>

      {error && <ErrorMessage message={error} onDismiss={() => {
        setError("")
        const field = invalidOptionalField.current
        invalidOptionalField.current = null
        if (field) requestAnimationFrame(() => document.getElementById(field)?.focus())
      }} />}
      {success && <div className="card success">{success}</div>}
      {listWarning && <p role="status">{listWarning}</p>}
      {uncertainCreate && <div className="card">
        <p>{guide.uncertain}</p>
        <button type="button" onClick={async () => { await loadProducts(); showView("list") }}>{guide.checkProducts}</button>
        <button type="button" className="secondary-button" onClick={() => {
          setUncertainCreate(false); setForm(emptyForm); setCategorySelection("")
        }}>{copy.common.cancel}</button>
      </div>}

      {createdProduct && (
        <dialog
          ref={confirmationDialog}
          className="card product-confirmation-dialog"
          aria-labelledby="product-confirmation-title"
          aria-describedby="product-confirmation-name"
          onClose={() => { setCreatedProduct(null); if (view === "details") headingRef.current?.focus() }}
        >
          <h2 id="product-confirmation-title">{guide.created}</h2>
          <div id="product-confirmation-name"><p><strong>{createdProduct.name}</strong> · {createdProduct.sku}</p>
            <StockFacts entries={[[text.unit, createdProduct.unitName || labels.notSet], [text.unitPrice, money(createdProduct.unitPrice)]]} />
            <p role="status">
            {!createdProduct.active ? guide.inactive : !onOpeningStock ? guide.createdReason
              : siteAvailability === "checking" ? guide.loading : siteAvailability === "blocked" ? guide.siteBlocked
              : siteAvailability === "error" ? guide.unavailable : guide.createdReason}
          </p></div>
          <form method="dialog" className="form-actions">
            {createdProduct.active && onOpeningStock && siteAvailability === "ready" &&
              <button type="button" data-opening-stock onClick={() => onOpeningStock(createdProduct.id)}>{guide.opening}</button>}
            {createdProduct.active && onOpeningStock && siteAvailability === "error" &&
              <button type="button" onClick={() => void checkReceiptSite()}>{guide.retry}</button>}
            {!createdProduct.active && user?.role === "ADMIN" &&
              <button type="button" onClick={() => {
                const dialog = confirmationDialog.current
                dialog?.close()
                handleEdit(createdProduct)
              }}>{guide.edit}</button>}
            <button type="submit" className="secondary-button" autoFocus onClick={() => showView("list")}>{guide.later}</button>
          </form>
        </dialog>
      )}

      {view === "details" && detail && <div className="stock-split">
        <section className="stock-panel">
          <div className="stock-panel-heading"><h2>{labels.productInfo}</h2><StockStatus active={detail.active}>{detail.active ? text.active : text.inactive}</StockStatus></div>
          <StockFacts entries={[
            [text.unit, detail.unitName || labels.notSet],
            [text.quantityType, detail.quantityType === "INTEGER" ? text.quantityInteger : text.quantityDecimal],
            [text.unitPrice, money(detail.unitPrice)], [text.minimumStock, formatNumber(detail.minimumStock)],
            [text.barcode, detail.barcode || labels.notSet], [text.category, detail.category || labels.notSet],
            ...(detail.description ? [[text.description, detail.description] as const] : []),
          ]} />
          {!!detail.priceTiers?.length && <details className="stock-disclosure"><summary>{text.wholesalePrices}</summary>
            <ul>{detail.priceTiers.map((tier, index) => <li key={tier.id ?? index}>
              {tier.label && `${tier.label} · `}{text.wholesaleMinimum}: {formatNumber(tier.minQuantity)} · {money(tier.unitPrice)}
            </li>)}</ul>
          </details>}
        </section>
        <section className="stock-panel stock-highlight">
          <h2>{labels.stockSummary}</h2>
          <StockFacts entries={[
            [labels.stock, [formatNumber(detail.currentStock), detail.unitName].filter(Boolean).join(" ")],
            [text.referenceCost, detail.costPrice == null ? labels.notSet : money(detail.costPrice)],
          ]} />
          {detail.active && onInspectStock && <button type="button" className="workspace-primary stock-full-action" onClick={() => onInspectStock(detail.id)}>{labels.inspect}</button>}
        </section>
      </div>}

      {view === "tools" && <div className="stock-split stock-tools">
        <section className="stock-panel">
          <h2>{text.scannerTitle}</h2><p className="stock-muted">{labels.barcodeHelp}</p>
          <button type="button" className="workspace-outline" aria-expanded={showScanner} onClick={() => setShowScanner(value => !value)}>
            {showScanner ? text.closeScanner : text.openScanner}
          </button>
          {showScanner && <div className="scanner-container"><BarcodeScanner onDetected={value => { setToolCode(value); setShowScanner(false) }} /></div>}
          <label className="stock-field">{text.barcode}<input value={toolCode} onChange={event => setToolCode(event.target.value)}
            placeholder={text.barcodePlaceholder} onKeyDown={event => { if (event.key === "Enter") findBarcode() }} /></label>
          <div className="stock-actions">
            <button className="workspace-primary" type="button" disabled={!toolCode.trim()} onClick={findBarcode}>{labels.findBarcode}</button>
            <button className="workspace-text-action" type="button" disabled={!toolCode.trim() || uncertainCreate || csvImporting}
              onClick={() => startNewProduct(toolCode.trim())}>{labels.assignBarcode}</button>
          </div>
        </section>
      <div className="stock-panel">
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

        {csvPreviewRows.some(row => row.errors.length > 0) && <p className="stock-muted" role="status">{labels.csvFix}</p>}
        {csvPreviewRows.length > 0 && (
          <div className="csv-preview-table">
            <h4>{text.csvPreviewTitle}</h4>

            <table className="stock-responsive-rows stock-csv-rows" role="table">
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
                  <tr key={row.rowNumber} role="row">
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.csvRowNumber}</span>{row.rowNumber}</td>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.name}</span>{row.rawValues.name || "-"}</td>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.category}</span>{row.rawValues.category || "-"}</td>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.unit}</span>{row.rawValues.unit || "-"}</td>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.unitPrice}</span>{row.rawValues.unitPrice || "-"}</td>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.minimumStock}</span>{row.rawValues.minimumStock || "0"}</td>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.status}</span><StockStatus active={!row.errors.length}>
                      {row.errors.length === 0 ? text.csvRowReady : text.csvRowInvalid}</StockStatus></td>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.csvErrors}</span>
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
      </div></div>}

      {view === "editor" && <div className="stock-split">
      <div className="stock-panel">
        <h2>{labels.productInfo}</h2>

        <form onSubmit={handleSubmit} className="product-form-grid" onInvalidCapture={event => {
          const field = event.target
          if (!optionalOpen && field instanceof HTMLElement && field.closest("#product-extra-fields")) {
            event.preventDefault()
            setOptionalOpen(true)
            requestAnimationFrame(() => { field.focus(); if (field instanceof HTMLInputElement) field.reportValidity() })
          }
        }}>
          <label>
            {guidedForm ? guide.name : text.name}
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
            />
          </label>

          <label>
            {text.unit}
            <input
              type="text"
              list="product-unit-options"
              value={form.unitName}
              onChange={(e) => updateForm("unitName", e.target.value)}
              placeholder={text.unitPlaceholder}
            />
            <datalist id="product-unit-options">
              {unitSuggestions.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
          </label>

          <label>
            {text.quantityType}
            <select
              aria-describedby="product-quantity-help"
              value={form.quantityType}
              disabled={isEditMode}
              onChange={(e) => updateForm("quantityType", e.target.value === "INTEGER" ? "INTEGER" : "DECIMAL")}
            >
              <option value="INTEGER">{text.quantityInteger}</option>
              <option value="DECIMAL">{text.quantityDecimal}</option>
            </select>
            <small id="product-quantity-help">{isEditMode ? labels.editQuantity : guide.quantityHelp}</small>
          </label>

          <label>
            {guidedForm ? guide.price : text.unitPrice}{user?.companyCurrencyCode ? ` (${user.companyCurrencyCode})` : ""}
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => updateForm("unitPrice", e.target.value)}
            />
          </label>

          <div className="setup-product-options stock-disclosure">
            <button type="button" className="stock-disclosure-button" aria-expanded={optionalOpen}
              aria-controls="product-extra-fields" onClick={() => {
                if (optionalOpen) setShowScanner(false)
                setOptionalOpen(value => !value)
              }}><span aria-hidden="true">{optionalOpen ? "− " : "+ "}</span>{guide.options}</button>
            <div id="product-extra-fields" hidden={!optionalOpen}>
              <div className="product-form-grid">
                <div className="full-width card nested-card scanner-toggle-card">
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
                <label>
                  {text.barcode}
                  <input
                    id="product-barcode"
                    type="text"
                    value={form.barcode}
                    onChange={(e) => updateForm("barcode", e.target.value)}
                    placeholder={text.barcodePlaceholder}
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

                <div className="full-width card nested-card" id="product-wholesale" tabIndex={-1}>
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
                              step={form.quantityType === "INTEGER" ? 1 : 0.0001}
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
                    id="product-minimum-stock"
                    type="number"
                    min={0}
                    step={form.quantityType === "INTEGER" ? 1 : 0.0001}
                    value={form.minimumStock}
                    onChange={(e) => updateForm("minimumStock", e.target.value)}
                  />
                </label>

                {!isEditMode && <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => updateForm("active", e.target.checked)}
                  />
                  {text.active}
                </label>}
              </div>
            </div>
          </div>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving || uncertainCreate && !isEditMode}>
              {saving
                ? isEditMode
                  ? text.updating
                  : text.creating
                : isEditMode
                  ? text.update
                  : text.create}
            </button>

              <button type="button" className="secondary-button" disabled={saving} onClick={handleCancelEdit}>
                {text.cancel}
              </button>
          </div>
        </form>
      </div>
      <aside className="stock-panel">
        <h2>{isEditMode ? text.status : guide.opening}</h2>
        {isEditMode ? <label className="stock-field checkbox-field">
          <input type="checkbox" checked={form.active} onChange={event => updateForm("active", event.target.checked)} />{text.active}
        </label> : <p className="stock-muted">{labels.openingHelp}</p>}
      </aside>
      </div>}

      {view === "list" && <div className="stock-panel product-list-card">
        <h3 ref={productListHeading} tabIndex={-1} id="product-list-heading">{text.listTitle}</h3>

        <div className="product-filters">
          <label className="stock-search">
            {text.search}
            <input
              type="text"
              placeholder={text.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </label>

          <div className="product-filter-actions">
            <button type="button" className="workspace-outline" onClick={() => showView("tools")}>{text.scannerTitle}</button>
          </div>

          <div className="product-category-filters">
            <label className="stock-field">
              {text.category}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setPage(1)
                }}
              >
                <option value="ALL">{text.allCategories}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={handleClearFilters}>
              {text.clearFilters}
            </button>
          </div>
        </div>

        {loading ? <p role="status">{text.loading}</p> :
          filteredProducts.length === 0 ? <p className="stock-empty">{products.length === 0 ? text.empty : text.emptyFiltered}</p> : <>
            <table className="stock-product-table">
              <thead>
                <tr>
                  {listColumns.map(({ key, label }) => {
                    const direction = sort?.key === key ? sort.direction : undefined
                    return (
                      <th key={key} scope="col" aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}>
                        {sortButton(key, label)}
                      </th>
                    )
                  })}
                  <th scope="col" aria-label={labels.view} />
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                    <tr key={product.id}>
                      <th scope="row">{product.name}<small>{product.sku}</small></th>
                      <td>{product.unitName || "-"}</td>
                      <td>{money(product.unitPrice)}</td>
                      <td>
                        {formatNumber(product.currentStock)}
                        {product.unitName ? ` ${product.unitName}` : ""}
                      </td>
                      <td><StockStatus active={product.active}>{product.active ? text.active : text.inactive}</StockStatus></td>
                      <td className="stock-table-actions">
                        <div className="stock-actions">
                          <button type="button" className="workspace-text-action" onClick={() => viewProduct(product)}>{labels.view}</button>
                          <button type="button" className="workspace-text-action" onClick={() => handleEdit(product)}>{text.edit}</button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            <div className="stock-product-card-sort" role="group" aria-label={labels.sortBy}>
              {listColumns.map(({ key, label }) => <span key={key}>{sortButton(key, label, true)}</span>)}
            </div>
            <ul className="stock-product-cards" role="list">{visibleProducts.map(product => (
              <li key={product.id}>
                <div className="stock-panel-heading"><h4>{product.name}</h4>
                  <StockStatus active={product.active}>{product.active ? text.active : text.inactive}</StockStatus>
                </div>
                <p className="stock-muted">{[product.sku, product.unitName].filter(Boolean).join(" · ")}</p>
                <StockFacts entries={[[text.unitPrice, money(product.unitPrice)],
                  [labels.stock, [formatNumber(product.currentStock), product.unitName].filter(Boolean).join(" ")]]} />
                <div className="stock-actions">
                  <button type="button" className="workspace-outline" onClick={() => viewProduct(product)}>{labels.view}</button>
                  <button type="button" className="workspace-text-action" onClick={() => handleEdit(product)}>{text.edit}</button>
                </div>
              </li>
            ))}</ul>
        </>}
        {!loading && (
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            paginationLabel={text.paginationLabel}
            firstPageLabel={text.firstPage}
            previousPageLabel={text.previousPage}
            nextPageLabel={text.nextPage}
            lastPageLabel={text.lastPage}
            onPageChange={setPage}
          />
        )}
      </div>}
    </div>
  )
}

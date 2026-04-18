import { useEffect, useMemo, useState } from "react"
import {
  createProduct,
  getProducts,
  updateProduct,
  type ProductResponse,
} from "../api/productManagementApi"
import { getUnits, type UnitResponse } from "../api/unitApi"
import { useI18n } from "../i18n/I18nContext"
import { formatCurrency, formatNumber } from "../utils/format"
import BarcodeScanner from "../components/sales/BarcodeScanner"

type ProductFormState = {
  barcode: string
  name: string
  description: string
  category: string
  unitPrice: string
  minimumStock: string
  active: boolean
  unitId: string
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
}

export default function ProductsPage() {
  const { language } = useI18n()
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

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  const text = language === "fr"
    ? {
        loadProductsError: "Échec du chargement des produits",
        loadUnitsError: "Échec du chargement des unités",
        barcodeRequired: "Le code-barres est requis",
        nameRequired: "Le nom est requis",
        unitPriceRequired: "Le prix unitaire est requis",
        unitRequired: "L'unité est requise",
        updateSuccess: "Le produit a été mis à jour avec succès",
        createSuccess: "Le produit a été créé avec succès",
        saveError: "Échec de l'enregistrement du produit",
        title: "Produits",
        editTitle: "Modifier le produit",
        newTitle: "Nouveau produit",
        scannerTitle: "Scanner le code-barres",
        closeScanner: "Fermer le scanner",
        openScanner: "Ouvrir le scanner",
        barcode: "Code-barres",
        barcodePlaceholder: "Scanner ou saisir le code-barres",
        name: "Nom",
        description: "Description",
        category: "Catégorie",
        unit: "Unité",
        selectUnit: "Sélectionner une unité",
        unitPrice: "Prix unitaire",
        minimumStock: "Stock minimum",
        active: "Actif",
        updating: "Mise à jour...",
        creating: "Création...",
        update: "Mettre à jour le produit",
        create: "Créer le produit",
        cancel: "Annuler",
        listTitle: "Liste des produits",
        search: "Rechercher",
        searchPlaceholder: "Rechercher par nom, SKU, code-barres, catégorie...",
        clearFilters: "Effacer les filtres",
        allCategories: "Toutes les catégories",
        loading: "Chargement des produits...",
        sku: "SKU",
        referenceCost: "Coût réf.",
        stock: "Stock",
        status: "Statut",
        empty: "Aucun produit trouvé.",
        emptyFiltered: "Aucun produit ne correspond aux filtres actuels.",
        edit: "Modifier",
        inactive: "Inactif",
      }
    : {
        loadProductsError: "Failed to load products",
        loadUnitsError: "Failed to load units",
        barcodeRequired: "Barcode is required",
        nameRequired: "Name is required",
        unitPriceRequired: "Unit price is required",
        unitRequired: "Unit is required",
        updateSuccess: "Product updated successfully",
        createSuccess: "Product created successfully",
        saveError: "Failed to save the product",
        title: "Products",
        editTitle: "Edit product",
        newTitle: "New product",
        scannerTitle: "Scan barcode",
        closeScanner: "Close scanner",
        openScanner: "Open scanner",
        barcode: "Barcode",
        barcodePlaceholder: "Scan or enter the barcode",
        name: "Name",
        description: "Description",
        category: "Category",
        unit: "Unit",
        selectUnit: "Select a unit",
        unitPrice: "Unit price",
        minimumStock: "Minimum stock",
        active: "Active",
        updating: "Updating...",
        creating: "Creating...",
        update: "Update product",
        create: "Create product",
        cancel: "Cancel",
        listTitle: "Product list",
        search: "Search",
        searchPlaceholder: "Search by name, SKU, barcode, category...",
        clearFilters: "Clear filters",
        allCategories: "All categories",
        loading: "Loading products...",
        sku: "SKU",
        referenceCost: "Ref. cost",
        stock: "Stock",
        status: "Status",
        empty: "No products found.",
        emptyFiltered: "No products match the current filters.",
        edit: "Edit",
        inactive: "Inactive",
      }

  const isEditMode = editingProductId !== null

  useEffect(() => {
    loadProducts()
    loadUnits()
  }, [])

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
        product.barcode.toLowerCase().includes(normalizedSearch) ||
        (product.description ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.category ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.unitCode ?? "").toLowerCase().includes(normalizedSearch) ||
        (product.unitName ?? "").toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesSearch
    })
  }, [products, searchTerm, selectedCategory])

  function updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function handleEdit(product: ProductResponse) {
    setEditingProductId(product.id)
    setError("")
    setSuccess("")
    setForm({
      barcode: product.barcode,
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? "",
      unitPrice: String(product.unitPrice),
      minimumStock: String(product.minimumStock),
      active: product.active,
      unitId: product.unitId ? String(product.unitId) : "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleCancelEdit() {
    setEditingProductId(null)
    setForm(emptyForm)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.barcode.trim()) {
      setError(text.barcodeRequired)
      return
    }
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

      const payload = {
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        unitPrice: Number(form.unitPrice),
        minimumStock: Number(form.minimumStock || "0"),
        active: form.active,
        unitId: Number(form.unitId),
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
            <input
              type="text"
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
            />
          </label>

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
                    <td>{product.barcode}</td>
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

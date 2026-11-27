import { useEffect, useState } from "react"
import {
  getCostRubrics,
  updateCostRubricStatus,
  type CompanyCostRubricResponse,
} from "../api/costRubricManagementApi"
import { useI18n } from "../i18n/I18nContext"
import ErrorMessage from "../components/common/ErrorMessage"
import { CompanyCurrencyRequiredError } from "../utils/companyCurrency"
import { getLocalizedCostRubricName } from "../utils/costRubrics"
import { getCostCatalog, type CostCatalogEntry } from "../api/costCatalogApi"
import CostCatalogDialog from "../components/costs/CostCatalogDialog"
import { costCatalogCopy } from "../components/costs/costCatalogCopy"
import { stockWorkspaceCopy } from "../i18n/stockWorkspaceCopy"
import { StockHeading, StockStatus } from "../components/inventory/StockWorkspace"

type SortKey = "name" | "description" | "type" | "status" | "category"
type Sort = { key: SortKey; direction: "asc" | "desc" }

export default function CostRubricsPage({ onBack }: { onBack?: () => void } = {}) {
  const { language } = useI18n()
  const labels = stockWorkspaceCopy[language]
  const [rubrics, setRubrics] = useState<CompanyCostRubricResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [sort, setSort] = useState<Sort | null>(null)
  const [catalog, setCatalog] = useState<CostCatalogEntry[]>([])
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(false)
  const catalogText = costCatalogCopy[language]

  const text = language === "fr"
    ? {
        title: "Rubriques de cout",
        loadError: "Echec du chargement des rubriques de cout",
        nameRequired: "Le nom est requis",
        duplicateName: "Une rubrique de coût porte déjà ce nom. Utilisez la rubrique existante. Si elle a été retirée, retrouvez-la avec « Ajouter ».",
        inactiveDuplicateName: "Une rubrique de coût retirée porte déjà ce nom. Retrouvez-la avec « Ajouter » pour la réutiliser au lieu d’en créer une autre.",
        createSuccess: "La rubrique de cout a ete creee avec succes",
        createError: "Echec de la creation de la rubrique de cout",
        deactivateSuccess: "La rubrique de cout a ete desactivee avec succes",
        activateSuccess: "La rubrique de cout a ete activee avec succes",
        statusError: "Echec de la mise a jour du statut de la rubrique de cout",
        deleteConfirm: (name: string) => `Supprimer definitivement la rubrique de cout ${name} ?`,
        deleteSuccess: "La rubrique de cout a ete supprimee definitivement",
        deleteError: "Echec de la suppression de la rubrique de cout",
        newTitle: "Nouvelle rubrique de cout",
        name: "Nom",
        customNamePlaceholder: "Saisir le nom de la rubrique",
        description: "Description (facultative)",
        descriptionHeading: "Description",
        duplicateWarning: "Avant de créer une rubrique, vérifiez si une rubrique existante couvre déjà le même type de coût. Utilisez-la pour éviter de suivre le même coût dans deux rubriques.",
        create: "Creer la rubrique de cout",
        creating: "Creation...",
        listTitle: "Liste des rubriques de cout",
        loading: "Chargement des rubriques de cout...",
        status: "Statut",
        type: "Type",
        empty: "Aucune rubrique de cout trouvee.",
        system: "Systeme",
        custom: "Personnalisee",
        active: "Actif",
        inactive: "Inactif",
        activate: "Activer",
        deactivate: "Desactiver",
        delete: "Supprimer",
      }
    : language === "es" ? {
        title: "Rúbricas de costo",
        loadError: "No se pudieron cargar las rúbricas de costo",
        nameRequired: "El nombre es obligatorio",
        duplicateName: "Ya existe una rúbrica de costo con ese nombre. Use la existente. Si fue retirada, búsquela con «Añadir».",
        inactiveDuplicateName: "Ya existe una rúbrica de costo retirada con ese nombre. Búsquela con «Añadir» para reutilizarla en lugar de crear otra.",
        createSuccess: "Rúbrica de costo creada",
        createError: "No se pudo crear la rúbrica de costo",
        deactivateSuccess: "Rúbrica de costo desactivada",
        activateSuccess: "Rúbrica de costo activada",
        statusError: "No se pudo actualizar el estado de la rúbrica de costo",
        deleteConfirm: (name: string) => `¿Eliminar definitivamente la rúbrica de costo ${name}?`,
        deleteSuccess: "Rúbrica de costo eliminada definitivamente",
        deleteError: "No se pudo eliminar la rúbrica de costo",
        newTitle: "Nueva rúbrica de costo",
        name: "Nombre",
        customNamePlaceholder: "Escribe el nombre de la rúbrica",
        description: "Descripción (opcional)",
        descriptionHeading: "Descripción",
        duplicateWarning: "Antes de crear una rúbrica, comprueba si ya existe una para el mismo tipo de costo. Úsala para evitar registrar el mismo costo en dos rúbricas.",
        create: "Crear rúbrica de costo",
        creating: "Creando...",
        listTitle: "Lista de rúbricas de costo",
        loading: "Cargando rúbricas de costo...",
        status: "Estado",
        type: "Tipo",
        empty: "No se encontraron rúbricas de costo.",
        system: "Sistema",
        custom: "Personalizada",
        active: "Activa",
        inactive: "Inactiva",
        activate: "Activar",
        deactivate: "Desactivar",
        delete: "Eliminar",
      } : {
        title: "Cost rubrics",
        loadError: "Failed to load cost rubrics",
        nameRequired: "Name is required",
        duplicateName: "A cost rubric with this name already exists. Use the existing rubric. If it was removed, find it using Add.",
        inactiveDuplicateName: "A removed cost rubric with this name already exists. Find it using Add to reuse it instead of creating another.",
        createSuccess: "Cost rubric created successfully",
        createError: "Failed to create the cost rubric",
        deactivateSuccess: "Cost rubric deactivated successfully",
        activateSuccess: "Cost rubric activated successfully",
        statusError: "Failed to update cost rubric status",
        deleteConfirm: (name: string) => `Permanently delete cost rubric ${name}?`,
        deleteSuccess: "Cost rubric permanently deleted",
        deleteError: "Failed to delete the cost rubric",
        newTitle: "New cost rubric",
        name: "Name",
        customNamePlaceholder: "Enter the rubric name",
        description: "Description (optional)",
        descriptionHeading: "Description",
        duplicateWarning: "Before creating a cost rubric, check whether an existing one already covers the same type of cost. Reuse it to avoid tracking the same cost in two rubrics.",
        create: "Create cost rubric",
        creating: "Creating...",
        listTitle: "Cost rubric list",
        loading: "Loading cost rubrics...",
        status: "Status",
        type: "Type",
        empty: "No cost rubrics found.",
        system: "System",
        custom: "Custom",
        active: "Active",
        inactive: "Inactive",
        activate: "Activate",
        deactivate: "Deactivate",
        delete: "Delete",
      }

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: text.name },
    { key: "category", label: catalogText.category },
    { key: "description", label: text.descriptionHeading },
  ]
  const rows = rubrics.filter(rubric => rubric.active).map((rubric) => ({
    rubric,
    name: getLocalizedCostRubricName(rubric.code, rubric.name, language, rubric.catalog),
    category: rubric.catalog ? catalogText.categories[rubric.catalog.category] : catalogText.categories.CUSTOM,
    description: rubric.description || rubric.catalog?.descriptions[language] || "",
    type: rubric.system ? text.system : text.custom,
    status: rubric.active ? text.active : text.inactive,
  }))
  if (sort) {
    const { key, direction } = sort
    const collator = new Intl.Collator(language, { sensitivity: "accent", numeric: true })
    rows.sort((left, right) => (
      collator.compare(left[key], right[key]) * (direction === "asc" ? 1 : -1)
    ))
  }

  useEffect(() => {
    loadRubrics()
  }, [])

  async function loadRubrics() {
    try {
      setLoading(true)
      setError("")
      const [data, available] = await Promise.all([getCostRubrics(), getCostCatalog()])
      setRubrics(data)
      setCatalog(available)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadError)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleRubric(rubric: CompanyCostRubricResponse) {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await updateCostRubricStatus(rubric.id, !rubric.active)

      setSuccess(rubric.active ? text.deactivateSuccess : text.activateSuccess)

      await loadRubrics()
    } catch (err) {
      console.error(err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.statusError)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stock-workspace">
      <StockHeading title={text.title} description={labels.rubricHelp}>
        {onBack && <button type="button" className="workspace-text-action" onClick={onBack}>{labels.backInventory}</button>}
      </StockHeading>

      {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
      {success && <div className="card success">{success}</div>}

      <div className="stock-panel">
        <div className="cost-catalog-heading">
          <h2>{text.listTitle}</h2>
          <div className="form-actions">
            <button type="button" disabled={loading || saving} onClick={() => setAdding(true)}>{catalogText.add}</button>
            <button type="button" className="secondary-button" disabled={loading || saving}
              aria-pressed={removing} onClick={() => setRemoving(value => !value)}>
              {removing ? catalogText.done : catalogText.remove}
            </button>
          </div>
        </div>

        <label className="stock-mobile-sort stock-field">{labels.sortBy}
          <select aria-label={labels.sortBy} value={sort ? `${sort.key}:${sort.direction}` : ""} onChange={event => {
            const [key, direction] = event.target.value.split(":") as [SortKey, "asc" | "desc"]
            setSort(key ? { key, direction } : null)
          }}>
            <option value="">{labels.defaultSort}</option>
            {columns.map(({ key, label }) => <optgroup key={key} label={label}>
              <option value={`${key}:asc`}>{label} · {labels.ascending}</option>
              <option value={`${key}:desc`}>{label} · {labels.descending}</option>
            </optgroup>)}
          </select>
        </label>
        {loading ? (
          <p>{text.loading}</p>
        ) : (
          <table className="cost-catalog-table stock-responsive-rows" role="table">
            <thead>
              <tr>
                {columns.map(({ key, label }) => {
                  const direction = sort?.key === key ? sort.direction : null
                  return (
                    <th key={key} scope="col" aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}>
                      <button type="button" className="table-sort-button" onClick={() => setSort({
                        key,
                        direction: direction === "asc" ? "desc" : "asc",
                      })}>
                        <span>{label}</span>
                        <span aria-hidden="true">{direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}</span>
                      </button>
                    </th>
                  )
                })}
                <th scope="col">{text.status}</th>
                {removing && <th scope="col" aria-label={catalogText.remove} />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={removing ? 5 : 4}>{text.empty}</td>
                </tr>
              ) : (
                rows.map(({ rubric, name, description, category }) => (
                  <tr key={rubric.id} role="row">
                    <th scope="row" role="rowheader">{name}</th>
                    <td role="cell"><span className="stock-cell-label" aria-hidden="true">{catalogText.category}</span>{category}</td>
                    <td role="cell" className="cost-rubric-description"><span className="stock-cell-label" aria-hidden="true">{text.descriptionHeading}</span>{description || labels.notSet}</td>
                    <td role="cell"><StockStatus active>{text.active}</StockStatus></td>
                    {removing && <td role="cell" className="stock-table-actions"><div className="cost-rubric-actions">
                        <button
                          type="button"
                          className="cost-catalog-remove"
                          title={catalogText.remove}
                          aria-label={catalogText.remove + ": " + name}
                          disabled={saving}
                          onClick={() => handleToggleRubric(rubric)}
                        >
                          ×
                        </button>
                      </div></td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        <p className="stock-muted">{labels.rubricHistory}</p>
      </div>
      {adding && <CostCatalogDialog catalog={catalog} rubrics={rubrics} onError={setError}
        onClose={() => setAdding(false)} onSaved={data => { setRubrics(data); setAdding(false); setSuccess("") }} />}
    </div>
  )
}

import { useEffect, useState } from "react"
import {
  createCostRubric,
  deleteCostRubric,
  DuplicateCostRubricNameError,
  getCostRubrics,
  updateCostRubricStatus,
  type CompanyCostRubricResponse,
} from "../api/costRubricManagementApi"
import { useI18n } from "../i18n/I18nContext"
import { getLocalizedCostRubricName } from "../utils/costRubrics"

type FormState = {
  name: string
  description: string
}

type SortKey = "name" | "description" | "type" | "status"
type Sort = { key: SortKey; direction: "asc" | "desc" }

const emptyForm: FormState = {
  name: "",
  description: "",
}

export default function CostRubricsPage() {
  const { language } = useI18n()
  const [rubrics, setRubrics] = useState<CompanyCostRubricResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)
  const [sort, setSort] = useState<Sort | null>(null)

  const text = language === "fr"
    ? {
        title: "Rubriques de cout",
        loadError: "Echec du chargement des rubriques de cout",
        nameRequired: "Le nom est requis",
        duplicateName: "Une rubrique de coût porte déjà ce nom. Vérifiez le nom ou utilisez la rubrique existante. Si elle est inactive, réactivez-la dans la liste.",
        inactiveDuplicateName: "Une rubrique de coût inactive porte déjà ce nom. Cliquez sur « Activer » dans la liste pour la réutiliser au lieu d’en créer une autre.",
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
        duplicateName: "Ya existe una rúbrica de costo con ese nombre. Revisa el nombre o usa la rúbrica existente. Si está inactiva, actívala en la lista.",
        inactiveDuplicateName: "Ya existe una rúbrica de costo inactiva con ese nombre. Selecciona «Activar» en la lista para reutilizarla en lugar de crear otra.",
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
        duplicateName: "A cost rubric with this name already exists. Check the name or use the existing rubric. If it’s inactive, activate it in the list.",
        inactiveDuplicateName: "An inactive cost rubric with this name already exists. Click Activate in the list to reuse it instead of creating a new one.",
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
    { key: "description", label: text.descriptionHeading },
    { key: "type", label: text.type },
    { key: "status", label: text.status },
  ]
  const rows = rubrics.map((rubric) => ({
    rubric,
    name: getLocalizedCostRubricName(rubric.code, rubric.name, language),
    description: rubric.description ?? "",
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
      const data = await getCostRubrics()
      setRubrics(data)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadError)
    } finally {
      setLoading(false)
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const name = form.name.trim()
    if (!name) {
      setError(text.nameRequired)
      return
    }
    const normalizedName = name.toLowerCase()
    const duplicate = rows.find((row) =>
      row.name.trim().toLowerCase() === normalizedName ||
      row.rubric.name.trim().toLowerCase() === normalizedName,
    )
    if (duplicate) {
      setError(duplicate.rubric.active ? text.duplicateName : text.inactiveDuplicateName)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await createCostRubric({
        name,
        description: form.description.trim() || undefined,
      })

      setSuccess(text.createSuccess)
      setForm(emptyForm)
      await loadRubrics()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      if (err instanceof DuplicateCostRubricNameError) {
        setError(text.duplicateName)
      } else {
        console.error(err)
        setError(err instanceof Error ? err.message : text.createError)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleRubric(rubric: CompanyCostRubricResponse) {
    try {
      setError("")
      setSuccess("")

      await updateCostRubricStatus(rubric.id, !rubric.active)

      setSuccess(rubric.active ? text.deactivateSuccess : text.activateSuccess)

      await loadRubrics()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.statusError)
    }
  }

  async function handleDeleteRubric(rubric: CompanyCostRubricResponse) {
    if (rubric.system) return

    const confirmed = window.confirm(text.deleteConfirm(getLocalizedCostRubricName(rubric.code, rubric.name, language)))
    if (!confirmed) return

    try {
      setError("")
      setSuccess("")

      await deleteCostRubric(rubric.id)

      setSuccess(text.deleteSuccess)
      await loadRubrics()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.deleteError)
    }
  }

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error" role="alert">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <h3>{text.newTitle}</h3>

        <p id="cost-rubric-duplicate-warning" className="company-user-warning">{text.duplicateWarning}</p>
        <form onSubmit={handleSubmit} className="product-form-grid" aria-describedby="cost-rubric-duplicate-warning">
          <label>
            {text.name}
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder={text.customNamePlaceholder}
            />
          </label>

          <label>
            {text.description}
            <textarea
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
            />
          </label>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving}>
              {saving ? text.creating : text.create}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>{text.listTitle}</h3>

        {loading ? (
          <p>{text.loading}</p>
        ) : (
          <table>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rubrics.length === 0 ? (
                <tr>
                  <td colSpan={5}>{text.empty}</td>
                </tr>
              ) : (
                rows.map(({ rubric, name, description, type, status }) => (
                  <tr key={rubric.id}>
                    <td>{name}</td>
                    <td className="cost-rubric-description">{description || "\u2014"}</td>
                    <td>{type}</td>
                    <td>{status}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleToggleRubric(rubric)}
                        >
                          {rubric.active ? text.deactivate : text.activate}
                        </button>

                        {!rubric.system && (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleDeleteRubric(rubric)}
                          >
                            {text.delete}
                          </button>
                        )}
                      </div>
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

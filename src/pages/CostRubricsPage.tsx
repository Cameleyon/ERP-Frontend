import { useEffect, useState } from "react"
import {
  createCostRubric,
  deleteCostRubric,
  getCostRubrics,
  updateCostRubricStatus,
  type CompanyCostRubricResponse,
} from "../api/costRubricManagementApi"
import { useI18n } from "../i18n/I18nContext"
import { getLocalizedCostRubricName } from "../utils/costRubrics"

type FormState = {
  name: string
  displayOrder: string
}

const emptyForm: FormState = {
  name: "",
  displayOrder: "0",
}

export default function CostRubricsPage() {
  const { language } = useI18n()
  const [rubrics, setRubrics] = useState<CompanyCostRubricResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)

  const text = language === "fr"
    ? {
        title: "Rubriques de cout",
        loadError: "Echec du chargement des rubriques de cout",
        nameRequired: "Le nom est requis",
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
        displayOrder: "Ordre d'affichage",
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
    : {
        title: "Cost rubrics",
        loadError: "Failed to load cost rubrics",
        nameRequired: "Name is required",
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
        displayOrder: "Display order",
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

    if (!form.name.trim()) {
      setError(text.nameRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await createCostRubric({
        name: form.name.trim(),
        displayOrder: Number(form.displayOrder || "0"),
      })

      setSuccess(text.createSuccess)
      setForm(emptyForm)
      await loadRubrics()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.createError)
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

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <h3>{text.newTitle}</h3>

        <form onSubmit={handleSubmit} className="product-form-grid">
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
            {text.displayOrder}
            <input
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(e) => updateForm("displayOrder", e.target.value)}
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
                <th>{text.name}</th>
                <th>{text.displayOrder}</th>
                <th>{text.type}</th>
                <th>{text.status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rubrics.length === 0 ? (
                <tr>
                  <td colSpan={5}>{text.empty}</td>
                </tr>
              ) : (
                rubrics.map((rubric) => (
                  <tr key={rubric.id}>
                    <td>{getLocalizedCostRubricName(rubric.code, rubric.name, language)}</td>
                    <td>{rubric.displayOrder}</td>
                    <td>{rubric.system ? text.system : text.custom}</td>
                    <td>{rubric.active ? text.active : text.inactive}</td>
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

import { useEffect, useState } from "react"
import {
  createCostRubric,
  getCostRubrics,
  updateCostRubricStatus,
  type CompanyCostRubricResponse,
} from "../api/costRubricManagementApi"
import { useI18n } from "../i18n/I18nContext"

type FormState = {
  code: string
  name: string
  displayOrder: string
}

const emptyForm: FormState = {
  code: "",
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
        title: "Rubriques de coût",
        loadError: "Échec du chargement des rubriques de coût",
        codeRequired: "Le code est requis",
        nameRequired: "Le nom est requis",
        createSuccess: "La rubrique de coût a été créée avec succès",
        createError: "Échec de la création de la rubrique de coût",
        deactivateSuccess: "La rubrique de coût a été désactivée avec succès",
        activateSuccess: "La rubrique de coût a été activée avec succès",
        statusError: "Échec de la mise à jour du statut de la rubrique de coût",
        newTitle: "Nouvelle rubrique de coût",
        code: "Code",
        name: "Nom",
        displayOrder: "Ordre d'affichage",
        create: "Créer la rubrique de coût",
        creating: "Création...",
        listTitle: "Liste des rubriques de coût",
        loading: "Chargement des rubriques de coût...",
        status: "Statut",
        empty: "Aucune rubrique de coût trouvée.",
        active: "Actif",
        inactive: "Inactif",
        activate: "Activer",
        deactivate: "Désactiver",
      }
    : {
        title: "Cost rubrics",
        loadError: "Failed to load cost rubrics",
        codeRequired: "Code is required",
        nameRequired: "Name is required",
        createSuccess: "Cost rubric created successfully",
        createError: "Failed to create the cost rubric",
        deactivateSuccess: "Cost rubric deactivated successfully",
        activateSuccess: "Cost rubric activated successfully",
        statusError: "Failed to update cost rubric status",
        newTitle: "New cost rubric",
        code: "Code",
        name: "Name",
        displayOrder: "Display order",
        create: "Create cost rubric",
        creating: "Creating...",
        listTitle: "Cost rubric list",
        loading: "Loading cost rubrics...",
        status: "Status",
        empty: "No cost rubrics found.",
        active: "Active",
        inactive: "Inactive",
        activate: "Activate",
        deactivate: "Deactivate",
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

    if (!form.code.trim()) {
      setError(text.codeRequired)
      return
    }

    if (!form.name.trim()) {
      setError(text.nameRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await createCostRubric({
        code: form.code.trim().toUpperCase(),
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

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <h3>{text.newTitle}</h3>

        <form onSubmit={handleSubmit} className="product-form-grid">
          <label>
            {text.code}
            <input
              type="text"
              value={form.code}
              onChange={(e) => updateForm("code", e.target.value)}
              placeholder="PURCHASE"
            />
          </label>

          <label>
            {text.name}
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder={language === "fr" ? "Coût d'achat" : "Purchase cost"}
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
                <th>{text.code}</th>
                <th>{text.name}</th>
                <th>{text.displayOrder}</th>
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
                    <td>{rubric.code}</td>
                    <td>{rubric.name}</td>
                    <td>{rubric.displayOrder}</td>
                    <td>{rubric.active ? text.active : text.inactive}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleToggleRubric(rubric)}
                      >
                        {rubric.active ? text.deactivate : text.activate}
                      </button>
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

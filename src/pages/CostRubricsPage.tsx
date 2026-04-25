import { useEffect, useMemo, useState } from "react"
import {
  createCostRubric,
  getCostRubrics,
  updateCostRubricStatus,
  type CompanyCostRubricResponse,
} from "../api/costRubricManagementApi"
import { useI18n } from "../i18n/I18nContext"
import {
  DEFAULT_COST_RUBRIC_OPTIONS,
  getLocalizedCostRubricName,
} from "../utils/costRubrics"

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
  const [presetSelection, setPresetSelection] = useState("")

  const text = language === "fr"
    ? {
        title: "Rubriques de cout",
        loadError: "Echec du chargement des rubriques de cout",
        codeRequired: "Le code est requis",
        nameRequired: "Le nom est requis",
        createSuccess: "La rubrique de cout a ete creee avec succes",
        createError: "Echec de la creation de la rubrique de cout",
        deactivateSuccess: "La rubrique de cout a ete desactivee avec succes",
        activateSuccess: "La rubrique de cout a ete activee avec succes",
        statusError: "Echec de la mise a jour du statut de la rubrique de cout",
        newTitle: "Nouvelle rubrique de cout",
        choosePreset: "Choisir une rubrique",
        otherPreset: "Autre",
        code: "Code",
        name: "Nom",
        customName: "Nom personnalise",
        customNamePlaceholder: "Saisir le nom de la rubrique",
        displayOrder: "Ordre d'affichage",
        create: "Creer la rubrique de cout",
        creating: "Creation...",
        listTitle: "Liste des rubriques de cout",
        loading: "Chargement des rubriques de cout...",
        status: "Statut",
        empty: "Aucune rubrique de cout trouvee.",
        active: "Actif",
        inactive: "Inactif",
        activate: "Activer",
        deactivate: "Desactiver",
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
        choosePreset: "Choose a rubric",
        otherPreset: "Other",
        code: "Code",
        name: "Name",
        customName: "Custom name",
        customNamePlaceholder: "Enter the rubric name",
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

  const availablePresetRubrics = useMemo(() => {
    const existingCodes = new Set(rubrics.map((rubric) => rubric.code))
    return DEFAULT_COST_RUBRIC_OPTIONS.filter((option) => !existingCodes.has(option.code))
  }, [rubrics])

  useEffect(() => {
    loadRubrics()
  }, [])

  function getPresetLabel(code: string) {
    const matchedOption = DEFAULT_COST_RUBRIC_OPTIONS.find((option) => option.code === code)
    if (!matchedOption) {
      return code
    }

    return language === "fr" ? matchedOption.fr : matchedOption.en
  }

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

  function handlePresetSelectionChange(value: string) {
    setPresetSelection(value)

    if (!value) {
      setForm(emptyForm)
      return
    }

    if (value === "OTHER") {
      setForm({
        code: "",
        name: "",
        displayOrder: "0",
      })
      return
    }

    const matchedOption = availablePresetRubrics.find((option) => option.code === value)
    if (!matchedOption) {
      return
    }

    setForm({
      code: matchedOption.code,
      name: language === "fr" ? matchedOption.fr : matchedOption.en,
      displayOrder: String(matchedOption.displayOrder),
    })
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
      setPresetSelection("")
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
            {text.name}
            <select
              value={presetSelection}
              onChange={(e) => handlePresetSelectionChange(e.target.value)}
            >
              <option value="">{text.choosePreset}</option>
              {availablePresetRubrics.map((option) => (
                <option key={option.code} value={option.code}>
                  {getPresetLabel(option.code)}
                </option>
              ))}
              <option value="OTHER">{text.otherPreset}</option>
            </select>
          </label>

          <label>
            {text.code}
            <input
              type="text"
              value={form.code}
              onChange={(e) => updateForm("code", e.target.value)}
              placeholder="COST_OF_GOODS"
              disabled={presetSelection !== "" && presetSelection !== "OTHER"}
            />
          </label>

          <label>
            {presetSelection === "OTHER" ? text.customName : text.name}
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder={text.customNamePlaceholder}
              disabled={presetSelection !== "" && presetSelection !== "OTHER"}
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
                    <td>{getLocalizedCostRubricName(rubric.code, rubric.name, language)}</td>
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

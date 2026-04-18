import { useEffect, useState } from "react"
import {
  createUnit,
  deleteUnit,
  getUnits,
  updateUnit,
  type UnitResponse,
} from "../api/unitManagementApi"
import { useI18n } from "../i18n/I18nContext"

type FormState = {
  code: string
  name: string
}

const emptyForm: FormState = {
  code: "",
  name: "",
}

export default function UnitsPage() {
  const { language } = useI18n()
  const [units, setUnits] = useState<UnitResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null)

  const text = language === "fr"
    ? {
        title: "Unités",
        loadError: "Échec du chargement des unités",
        codeRequired: "Le code est requis",
        nameRequired: "Le nom est requis",
        updateSuccess: "L'unité a été mise à jour avec succès",
        createSuccess: "L'unité a été créée avec succès",
        saveError: "Échec de l'enregistrement de l'unité",
        deleteConfirm: (code: string) => `Supprimer l'unité ${code} ?`,
        deleteSuccess: "L'unité a été supprimée avec succès",
        deleteError: "Échec de la suppression de l'unité",
        editTitle: "Modifier l'unité",
        newTitle: "Nouvelle unité",
        code: "Code",
        name: "Nom",
        savingUpdate: "Mise à jour...",
        savingCreate: "Création...",
        update: "Mettre à jour l'unité",
        create: "Créer l'unité",
        cancel: "Annuler",
        available: "Unités disponibles",
        loading: "Chargement des unités...",
        type: "Type",
        empty: "Aucune unité trouvée.",
        system: "Système",
        custom: "Personnalisée",
        edit: "Modifier",
        delete: "Supprimer",
      }
    : {
        title: "Units",
        loadError: "Failed to load units",
        codeRequired: "Code is required",
        nameRequired: "Name is required",
        updateSuccess: "Unit updated successfully",
        createSuccess: "Unit created successfully",
        saveError: "Failed to save the unit",
        deleteConfirm: (code: string) => `Delete unit ${code}?`,
        deleteSuccess: "Unit deleted successfully",
        deleteError: "Failed to delete the unit",
        editTitle: "Edit unit",
        newTitle: "New unit",
        code: "Code",
        name: "Name",
        savingUpdate: "Updating...",
        savingCreate: "Creating...",
        update: "Update unit",
        create: "Create unit",
        cancel: "Cancel",
        available: "Available units",
        loading: "Loading units...",
        type: "Type",
        empty: "No units found.",
        system: "System",
        custom: "Custom",
        edit: "Edit",
        delete: "Delete",
      }

  const isEditMode = editingUnitId !== null

  useEffect(() => {
    loadUnits()
  }, [])

  async function loadUnits() {
    try {
      setLoading(true)
      setError("")
      const data = await getUnits()
      setUnits(Array.isArray(data) ? data : [])
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

  function handleEdit(unit: UnitResponse) {
    if (unit.system) return

    setEditingUnitId(unit.id)
    setError("")
    setSuccess("")
    setForm({
      code: unit.code,
      name: unit.name,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleCancelEdit() {
    setEditingUnitId(null)
    setForm(emptyForm)
    setError("")
    setSuccess("")
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

      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
      }

      if (isEditMode && editingUnitId !== null) {
        await updateUnit(editingUnitId, payload)
        setSuccess(text.updateSuccess)
      } else {
        await createUnit(payload)
        setSuccess(text.createSuccess)
      }

      setForm(emptyForm)
      setEditingUnitId(null)
      await loadUnits()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(unit: UnitResponse) {
    if (unit.system) return

    const confirmed = window.confirm(text.deleteConfirm(unit.code))
    if (!confirmed) return

    try {
      setError("")
      setSuccess("")
      await deleteUnit(unit.id)
      setSuccess(text.deleteSuccess)

      if (editingUnitId === unit.id) {
        setEditingUnitId(null)
        setForm(emptyForm)
      }

      await loadUnits()
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
        <h3>{isEditMode ? text.editTitle : text.newTitle}</h3>

        <form onSubmit={handleSubmit} className="product-form-grid">
          <label>
            {text.code}
            <input
              type="text"
              value={form.code}
              onChange={(e) => updateForm("code", e.target.value)}
              placeholder="BOTTLE"
            />
          </label>

          <label>
            {text.name}
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder="Bottle"
            />
          </label>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving}>
              {saving
                ? isEditMode
                  ? text.savingUpdate
                  : text.savingCreate
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
        <h3>{text.available}</h3>

        {loading ? (
          <p>{text.loading}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{text.code}</th>
                <th>{text.name}</th>
                <th>{text.type}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={4}>{text.empty}</td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.code}</td>
                    <td>{unit.name}</td>
                    <td>{unit.system ? text.system : text.custom}</td>
                    <td>
                      {!unit.system && (
                        <div className="table-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleEdit(unit)}
                          >
                            {text.edit}
                          </button>

                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleDelete(unit)}
                          >
                            {text.delete}
                          </button>
                        </div>
                      )}
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

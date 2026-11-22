import { useEffect, useId, useRef, useState } from "react"
import { selectCostRubrics, type CostCatalogEntry } from "../../api/costCatalogApi"
import type { CompanyCostRubricResponse } from "../../api/costRubricManagementApi"
import { useI18n } from "../../i18n/I18nContext"
import { costCatalogCopy } from "./costCatalogCopy"

type Props = {
  catalog: CostCatalogEntry[]
  rubrics: CompanyCostRubricResponse[]
  onClose: () => void
  onSaved: (rubrics: CompanyCostRubricResponse[]) => void
  onError: (message: string) => void
}
type Choice = { key: string; name: string; description: string; category: string; code?: string; id?: number; disabled: boolean }

export default function CostCatalogDialog({ catalog, rubrics, onClose, onSaved, onError }: Props) {
  const { language } = useI18n()
  const text = costCatalogCopy[language]
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [category, setCategory] = useState("PURCHASE")
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Choice[]>([])
  const [help, setHelp] = useState<Choice | null>(null)
  const [saving, setSaving] = useState(false)
  const activeCodes = new Set(rubrics.filter(row => row.active).map(row => row.catalog?.code))
  const choices: Choice[] = [
    ...catalog.filter(entry => !activeCodes.has(entry.code)).map(entry => ({
      key: entry.code, code: entry.code, name: entry.names[language], category: entry.category,
      description: entry.descriptions[language], disabled: entry.treatment === "DEDUCT",
    })),
    ...rubrics.filter(row => !row.active && !row.catalog).map(row => ({
      key: "custom:" + row.id, id: row.id, name: row.name, description: row.description || "",
      category: "CUSTOM", disabled: false,
    })),
  ]
  const categoryChoices = choices.filter(choice => choice.category === category)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = dialog.current!
    element.showModal()
    return () => { element.close(); opener?.focus({ preventScroll: true }) }
  }, [])

  function toggle(choice: Choice) {
    if (choice.disabled || saving) return
    setSelected(previous => previous.some(item => item.key === choice.key)
      ? previous.filter(item => item.key !== choice.key) : [...previous, choice])
    setHelp(choice)
  }

  async function save() {
    if (!selected.length || saving) return
    try {
      setSaving(true)
      const data = await selectCostRubrics(selected.flatMap(choice => choice.code ? [choice.code] : []),
        selected.flatMap(choice => choice.id ? [choice.id] : []))
      onSaved(data)
    } catch {
      onError(text.saveError)
    } finally { setSaving(false) }
  }

  return <dialog ref={dialog} className="card cost-catalog-dialog" aria-labelledby={id + "-title"}
    onCancel={event => { event.preventDefault(); if (!saving) onClose() }}>
    <h2 id={id + "-title"}>{text.title}</h2>
    <div className="cost-catalog-fields">
      <div>
        <label htmlFor={id + "-category"}>{text.category}</label>
        <select id={id + "-category"} value={category} disabled={saving} onChange={event => {
          setCategory(event.target.value); setHelp(null); setOpen(false)
        }}>
          {Object.entries(text.categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div>
        <label id={id + "-costs-label"}>{text.costs}</label>
        <button type="button" className="cost-catalog-select" aria-labelledby={id + "-costs-label"}
          aria-expanded={open} aria-controls={id + "-choices"} disabled={saving} onClick={() => setOpen(value => !value)}>
          {text.choose}<span aria-hidden="true">▾</span>
        </button>
        {open && <div id={id + "-choices"} className="cost-catalog-options" role="group" aria-label={text.costs}>
          {!categoryChoices.length && <p>{text.empty}</p>}
          {categoryChoices.map(choice => {
            const checked = selected.some(item => item.key === choice.key)
            return <div className="cost-catalog-option" key={choice.key}
              onMouseEnter={() => setHelp(choice)} onFocus={() => setHelp(choice)}
              title={choice.description + (choice.disabled ? " " + text.unavailable : "")}>
              <label>
                <input type="checkbox" checked={checked} disabled={choice.disabled || saving}
                  onChange={() => toggle(choice)} />
                <span>{choice.name}{choice.disabled && <small>{text.unavailable}</small>}</span>
              </label>
              <button type="button" className="cost-catalog-info" aria-label={text.info + ": " + choice.name}
                onClick={() => setHelp(choice)}>?</button>
            </div>
          })}
        </div>}
      </div>
    </div>
    <div className="cost-catalog-help" aria-live="polite">
      {help ? <><strong>{help.name}</strong><p>{help.description}</p>{help.disabled && <p>{text.unavailable}</p>}</> : <p>{text.duplicate}</p>}
    </div>
    <h3>{text.selected}</h3>
    {!selected.length ? <p>{text.noSelection}</p> : <ul className="cost-catalog-selected">
      {selected.map(choice => <li key={choice.key}>
        <span aria-hidden="true" className="cost-catalog-green">✓</span><span>{choice.name}</span>
        <button type="button" className="cost-catalog-remove" disabled={saving}
          aria-label={text.remove + ": " + choice.name} title={text.remove} onClick={() => toggle(choice)}>×</button>
      </li>)}
    </ul>}
    <div className="form-actions">
      <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>{text.cancel}</button>
      <button type="button" disabled={saving || !selected.length} onClick={() => { void save() }}>
        {saving ? text.saving : text.add}
      </button>
    </div>
  </dialog>
}

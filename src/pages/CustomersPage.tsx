import { useEffect, useMemo, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
  type CustomerResponse,
} from "../api/customerApi"

type FormState = {
  name: string
  phone: string
  email: string
  emailOptIn: boolean
}

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  emailOptIn: false,
}

export default function CustomersPage() {
  const { copy } = useI18n()
  const text = copy.customersPage
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const isEditMode = editingCustomerId !== null

  useEffect(() => {
    void loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      setLoading(true)
      setError("")
      const data = await getCustomers()
      setCustomers(Array.isArray(data) ? data : [])
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

  function handleEdit(customer: CustomerResponse) {
    setEditingCustomerId(customer.id)
    setError("")
    setSuccess("")
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      emailOptIn: customer.emailOptIn,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleCancelEdit() {
    setEditingCustomerId(null)
    setForm(emptyForm)
    setError("")
    setSuccess("")
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

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        emailOptIn: form.emailOptIn,
      }

      if (isEditMode && editingCustomerId !== null) {
        await updateCustomer(editingCustomerId, payload)
        setSuccess(text.updateSuccess)
      } else {
        await createCustomer(payload)
        setSuccess(text.createSuccess)
      }

      setEditingCustomerId(null)
      setForm(emptyForm)
      await loadCustomers()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(customer: CustomerResponse) {
    const confirmed = window.confirm(text.deleteConfirm(customer.name))
    if (!confirmed) {
      return
    }

    try {
      setError("")
      setSuccess("")
      await deleteCustomer(customer.id)
      setSuccess(text.deleteSuccess)

      if (editingCustomerId === customer.id) {
        setEditingCustomerId(null)
        setForm(emptyForm)
      }

      await loadCustomers()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.deleteError)
    }
  }

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return customers
    }

    return customers.filter((customer) =>
      [customer.name, customer.phone ?? "", customer.email ?? ""]
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    )
  }, [customers, searchTerm])

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <h3>{isEditMode ? text.editCustomer : text.newCustomer}</h3>

        <form onSubmit={handleSubmit} className="product-form-grid">
          <label>
            {text.name}
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder={text.namePlaceholder}
            />
          </label>

          <label>
            {text.phone}
            <input
              type="text"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
              placeholder={text.phonePlaceholder}
            />
          </label>

          <label>
            {text.email}
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              placeholder={text.emailPlaceholder}
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.emailOptIn}
              onChange={(e) => updateForm("emailOptIn", e.target.checked)}
            />
            {text.promoOptIn}
          </label>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving}>
              {saving
                ? isEditMode
                  ? text.updating
                  : text.creating
                : isEditMode
                  ? text.updateCustomer
                  : text.createCustomer}
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
        <h3>{text.directory}</h3>

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
        </div>

        {loading ? (
          <p>{text.loading}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{text.name}</th>
                <th>{text.phone}</th>
                <th>{text.email}</th>
                <th>{text.promoEmails}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    {customers.length === 0 ? text.empty : text.emptyFiltered}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone || "-"}</td>
                    <td>{customer.email || "-"}</td>
                    <td>{customer.emailOptIn ? text.allowed : text.denied}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="secondary-button" onClick={() => handleEdit(customer)}>
                          {text.edit}
                        </button>
                        <button type="button" className="danger-button" onClick={() => handleDelete(customer)}>
                          {text.delete}
                        </button>
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

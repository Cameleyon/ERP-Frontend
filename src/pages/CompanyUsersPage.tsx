import { useEffect, useState } from "react"
import {
  createCompanyUser,
  getCompanyUsers,
  type CompanyUserResponse,
} from "../api/companyUsersApi"
import { useI18n } from "../i18n/I18nContext"

type FormState = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "ADMIN" | "CASHIER"
  feeConsentAccepted: boolean
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "CASHIER",
  feeConsentAccepted: false,
}

export default function CompanyUsersPage() {
  const { language } = useI18n()
  const [users, setUsers] = useState<CompanyUserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)

  const text = language === "fr"
    ? {
        title: "Utilisateurs",
        subtitle: "Ajoutez des admins ou caissiers pour votre entreprise.",
        loadError: "Impossible de charger les utilisateurs",
        createError: "Impossible de creer l'utilisateur",
        createSuccess: "Utilisateur cree avec succes",
        firstName: "Prenom",
        lastName: "Nom",
        email: "Email",
        password: "Mot de passe",
        role: "Role",
        admin: "Admin",
        cashier: "Caissier",
        warningTitle: "Impact tarifaire",
        warningMessage:
          "Chaque utilisateur supplementaire cree par un admin augmente les frais de 5 USD. Veuillez confirmer votre consentement avant de continuer.",
        consentLabel:
          "Je comprends et j'accepte l'augmentation de 5 USD pour cet utilisateur supplementaire.",
        consentRequired:
          "Votre consentement est requis avant de creer un utilisateur supplementaire.",
        submit: "Ajouter l'utilisateur",
        submitting: "Ajout...",
        listTitle: "Utilisateurs de l'entreprise",
        loading: "Chargement des utilisateurs...",
        empty: "Aucun utilisateur trouve.",
        name: "Nom",
        status: "Statut",
        active: "Actif",
        inactive: "Inactif",
        consent: "Consentement",
        consentDate: "Date du consentement",
        fee: "Frais",
        yes: "Oui",
        no: "Non",
        notTracked: "Non renseigne",
        required: "Tous les champs sont requis",
      }
    : language === "es"
      ? {
          title: "Usuarios",
          subtitle: "Agrega administradores o cajeros para tu empresa.",
          loadError: "No se pudieron cargar los usuarios",
          createError: "No se pudo crear el usuario",
          createSuccess: "Usuario creado correctamente",
          firstName: "Nombre",
          lastName: "Apellido",
          email: "Correo",
          password: "Contrasena",
          role: "Rol",
          admin: "Administrador",
          cashier: "Cajero",
          warningTitle: "Impacto en la tarifa",
          warningMessage:
            "Cada usuario adicional creado por un administrador aumenta la tarifa en 5 USD. Confirma tu consentimiento antes de continuar.",
          consentLabel:
            "Entiendo y acepto el aumento de 5 USD por este usuario adicional.",
          consentRequired:
            "Tu consentimiento es obligatorio antes de crear un usuario adicional.",
          submit: "Agregar usuario",
          submitting: "Agregando...",
          listTitle: "Usuarios de la empresa",
          loading: "Cargando usuarios...",
          empty: "No se encontraron usuarios.",
          name: "Nombre",
          status: "Estado",
          active: "Activo",
          inactive: "Inactivo",
          consent: "Consentimiento",
          consentDate: "Fecha de consentimiento",
          fee: "Tarifa",
          yes: "Si",
          no: "No",
          notTracked: "No registrado",
          required: "Todos los campos son obligatorios",
        }
      : {
          title: "Users",
          subtitle: "Add admins or cashiers for your company.",
          loadError: "Unable to load users",
          createError: "Unable to create the user",
          createSuccess: "User created successfully",
          firstName: "First name",
          lastName: "Last name",
          email: "Email",
          password: "Password",
          role: "Role",
          admin: "Admin",
          cashier: "Cashier",
          warningTitle: "Fee impact",
          warningMessage:
            "Each additional user created by an admin increases fees by 5 USD. Please confirm your consent before continuing.",
          consentLabel:
            "I understand and accept the 5 USD increase for this additional user.",
          consentRequired:
            "Your consent is required before creating an additional user.",
          submit: "Add user",
          submitting: "Adding...",
          listTitle: "Company users",
          loading: "Loading users...",
          empty: "No users found.",
          name: "Name",
          status: "Status",
          active: "Active",
          inactive: "Inactive",
          consent: "Consent",
          consentDate: "Consent date",
          fee: "Fee",
          yes: "Yes",
          no: "No",
          notTracked: "Not recorded",
          required: "All fields are required",
        }

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      setError("")
      const data = await getCompanyUsers()
      setUsers(data)
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      setError(text.required)
      return
    }

    if (!form.feeConsentAccepted) {
      setError(text.consentRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await createCompanyUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        feeConsentAccepted: form.feeConsentAccepted,
      })

      setSuccess(text.createSuccess)
      setForm(emptyForm)
      await loadUsers()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.createError)
    } finally {
      setSaving(false)
    }
  }

  function formatConsentDate(value: string | null) {
    if (!value) {
      return text.notTracked
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : language === "es" ? "es-ES" : "en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  function getRoleLabel(role: string) {
    return role === "ADMIN" ? text.admin : role === "CASHIER" ? text.cashier : role
  }

  return (
    <div>
      <h1>{text.title}</h1>
      <p>{text.subtitle}</p>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card">
        <h3>{text.title}</h3>

        <div className="company-user-warning">
          <strong>{text.warningTitle}</strong>
          <span>{text.warningMessage}</span>
        </div>

        <form onSubmit={handleSubmit} className="product-form-grid">
          <label>
            {text.firstName}
            <input
              type="text"
              value={form.firstName}
              onChange={(event) => updateForm("firstName", event.target.value)}
            />
          </label>

          <label>
            {text.lastName}
            <input
              type="text"
              value={form.lastName}
              onChange={(event) => updateForm("lastName", event.target.value)}
            />
          </label>

          <label>
            {text.email}
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
            />
          </label>

          <label>
            {text.password}
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
            />
          </label>

          <label>
            {text.role}
            <select
              value={form.role}
              onChange={(event) => updateForm("role", event.target.value as "ADMIN" | "CASHIER")}
            >
              <option value="CASHIER">{text.cashier}</option>
              <option value="ADMIN">{text.admin}</option>
            </select>
          </label>

          <label className="checkbox-field full-width company-user-consent">
            <input
              type="checkbox"
              checked={form.feeConsentAccepted}
              onChange={(event) => updateForm("feeConsentAccepted", event.target.checked)}
            />
            <span>{text.consentLabel}</span>
          </label>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving}>
              {saving ? text.submitting : text.submit}
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
                <th>{text.email}</th>
                <th>{text.role}</th>
                <th>{text.status}</th>
                <th>{text.consent}</th>
                <th>{text.consentDate}</th>
                <th>{text.fee}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7}>{text.empty}</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{getRoleLabel(user.role)}</td>
                    <td>{user.active ? text.active : text.inactive}</td>
                    <td>{user.feeConsentAccepted ? text.yes : text.no}</td>
                    <td>{formatConsentDate(user.feeConsentAcceptedAt)}</td>
                    <td>{user.feeAmountUsd ? `${user.feeAmountUsd} USD` : text.notTracked}</td>
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

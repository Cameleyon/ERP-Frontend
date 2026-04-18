import { useEffect, useState } from "react"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import { useI18n } from "../i18n/I18nContext"
import { getPublicPlans, type PublicPlanResponse } from "../api/publicPlansApi"
import {
  signupCompany,
  type PublicSignupRequest,
} from "../api/publicSignupApi"

type Props = {
  onGoToLogin: () => void
  onGoToHome: () => void
}

type FormState = {
  companyName: string
  businessType: string
  businessTypeOther: string
  phone: string
  companyEmail: string
  address: string
  currencyCode: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
  planCode: string
  billingCycle: "MONTHLY" | "YEARLY"
}

const emptyForm: FormState = {
  companyName: "",
  businessType: "",
  businessTypeOther: "",
  phone: "",
  companyEmail: "",
  address: "",
  currencyCode: "CAD",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPassword: "",
  planCode: "",
  billingCycle: "MONTHLY",
}

const BUSINESS_TYPE_OTHER = "OTHER"

const BUSINESS_TYPE_OPTIONS = [
  "Retail",
  "Wholesale",
  "Restaurant",
  "Pharmacy",
  "Beauty / Salon",
  "Electronics",
  "Construction",
  "Services",
  BUSINESS_TYPE_OTHER,
] as const

export default function PublicSignupPage({ onGoToLogin: _onGoToLogin, onGoToHome }: Props) {
  const { language } = useI18n()
  const [plans, setPlans] = useState<PublicPlanResponse[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)

  const text = language === "fr"
    ? {
        loadPlansError: "Impossible de charger les plans",
        companyNameRequired: "Le nom de l'entreprise est requis",
        adminFirstNameRequired: "Le prénom de l'administrateur est requis",
        adminLastNameRequired: "Le nom de l'administrateur est requis",
        adminEmailRequired: "L'email de l'administrateur est requis",
        adminPasswordRequired: "Le mot de passe de l'administrateur est requis",
        planRequired: "Le plan est requis",
        businessTypeRequired: "Le type d'activité est requis",
        redirecting: "Redirection vers le paiement Stripe...",
        signupFailed: "L'inscription a échoué",
        success: (message: string, adminEmail: string) => `${message}. Votre entreprise a été créée et vous pouvez maintenant vous connecter avec ${adminEmail}.`,
        backHome: "Retour à l'accueil",
        title: "Inscription",
        companyName: "Nom de l'entreprise",
        businessType: "Type d'activité",
        selectBusinessType: "Choisir un type d'activité",
        other: "Autre",
        otherBusinessType: "Autre type d'activité",
        companyEmail: "Email de l'entreprise",
        phone: "Téléphone",
        currency: "Devise",
        address: "Adresse",
        adminFirstName: "Prénom de l'administrateur",
        adminLastName: "Nom de l'administrateur",
        adminEmail: "Email de l'administrateur",
        adminPassword: "Mot de passe de l'administrateur",
        plan: "Plan",
        selectPlan: "Choisir un plan",
        billingCycle: "Cycle de facturation",
        monthly: "Mensuel",
        yearly: "Annuel",
        submit: "Créer le compte de l'entreprise",
        submitting: "Création du compte...",
      }
    : {
        loadPlansError: "Failed to load plans",
        companyNameRequired: "Company name is required",
        adminFirstNameRequired: "Admin first name is required",
        adminLastNameRequired: "Admin last name is required",
        adminEmailRequired: "Admin email is required",
        adminPasswordRequired: "Admin password is required",
        planRequired: "Plan is required",
        businessTypeRequired: "Business type is required",
        redirecting: "Redirecting to Stripe payment...",
        signupFailed: "Signup failed",
        success: (message: string, adminEmail: string) => `${message}. Your company has been created and you can now log in with ${adminEmail}.`,
        backHome: "Back to home",
        title: "Sign Up",
        companyName: "Company name",
        businessType: "Business type",
        selectBusinessType: "Choose a business type",
        other: "Other",
        otherBusinessType: "Other business type",
        companyEmail: "Company email",
        phone: "Phone",
        currency: "Currency",
        address: "Address",
        adminFirstName: "Admin first name",
        adminLastName: "Admin last name",
        adminEmail: "Admin email",
        adminPassword: "Admin password",
        plan: "Plan",
        selectPlan: "Choose a plan",
        billingCycle: "Billing cycle",
        monthly: "Monthly",
        yearly: "Yearly",
        submit: "Create company account",
        submitting: "Creating account...",
      }

  useEffect(() => {
    loadPlans()
  }, [])

  async function loadPlans() {
    try {
      setLoadingPlans(true)
      setError("")
      const data = await getPublicPlans()
      const safePlans = Array.isArray(data) ? data : []
      setPlans(safePlans)

      if (safePlans.length > 0) {
        setForm((prev) => ({
          ...prev,
          planCode: prev.planCode || safePlans[0].code,
        }))
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadPlansError)
    } finally {
      setLoadingPlans(false)
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const resolvedBusinessType =
    form.businessType === BUSINESS_TYPE_OTHER
      ? form.businessTypeOther.trim()
      : form.businessType.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.companyName.trim()) {
      setError(text.companyNameRequired)
      return
    }
    if (!form.adminFirstName.trim()) {
      setError(text.adminFirstNameRequired)
      return
    }
    if (!form.adminLastName.trim()) {
      setError(text.adminLastNameRequired)
      return
    }
    if (!form.adminEmail.trim()) {
      setError(text.adminEmailRequired)
      return
    }
    if (!form.adminPassword.trim()) {
      setError(text.adminPasswordRequired)
      return
    }
    if (!form.planCode) {
      setError(text.planRequired)
      return
    }
    if (!resolvedBusinessType) {
      setError(text.businessTypeRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const payload: PublicSignupRequest = {
        companyName: form.companyName.trim(),
        businessType: resolvedBusinessType,
        phone: form.phone.trim(),
        companyEmail: form.companyEmail.trim(),
        address: form.address.trim(),
        currencyCode: form.currencyCode.trim(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        planCode: form.planCode,
        billingCycle: form.billingCycle,
      }

      const response = await signupCompany(payload)

      if (response.checkoutUrl) {
        setSuccess(text.redirecting)
        window.location.href = response.checkoutUrl
        return
      }

      setSuccess(text.success(response.message, response.adminEmail))
      setForm(emptyForm)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.signupFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="public-page">
      <div className="card">
        <div className="login-language-row">
          <LanguageSwitcher />
        </div>

        <div className="hero-actions">
          <button type="button" className="secondary-button" onClick={onGoToHome}>
            {text.backHome}
          </button>
        </div>

        <h1>{text.title}</h1>

        {error && <div className="card error">{error}</div>}
        {success && <div className="card success">{success}</div>}

        <form onSubmit={handleSubmit} className="product-form-grid">
          <label className="full-width">
            {text.companyName}
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => updateForm("companyName", e.target.value)}
            />
          </label>

          <label>
            {text.businessType}
            <select
              value={form.businessType}
              onChange={(e) => {
                const value = e.target.value
                updateForm("businessType", value)
                if (value !== BUSINESS_TYPE_OTHER) {
                  updateForm("businessTypeOther", "")
                }
              }}
            >
              <option value="">{text.selectBusinessType}</option>
              {BUSINESS_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === BUSINESS_TYPE_OTHER ? text.other : option}
                </option>
              ))}
            </select>
          </label>

          {form.businessType === BUSINESS_TYPE_OTHER && (
            <label>
              {text.otherBusinessType}
              <input
                type="text"
                value={form.businessTypeOther}
                onChange={(e) => updateForm("businessTypeOther", e.target.value)}
              />
            </label>
          )}

          <label>
            {text.companyEmail}
            <input
              type="email"
              value={form.companyEmail}
              onChange={(e) => updateForm("companyEmail", e.target.value)}
            />
          </label>

          <label>
            {text.phone}
            <input
              type="text"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
            />
          </label>

          <label>
            {text.currency}
            <input
              type="text"
              value={form.currencyCode}
              onChange={(e) => updateForm("currencyCode", e.target.value)}
            />
          </label>

          <label className="full-width">
            {text.address}
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
            />
          </label>

          <label>
            {text.adminFirstName}
            <input
              type="text"
              value={form.adminFirstName}
              onChange={(e) => updateForm("adminFirstName", e.target.value)}
            />
          </label>

          <label>
            {text.adminLastName}
            <input
              type="text"
              value={form.adminLastName}
              onChange={(e) => updateForm("adminLastName", e.target.value)}
            />
          </label>

          <label>
            {text.adminEmail}
            <input
              type="email"
              value={form.adminEmail}
              onChange={(e) => updateForm("adminEmail", e.target.value)}
            />
          </label>

          <label>
            {text.adminPassword}
            <input
              type="password"
              value={form.adminPassword}
              onChange={(e) => updateForm("adminPassword", e.target.value)}
            />
          </label>

          <label>
            {text.plan}
            <select
              value={form.planCode}
              onChange={(e) => updateForm("planCode", e.target.value)}
              disabled={loadingPlans}
            >
              <option value="">{text.selectPlan}</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.code}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {text.billingCycle}
            <select
              value={form.billingCycle}
              onChange={(e) =>
                updateForm("billingCycle", e.target.value as "MONTHLY" | "YEARLY")
              }
            >
              <option value="MONTHLY">{text.monthly}</option>
              <option value="YEARLY">{text.yearly}</option>
            </select>
          </label>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving || loadingPlans}>
              {saving ? text.submitting : text.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

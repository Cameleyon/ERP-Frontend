import { useEffect, useMemo, useState } from "react"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import { useI18n } from "../i18n/I18nContext"
import { getPublicPlans, type PublicPlanResponse } from "../api/publicPlansApi"
import {
  confirmSignupCompany,
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

type PendingVerificationState = {
  pendingSignupId: string
  adminEmail: string
  expiresAt: string
  attemptsRemaining: number
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
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [verificationError, setVerificationError] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)
  const [pendingVerification, setPendingVerification] = useState<PendingVerificationState | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const text = language === "fr"
    ? {
        loadPlansError: "Impossible de charger les plans",
        companyNameRequired: "Le nom de l'entreprise est requis",
        adminFirstNameRequired: "Le prenom de l'administrateur est requis",
        adminLastNameRequired: "Le nom de l'administrateur est requis",
        adminEmailRequired: "L'email de l'administrateur est requis",
        adminPasswordRequired: "Le mot de passe de l'administrateur est requis",
        planRequired: "Le plan est requis",
        businessTypeRequired: "Le type d'activite est requis",
        verificationCodeRequired: "Le code de verification est requis",
        redirecting: "Redirection vers le paiement Stripe...",
        signupFailed: "L'inscription a echoue",
        verificationStartSuccess: (email: string) => `Un code a ete envoye a ${email}.`,
        verificationExpired: "Le delai de verification est expire. Veuillez renseigner le formulaire de nouveau.",
        verificationRestart: "La verification a ete annulee. Veuillez renseigner le formulaire de nouveau.",
        success: (message: string, adminEmail: string) => `${message}. Votre entreprise a ete creee et vous pouvez maintenant vous connecter avec ${adminEmail}.`,
        backHome: "Retour a l'accueil",
        title: "Inscription",
        companyName: "Nom de l'entreprise",
        businessType: "Type d'activite",
        selectBusinessType: "Choisir un type d'activite",
        other: "Autre",
        otherBusinessType: "Autre type d'activite",
        companyEmail: "Email de l'entreprise",
        phone: "Telephone",
        currency: "Devise",
        address: "Adresse",
        adminFirstName: "Prenom de l'administrateur",
        adminLastName: "Nom de l'administrateur",
        adminEmail: "Email de l'administrateur",
        adminPassword: "Mot de passe de l'administrateur",
        plan: "Plan",
        selectPlan: "Choisir un plan",
        billingCycle: "Cycle de facturation",
        monthly: "Mensuel",
        yearly: "Annuel",
        submit: "Verifier l'email admin",
        submitting: "Envoi du code...",
        verificationTitle: "Confirmer l'email admin",
        verificationText: (email: string) => `Saisissez le code envoye a ${email}.`,
        verificationHint: "Vous avez 3 essais et 30 secondes.",
        verificationCode: "Code de verification",
        confirmVerification: "Confirmer le code",
        confirmingVerification: "Verification...",
        attemptsRemaining: (count: number) => `Essais restants : ${count}`,
        timeRemaining: (count: number) => `Temps restant : ${count}s`,
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
        verificationCodeRequired: "Verification code is required",
        redirecting: "Redirecting to Stripe payment...",
        signupFailed: "Signup failed",
        verificationStartSuccess: (email: string) => `A code was sent to ${email}.`,
        verificationExpired: "The verification time expired. Please fill in the form again.",
        verificationRestart: "Verification was cancelled. Please fill in the form again.",
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
        submit: "Verify admin email",
        submitting: "Sending code...",
        verificationTitle: "Confirm admin email",
        verificationText: (email: string) => `Enter the code sent to ${email}.`,
        verificationHint: "You have 3 attempts and 30 seconds.",
        verificationCode: "Verification code",
        confirmVerification: "Confirm code",
        confirmingVerification: "Verifying...",
        attemptsRemaining: (count: number) => `Attempts remaining: ${count}`,
        timeRemaining: (count: number) => `Time remaining: ${count}s`,
      }

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (!pendingVerification) {
      setSecondsLeft(0)
      return
    }

    const expiresAt = pendingVerification.expiresAt

    function updateCountdown() {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      )
      setSecondsLeft(remaining)

      if (remaining <= 0) {
        resetSignupFlow(text.verificationExpired)
      }
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 500)
    return () => {
      window.clearInterval(timer)
    }
  }, [pendingVerification, text.verificationExpired])

  const resolvedBusinessType = useMemo(
    () => (
      form.businessType === BUSINESS_TYPE_OTHER
        ? form.businessTypeOther.trim()
        : form.businessType.trim()
    ),
    [form.businessType, form.businessTypeOther],
  )

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

  function resetSignupFlow(message: string) {
    setPendingVerification(null)
    setVerificationCode("")
    setVerificationError("")
    setForm(emptyForm)
    setSuccess("")
    setError(message)
  }

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
      setVerificationError("")

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
      setPendingVerification({
        pendingSignupId: response.pendingSignupId,
        adminEmail: response.adminEmail,
        expiresAt: response.expiresAt,
        attemptsRemaining: response.attemptsRemaining,
      })
      setVerificationCode("")
      setSuccess(text.verificationStartSuccess(response.adminEmail))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.signupFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmVerification(event: React.FormEvent) {
    event.preventDefault()

    if (!pendingVerification) {
      return
    }

    if (!verificationCode.trim()) {
      setVerificationError(text.verificationCodeRequired)
      return
    }

    try {
      setVerifying(true)
      setVerificationError("")
      setError("")
      const response = await confirmSignupCompany({
        pendingSignupId: pendingVerification.pendingSignupId,
        verificationCode: verificationCode.trim(),
      })

      if (!response.verified) {
        if (response.requiresRestart || response.expired) {
          resetSignupFlow(response.message || text.verificationRestart)
          return
        }

        setPendingVerification((current) => current
          ? { ...current, attemptsRemaining: response.attemptsRemaining }
          : current)
        setVerificationError(response.message)
        return
      }

      if (!response.signup) {
        setVerificationError(text.signupFailed)
        return
      }

      setPendingVerification(null)
      setVerificationCode("")

      if (response.signup.checkoutUrl) {
        setSuccess(text.redirecting)
        window.location.href = response.signup.checkoutUrl
        return
      }

      setSuccess(text.success(response.signup.message, response.signup.adminEmail))
      setForm(emptyForm)
    } catch (err) {
      console.error(err)
      setVerificationError(err instanceof Error ? err.message : text.signupFailed)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="public-page" style={{ position: "relative" }}>
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
              disabled={Boolean(pendingVerification)}
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
              disabled={Boolean(pendingVerification)}
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
                disabled={Boolean(pendingVerification)}
              />
            </label>
          )}

          <label>
            {text.companyEmail}
            <input
              type="email"
              value={form.companyEmail}
              onChange={(e) => updateForm("companyEmail", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.phone}
            <input
              type="text"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.currency}
            <input
              type="text"
              value={form.currencyCode}
              onChange={(e) => updateForm("currencyCode", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label className="full-width">
            {text.address}
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.adminFirstName}
            <input
              type="text"
              value={form.adminFirstName}
              onChange={(e) => updateForm("adminFirstName", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.adminLastName}
            <input
              type="text"
              value={form.adminLastName}
              onChange={(e) => updateForm("adminLastName", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.adminEmail}
            <input
              type="email"
              value={form.adminEmail}
              onChange={(e) => updateForm("adminEmail", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.adminPassword}
            <input
              type="password"
              value={form.adminPassword}
              onChange={(e) => updateForm("adminPassword", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.plan}
            <select
              value={form.planCode}
              onChange={(e) => updateForm("planCode", e.target.value)}
              disabled={loadingPlans || Boolean(pendingVerification)}
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
              onChange={(e) => updateForm("billingCycle", e.target.value as "MONTHLY" | "YEARLY")}
              disabled={Boolean(pendingVerification)}
            >
              <option value="MONTHLY">{text.monthly}</option>
              <option value="YEARLY">{text.yearly}</option>
            </select>
          </label>

          <div className="form-actions full-width">
            <button type="submit" disabled={saving || loadingPlans || Boolean(pendingVerification)}>
              {saving ? text.submitting : text.submit}
            </button>
          </div>
        </form>
      </div>

      {pendingVerification && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4, 73, 117, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 20,
          }}
        >
          <div className="card" style={{ width: "min(520px, 100%)", margin: 0 }}>
            <h2>{text.verificationTitle}</h2>
            <p>{text.verificationText(pendingVerification.adminEmail)}</p>
            <p>{text.verificationHint}</p>
            <p><strong>{text.attemptsRemaining(pendingVerification.attemptsRemaining)}</strong></p>
            <p><strong>{text.timeRemaining(secondsLeft)}</strong></p>

            {verificationError && <div className="card error">{verificationError}</div>}

            <form onSubmit={handleConfirmVerification} className="product-form-grid">
              <label className="full-width">
                {text.verificationCode}
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  autoFocus
                />
              </label>

              <div className="form-actions full-width">
                <button type="submit" disabled={verifying || secondsLeft <= 0}>
                  {verifying ? text.confirmingVerification : text.confirmVerification}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

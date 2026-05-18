import { useEffect, useMemo, useState } from "react"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import { useI18n } from "../i18n/I18nContext"
import { getPublicPlans, type PublicPlanResponse } from "../api/publicPlansApi"
import {
  confirmSignupCompany,
  signupCompany,
  type PublicSignupRequest,
} from "../api/publicSignupApi"
import {
  composeStructuredAddress,
  formatCurrentTimeInTimeZone,
  getBrowserTimeZone,
  getCountryOptions,
  getTimeZoneOptions,
  isValidTimeZone,
} from "../utils/companyLocalization"

type Props = {
  onGoToLogin: () => void
  onGoToHome: () => void
}

type FormState = {
  companyName: string
  businessType: string
  businessTypeOther: string
  partnerCode: string
  phone: string
  companyEmail: string
  addressLine1: string
  city: string
  postalCode: string
  country: string
  timeZoneId: string
  currencyCode: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
  planCode: string
  billingCycle: "MONTHLY" | "YEARLY"
  termsAccepted: boolean
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
  partnerCode: "",
  phone: "",
  companyEmail: "",
  addressLine1: "",
  city: "",
  postalCode: "",
  country: "",
  timeZoneId: getBrowserTimeZone(),
  currencyCode: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPassword: "",
  planCode: "",
  billingCycle: "MONTHLY",
  termsAccepted: false,
}

const BUSINESS_TYPE_OTHER = "OTHER"
const CURRENCY_OTHER = "__OTHER__"

const CURRENCY_OPTIONS = [
  "USD",
  "CAD",
  "HTG",
  "DOP",
  "EUR",
  "MXN",
  "GBP",
] as const

const BUSINESS_TYPE_OPTIONS = [
  {
    value: "Retail",
    fr: "Commerce de détail",
    en: "Retail",
    es: "Venta al por menor",
  },
  {
    value: "Wholesale",
    fr: "Vente en gros",
    en: "Wholesale",
    es: "Venta al por mayor",
  },
  {
    value: "Restaurant",
    fr: "Restaurant",
    en: "Restaurant",
    es: "Restaurante",
  },
  {
    value: "Pharmacy",
    fr: "Pharmacie",
    en: "Pharmacy",
    es: "Farmacia",
  },
  {
    value: "Beauty / Salon",
    fr: "Beauté / Salon",
    en: "Beauty / Salon",
    es: "Belleza / Salon",
  },
  {
    value: "Electronics",
    fr: "Électronique",
    en: "Electronics",
    es: "Electronica",
  },
  {
    value: "Construction",
    fr: "Construction",
    en: "Construction",
    es: "Construccion",
  },
  {
    value: "Services",
    fr: "Services",
    en: "Services",
    es: "Servicios",
  },
  {
    value: BUSINESS_TYPE_OTHER,
    fr: "Autre",
    en: "Other",
    es: "Otro",
  },
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
  const [currencySelection, setCurrencySelection] = useState("")
  const [customCurrencyCode, setCustomCurrencyCode] = useState("")
  const [pendingVerification, setPendingVerification] = useState<PendingVerificationState | null>(null)
  const [showTerms, setShowTerms] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [timePreviewTick, setTimePreviewTick] = useState(() => Date.now())

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
        currencyRequired: "La devise est requise",
        verificationCodeRequired: "Le code de vérification est requis",
        termsRequired: "Vous devez accepter les conditions d'utilisation pour continuer",
        redirecting: "Redirection vers le paiement Stripe...",
        signupFailed: "L'inscription a échoué",
        verificationStartSuccess: (email: string) => `Un code a été envoyé à ${email}.`,
        verificationExpired: "Le délai de vérification est expiré. Veuillez renseigner le formulaire de nouveau.",
        verificationRestart: "La vérification a été annulée. Veuillez renseigner le formulaire de nouveau.",
        success: (message: string, adminEmail: string) => `${message}. Votre entreprise a été créée et vous pouvez maintenant vous connecter avec ${adminEmail}.`,
        backHome: "Retour à l'accueil",
        title: "Inscription",
        companyName: "Nom de l'entreprise",
        businessType: "Type d'activité",
        selectBusinessType: "Choisir un type d'activité",
        otherBusinessType: "Autre type d'activité",
        companyEmail: "Email de l'entreprise",
        partnerCode: "Code promoteur ou apporteur d'affaires",
        partnerCodePlaceholder: "Optionnel",
        phone: "Téléphone",
        currency: "Devise",
        selectCurrency: "Choisir une devise",
        otherCurrency: "Autre devise",
        otherCurrencyPlaceholder: "Saisir la devise",
        addressLine1: "Adresse",
        city: "Ville",
        postalCode: "Code postal",
        country: "Pays",
        timeZone: "Fuseau horaire",
        currentTime: "Heure actuelle",
        timeZonePlaceholder: "Ex. America/Port-au-Prince",
        invalidTimeZone: "Fuseau horaire invalide",
        adminFirstName: "Prénom de l'administrateur",
        adminLastName: "Nom de l'administrateur",
        adminEmail: "Email de l'administrateur",
        adminPassword: "Mot de passe de l'administrateur",
        plan: "Plan",
        selectPlan: "Choisir un plan",
        billingCycle: "Cycle de facturation",
        monthly: "Mensuel",
        yearly: "Annuel",
        termsAcceptPrefix: "J'ai lu et j'accepte les",
        termsLink: "conditions d'utilisation",
        termsTitle: "Conditions d'utilisation CAMELEYON ERP",
        termsClose: "Fermer",
        termsParagraphs: [
          "CAMELEYON ERP est fourni par CAMELEYON Dynamics pour aider l'entreprise à gérer ses ventes, son inventaire, ses produits, ses prix, ses clients, ses factures et ses opérations.",
          "L'entreprise confirme que les informations fournies lors de l'inscription sont exactes et que l'administrateur principal est responsable de la gestion des utilisateurs, des accès et des données de l'entreprise.",
          "L'utilisation de la solution peut dépendre d'un abonnement payant. Tout mois commencé est dû. CAMELEYON se réserve le droit de revoir le prix de l'abonnement au besoin, avec information préalable lorsque nécessaire.",
          "L'entreprise demeure responsable des données qu'elle saisit dans la solution. CAMELEYON met en place des mesures raisonnables pour protéger la plateforme, mais l'entreprise doit aussi protéger ses identifiants et l'accès à ses comptes.",
          "Certaines fonctionnalités, comme l'envoi d'e-mails, les paiements automatiques, les rapports ou les intégrations externes, peuvent dépendre de services tiers et de leur disponibilité.",
          "CAMELEYON peut limiter, suspendre ou bloquer l'accès en cas de non-paiement, d'utilisation abusive, de tentative de fraude, d'atteinte à la sécurité ou de violation des présentes conditions.",
          "En créant son compte, l'entreprise accepte ces conditions et comprend qu'elles peuvent être mises à jour au besoin pour tenir compte de l'évolution du service.",
        ],
        submit: "Vérifier l'e-mail admin",
        submitting: "Envoi du code...",
        verificationTitle: "Confirmer l'e-mail admin",
        verificationText: (email: string) => `Saisissez le code envoyé à ${email}.`,
        verificationHint: "Vous avez 3 essais et 30 secondes.",
        verificationCode: "Code de vérification",
        confirmVerification: "Confirmer le code",
        confirmingVerification: "Vérification...",
        attemptsRemaining: (count: number) => `Essais restants : ${count}`,
        timeRemaining: (count: number) => `Temps restant : ${count}s`,
      }
    : language === "es"
      ? {
          loadPlansError: "No fue posible cargar los planes",
          companyNameRequired: "El nombre de la empresa es obligatorio",
          adminFirstNameRequired: "El nombre del administrador es obligatorio",
          adminLastNameRequired: "El apellido del administrador es obligatorio",
          adminEmailRequired: "El correo del administrador es obligatorio",
          adminPasswordRequired: "La contraseña del administrador es obligatoria",
          planRequired: "El plan es obligatorio",
          businessTypeRequired: "El tipo de negocio es obligatorio",
          currencyRequired: "La moneda es obligatoria",
          verificationCodeRequired: "El código de verificación es obligatorio",
          termsRequired: "Debe aceptar los términos de uso para continuar",
          redirecting: "Redirigiendo al pago de Stripe...",
          signupFailed: "El registro falló",
          verificationStartSuccess: (email: string) => `Se envió un código a ${email}.`,
          verificationExpired: "El tiempo de verificación expiró. Complete nuevamente el formulario.",
          verificationRestart: "La verificación fue cancelada. Complete nuevamente el formulario.",
          success: (message: string, adminEmail: string) => `${message}. Su empresa ha sido creada y ahora puede iniciar sesión con ${adminEmail}.`,
          backHome: "Volver al inicio",
          title: "Registro",
          companyName: "Nombre de la empresa",
          businessType: "Tipo de negocio",
          selectBusinessType: "Elegir un tipo de negocio",
          otherBusinessType: "Otro tipo de negocio",
          companyEmail: "Correo de la empresa",
          partnerCode: "Código de promotor o aportador de negocio",
          partnerCodePlaceholder: "Opcional",
          phone: "Teléfono",
          currency: "Moneda",
          selectCurrency: "Elegir una moneda",
          otherCurrency: "Otra moneda",
          otherCurrencyPlaceholder: "Ingrese la moneda",
          addressLine1: "Dirección",
          city: "Ciudad",
          postalCode: "Código postal",
          country: "País",
          timeZone: "Zona horaria",
          currentTime: "Hora actual",
          timeZonePlaceholder: "Ej. America/Port-au-Prince",
          invalidTimeZone: "Zona horaria inválida",
          adminFirstName: "Nombre del administrador",
          adminLastName: "Apellido del administrador",
          adminEmail: "Correo del administrador",
          adminPassword: "Contraseña del administrador",
          plan: "Plan",
          selectPlan: "Elegir un plan",
          billingCycle: "Ciclo de facturación",
          monthly: "Mensual",
          yearly: "Anual",
          termsAcceptPrefix: "He leído y acepto los",
          termsLink: "términos de uso",
          termsTitle: "Términos de uso de CAMELEYON ERP",
          termsClose: "Cerrar",
          termsParagraphs: [
            "CAMELEYON ERP es proporcionado por CAMELEYON Dynamics para ayudar a la empresa a gestionar ventas, inventario, productos, precios, clientes, facturas y operaciones.",
            "La empresa confirma que la información enviada durante el registro es correcta y que el administrador principal es responsable de gestionar usuarios, accesos y datos de la empresa.",
            "El uso de la solución puede depender de una suscripción paga. Todo mes iniciado debe pagarse. CAMELEYON se reserva el derecho de revisar el precio de la suscripción cuando sea necesario, con aviso previo cuando corresponda.",
            "La empresa sigue siendo responsable de los datos que introduce en la solución. CAMELEYON aplica medidas razonables para proteger la plataforma, pero la empresa también debe proteger sus credenciales y el acceso a sus cuentas.",
            "Algunas funciones, como envío de correos, pagos automáticos, informes o integraciones externas, pueden depender de servicios de terceros y de su disponibilidad.",
            "CAMELEYON puede limitar, suspender o bloquear el acceso en caso de falta de pago, uso abusivo, intento de fraude, riesgo de seguridad o incumplimiento de estos términos.",
            "Al crear su cuenta, la empresa acepta estos términos y entiende que pueden actualizarse cuando sea necesario para reflejar la evolución del servicio.",
          ],
          submit: "Verificar correo del administrador",
          submitting: "Enviando código...",
          verificationTitle: "Confirmar correo del administrador",
          verificationText: (email: string) => `Ingrese el código enviado a ${email}.`,
          verificationHint: "Tiene 3 intentos y 30 segundos.",
          verificationCode: "Código de verificación",
          confirmVerification: "Confirmar código",
          confirmingVerification: "Verificando...",
          attemptsRemaining: (count: number) => `Intentos restantes: ${count}`,
          timeRemaining: (count: number) => `Tiempo restante: ${count}s`,
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
          currencyRequired: "Currency is required",
          verificationCodeRequired: "Verification code is required",
          termsRequired: "You must accept the terms of use to continue",
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
          otherBusinessType: "Other business type",
          companyEmail: "Company email",
          partnerCode: "Promoter or business introducer code",
          partnerCodePlaceholder: "Optional",
          phone: "Phone",
          currency: "Currency",
          selectCurrency: "Choose a currency",
          otherCurrency: "Other currency",
          otherCurrencyPlaceholder: "Enter the currency",
          addressLine1: "Address",
          city: "City",
          postalCode: "Postal code",
          country: "Country",
          timeZone: "Time zone",
          currentTime: "Current time",
          timeZonePlaceholder: "Ex. America/Port-au-Prince",
          invalidTimeZone: "Invalid time zone",
          adminFirstName: "Admin first name",
          adminLastName: "Admin last name",
          adminEmail: "Admin email",
          adminPassword: "Admin password",
          plan: "Plan",
          selectPlan: "Choose a plan",
          billingCycle: "Billing cycle",
          monthly: "Monthly",
          yearly: "Yearly",
          termsAcceptPrefix: "I have read and accept the",
          termsLink: "terms of use",
          termsTitle: "CAMELEYON ERP Terms of Use",
          termsClose: "Close",
          termsParagraphs: [
            "CAMELEYON ERP is provided by CAMELEYON Dynamics to help the company manage sales, inventory, products, pricing, customers, invoices, and operations.",
            "The company confirms that the information submitted during signup is accurate and that the main administrator is responsible for managing users, access, and company data.",
            "Use of the solution may depend on a paid subscription. Any month that has started is due. CAMELEYON reserves the right to review subscription pricing when needed, with prior notice when required.",
            "The company remains responsible for the data it enters into the solution. CAMELEYON applies reasonable measures to protect the platform, but the company must also protect credentials and account access.",
            "Some features, such as email delivery, automatic payments, reports, or external integrations, may depend on third-party services and their availability.",
            "CAMELEYON may limit, suspend, or block access in case of non-payment, abusive use, attempted fraud, security risk, or breach of these terms.",
            "By creating an account, the company accepts these terms and understands that they may be updated when needed to reflect the evolution of the service.",
          ],
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

  const localizedBusinessTypeOptions = useMemo(
    () => BUSINESS_TYPE_OPTIONS.map((option) => ({
      value: option.value,
      label: option[language],
    })),
    [language]
  )

  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), [])
  const countryOptions = useMemo(() => getCountryOptions(), [])

  const currentTimePreview = useMemo(
    () => formatCurrentTimeInTimeZone(form.timeZoneId, language),
    [form.timeZoneId, language, timePreviewTick]
  )

  const resolvedBusinessType = useMemo(
    () => (
      form.businessType === BUSINESS_TYPE_OTHER
        ? form.businessTypeOther.trim()
        : form.businessType.trim()
    ),
    [form.businessType, form.businessTypeOther],
  )

  useEffect(() => {
    if (!isValidTimeZone(form.timeZoneId)) {
      return
    }

    const timer = window.setInterval(() => {
      setTimePreviewTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [form.timeZoneId])

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
    setCurrencySelection("")
    setCustomCurrencyCode("")
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
    if (!form.currencyCode.trim()) {
      setError(text.currencyRequired)
      return
    }
    if (!form.termsAccepted) {
      setError(text.termsRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")
      setVerificationError("")

      const composedAddress = composeStructuredAddress({
        addressLine1: form.addressLine1,
        city: form.city,
        postalCode: form.postalCode,
        country: form.country,
      })

      const payload: PublicSignupRequest = {
        companyName: form.companyName.trim(),
        businessType: resolvedBusinessType,
        phone: form.phone.trim(),
        companyEmail: form.companyEmail.trim(),
        partnerCode: form.partnerCode.trim() || undefined,
        address: composedAddress,
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        timeZoneId: form.timeZoneId.trim(),
        currencyCode: form.currencyCode.trim(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        planCode: form.planCode,
        billingCycle: form.billingCycle,
        termsAccepted: form.termsAccepted,
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
      setCurrencySelection("")
      setCustomCurrencyCode("")
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
              {localizedBusinessTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
            <select
              value={currencySelection}
              onChange={(e) => {
                const value = e.target.value
                setCurrencySelection(value)
                if (value === CURRENCY_OTHER) {
                  updateForm("currencyCode", customCurrencyCode)
                  return
                }
                updateForm("currencyCode", value)
              }}
              disabled={Boolean(pendingVerification)}
            >
              <option value="">{text.selectCurrency}</option>
              {CURRENCY_OPTIONS.map((currencyCode) => (
                <option key={currencyCode} value={currencyCode}>
                  {currencyCode}
                </option>
              ))}
              <option value={CURRENCY_OTHER}>{text.otherCurrency}</option>
            </select>
          </label>

          {currencySelection === CURRENCY_OTHER && (
            <label>
              {text.otherCurrency}
              <input
                type="text"
                value={customCurrencyCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase()
                  setCustomCurrencyCode(value)
                  updateForm("currencyCode", value)
                }}
                placeholder={text.otherCurrencyPlaceholder}
                disabled={Boolean(pendingVerification)}
              />
            </label>
          )}

          <label>
            {text.partnerCode}
            <input
              type="text"
              value={form.partnerCode}
              onChange={(e) => updateForm("partnerCode", e.target.value)}
              placeholder={text.partnerCodePlaceholder}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label className="full-width">
            {text.addressLine1}
            <input
              type="text"
              value={form.addressLine1}
              onChange={(e) => updateForm("addressLine1", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.city}
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateForm("city", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.postalCode}
            <input
              type="text"
              value={form.postalCode}
              onChange={(e) => updateForm("postalCode", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
          </label>

          <label>
            {text.country}
            <input
              type="text"
              list="public-signup-country-options"
              value={form.country}
              onChange={(e) => updateForm("country", e.target.value)}
              disabled={Boolean(pendingVerification)}
            />
            <datalist id="public-signup-country-options">
              {countryOptions.map((country) => (
                <option key={country} value={country} />
              ))}
            </datalist>
          </label>

          <label className="full-width">
            {text.timeZone}
            <select
              value={form.timeZoneId}
              onChange={(e) => updateForm("timeZoneId", e.target.value)}
              disabled={Boolean(pendingVerification)}
            >
              {timeZoneOptions.map((timeZoneId) => (
                <option key={timeZoneId} value={timeZoneId}>
                  {timeZoneId}
                </option>
              ))}
            </select>
            <div className="timezone-preview">
              <strong>{text.currentTime}:</strong>{" "}
              {currentTimePreview || text.invalidTimeZone}
            </div>
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

          <label className="full-width terms-acceptance">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => updateForm("termsAccepted", e.target.checked)}
              disabled={Boolean(pendingVerification)}
            />
            <span>
              {text.termsAcceptPrefix}{" "}
              <button type="button" className="link-button" onClick={() => setShowTerms(true)}>
                {text.termsLink}
              </button>
              .
            </span>
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

      {showTerms && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4, 73, 117, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 30,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card terms-dialog" style={{ width: "min(760px, 100%)", margin: 0 }}>
            <h2>{text.termsTitle}</h2>
            <div className="terms-dialog-body">
              {text.termsParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowTerms(false)}>
                {text.termsClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../auth/AuthContext"
import {
  getCompanyProfile,
  updateCompanyProfile,
  type CompanyProfileResponse,
} from "../api/companyProfileApi"
import {
  getCompanySubscription,
  type CompanySubscriptionResponse,
} from "../api/companySubscriptionApi"
import {
  createBillingPortalSession,
  createSetupIntent,
  disableAutomaticCardPayments,
  getPaymentMethodSummary,
  type PaymentMethodSummaryResponse,
} from "../api/companyBillingApi"
import { formatDateTime } from "../utils/format"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import StripePaymentMethodForm from "../components/billing/StripePaymentMethodForm"
import { createCheckoutSession } from "../api/companySubscriptionCheckoutApi"
import { useI18n } from "../i18n/I18nContext"

type FormState = {
  name: string
  businessType: string
  phone: string
  email: string
  address: string
  currencyCode: string
}

const emptyForm: FormState = {
  name: "",
  businessType: "",
  phone: "",
  email: "",
  address: "",
  currencyCode: "CAD",
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

function buildFormState(profile: CompanyProfileResponse | null): FormState {
  if (!profile) {
    return emptyForm
  }

  return {
    name: profile.name || "",
    businessType: profile.businessType || "",
    phone: profile.phone || "",
    email: profile.email || "",
    address: profile.address || "",
    currencyCode: profile.currencyCode || "CAD",
  }
}

export default function ProfilePage() {
  const { refreshUser } = useAuth()
  const { language } = useI18n()
  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null)
  const [subscription, setSubscription] = useState<CompanySubscriptionResponse | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodSummaryResponse | null>(null)
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  const text = language === "fr"
    ? {
        loadError: "Échec du chargement du profil",
        companyNameRequired: "Le nom de l'entreprise est requis",
        saveSuccess: "Le profil a été mis à jour avec succès",
        saveError: "Échec de la mise à jour du profil",
        prepareCardError: "Échec de la préparation de l'enregistrement de la carte",
        missingCheckoutUrl: "L'URL Stripe Checkout n'a pas été renvoyée",
        startPaidError: "Échec du démarrage de l'abonnement payant",
        openPortalError: "Échec de l'ouverture du portail de facturation",
        disableAutoPayError: "Échec de la désactivation du paiement automatique par carte",
        refreshPaymentError: "Échec de l'actualisation de la méthode de paiement",
        refreshPaymentSuccess: "La méthode de paiement a été mise à jour avec succès",
        title: "Profil",
        loading: "Chargement du profil...",
        companyInfo: "Informations de l'entreprise",
        editProfile: "Modifier le profil",
        companyId: "ID entreprise",
        status: "Statut",
        active: "Actif",
        inactive: "Inactif",
        companyName: "Nom de l'entreprise",
        businessType: "Type d'activité",
        phone: "Téléphone",
        email: "E-mail",
        currency: "Devise",
        address: "Adresse",
        cancel: "Annuler",
        saving: "Enregistrement...",
        saveProfile: "Enregistrer le profil",
        subscription: "Abonnement",
        noSubscription: "Aucun abonnement trouvé.",
        plan: "Plan",
        billingMode: "Mode de facturation",
        billingCycle: "Cycle de facturation",
        paymentCollection: "Mode de paiement",
        provider: "Fournisseur",
        accessStart: "Début d'accès",
        accessEnd: "Fin d'accès",
        graceEnd: "Fin de grâce",
        autoRenew: "Renouvellement auto",
        requiresPaymentMethod: "Méthode de paiement requise",
        notes: "Notes",
        yes: "Oui",
        no: "Non",
        paymentMethod: "Méthode de paiement",
        noSubscriptionLoaded: "Aucun abonnement chargé.",
        stripeNotConfigured: "Cette entreprise n'est pas encore configurée pour la facturation Stripe. Vous pouvez enregistrer une carte de crédit maintenant pour créer son compte Stripe et activer le paiement automatique par carte.",
        registerCard: "Enregistrer une carte de crédit",
        preparing: "Préparation...",
        customerId: "ID client",
        defaultPaymentMethodId: "ID méthode par défaut",
        cardBrand: "Marque de la carte",
        last4: "4 derniers chiffres",
        warning: "Le paiement automatique par carte est annulé. À la prochaine date de facturation, le paiement devra être effectué manuellement. Sinon, le compte sera bloqué automatiquement après 10 jours.",
        startPaid: "Démarrer l'abonnement payant",
        resumeAutoPay: "Reprendre le paiement automatique",
        editCard: "Modifier la carte",
        billingPortal: "Ouvrir le portail de facturation",
        stopAutoPay: "Arrêter les paiements automatiques",
      }
    : {
        loadError: "Failed to load profile",
        companyNameRequired: "Company name is required",
        saveSuccess: "Profile updated successfully",
        saveError: "Failed to update profile",
        prepareCardError: "Failed to prepare card setup",
        missingCheckoutUrl: "Stripe Checkout URL was not returned",
        startPaidError: "Failed to start paid subscription",
        openPortalError: "Failed to open billing portal",
        disableAutoPayError: "Failed to disable automatic card payments",
        refreshPaymentError: "Failed to refresh payment method",
        refreshPaymentSuccess: "Payment method updated successfully",
        title: "Profile",
        loading: "Loading profile...",
        companyInfo: "Company information",
        editProfile: "Edit profile",
        companyId: "Company ID",
        status: "Status",
        active: "Active",
        inactive: "Inactive",
        companyName: "Company name",
        businessType: "Business type",
        phone: "Phone",
        email: "Email",
        currency: "Currency",
        address: "Address",
        cancel: "Cancel",
        saving: "Saving...",
        saveProfile: "Save profile",
        subscription: "Subscription",
        noSubscription: "No subscription found.",
        plan: "Plan",
        billingMode: "Billing mode",
        billingCycle: "Billing cycle",
        paymentCollection: "Collection method",
        provider: "Provider",
        accessStart: "Access start",
        accessEnd: "Access end",
        graceEnd: "Grace end",
        autoRenew: "Auto renew",
        requiresPaymentMethod: "Payment method required",
        notes: "Notes",
        yes: "Yes",
        no: "No",
        paymentMethod: "Payment method",
        noSubscriptionLoaded: "No subscription loaded.",
        stripeNotConfigured: "This company is not configured for Stripe billing yet. You can register a credit card now to create its Stripe account and enable automatic card payments.",
        registerCard: "Register credit card",
        preparing: "Preparing...",
        customerId: "Customer ID",
        defaultPaymentMethodId: "Default payment method ID",
        cardBrand: "Card brand",
        last4: "Last 4 digits",
        warning: "Automatic card payment has been cancelled. On the next billing date, payment will need to be made manually. Otherwise, the account will be blocked automatically after 10 days.",
        startPaid: "Start paid subscription",
        resumeAutoPay: "Resume automatic payments",
        editCard: "Edit card",
        billingPortal: "Open billing portal",
        stopAutoPay: "Stop automatic payments",
      }

  useEffect(() => {
    loadData()
  }, [])

  const stripeEnabled = useMemo(() => {
    return subscription?.paymentProvider === "STRIPE" && stripePromise
  }, [subscription])

  const isDirty = useMemo(() => {
    if (!profile) {
      return false
    }

    const initialForm = buildFormState(profile)
    return Object.keys(initialForm).some((key) => {
      const field = key as keyof FormState
      return form[field] !== initialForm[field]
    })
  }, [form, profile])

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const [profileData, subscriptionData] = await Promise.all([
        getCompanyProfile(),
        getCompanySubscription(),
      ])

      setProfile(profileData)
      setSubscription(subscriptionData)
      setForm(buildFormState(profileData))
      setIsEditing(false)

      if (subscriptionData.paymentProvider === "STRIPE") {
        try {
          const paymentMethodData = await getPaymentMethodSummary()
          setPaymentMethod(paymentMethodData)
        } catch (err) {
          console.error(err)
        }
      } else {
        setPaymentMethod(null)
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadError)
    } finally {
      setLoading(false)
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      setError(text.companyNameRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const updatedProfile = await updateCompanyProfile({
        name: form.name.trim(),
        businessType: form.businessType.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        currencyCode: form.currencyCode.trim(),
      })

      setProfile(updatedProfile)
      setForm(buildFormState(updatedProfile))
      setIsEditing(false)
      await refreshUser()
      setSuccess(text.saveSuccess)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.saveError)
    } finally {
      setSaving(false)
    }
  }

  function handleStartEditing() {
    setError("")
    setSuccess("")
    setIsEditing(true)
  }

  function handleCancelEditing() {
    setForm(buildFormState(profile))
    setError("")
    setSuccess("")
    setIsEditing(false)
  }

  async function handlePrepareCardSetup() {
    try {
      setBillingLoading(true)
      setError("")
      setSuccess("")

      const response = await createSetupIntent()
      setSetupIntentClientSecret(response.clientSecret)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.prepareCardError)
    } finally {
      setBillingLoading(false)
    }
  }

  async function handleStartPaidSubscription() {
    try {
      setBillingLoading(true)
      setError("")
      setSuccess("")

      const response = await createCheckoutSession()

      if (!response.url) {
        throw new Error(text.missingCheckoutUrl)
      }

      window.location.href = response.url
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.startPaidError)
    } finally {
      setBillingLoading(false)
    }
  }

  async function handleOpenBillingPortal() {
    try {
      setBillingLoading(true)
      setError("")

      const response = await createBillingPortalSession()
      window.location.href = response.url
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.openPortalError)
    } finally {
      setBillingLoading(false)
    }
  }

  async function handleDisableAutomaticCardPayments() {
    try {
      setBillingLoading(true)
      setError("")
      setSuccess("")

      const response = await disableAutomaticCardPayments()
      await loadData()
      setSuccess(response.message)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.disableAutoPayError)
    } finally {
      setBillingLoading(false)
    }
  }

  async function refreshPaymentMethod() {
    try {
      const paymentMethodData = await getPaymentMethodSummary()
      setPaymentMethod(paymentMethodData)
      setSetupIntentClientSecret("")
      setSuccess(text.refreshPaymentSuccess)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.refreshPaymentError)
    }
  }

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      {loading ? (
        <div className="card">
          <p>{text.loading}</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-actions" style={{ marginBottom: 16, justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{text.companyInfo}</h3>
              {!isEditing && (
                <button type="button" className="secondary-button" onClick={handleStartEditing}>
                  {text.editProfile}
                </button>
              )}
            </div>

            {profile && (
              <div className="detail-grid">
                <p><strong>{text.companyId}:</strong> {profile.companyId}</p>
                <p><strong>{text.status}:</strong> {profile.active ? text.active : text.inactive}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="product-form-grid">
              <label className="full-width">
                {text.companyName}
                <input
                  type="text"
                  value={form.name}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </label>

              <label>
                {text.businessType}
                <input
                  type="text"
                  value={form.businessType}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("businessType", e.target.value)}
                />
              </label>

              <label>
                {text.phone}
                <input
                  type="text"
                  value={form.phone}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("phone", e.target.value)}
                />
              </label>

              <label>
                {text.email}
                <input
                  type="email"
                  value={form.email}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </label>

              <label>
                {text.currency}
                <input
                  type="text"
                  value={form.currencyCode}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("currencyCode", e.target.value)}
                />
              </label>

              <label className="full-width">
                {text.address}
                <input
                  type="text"
                  value={form.address}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("address", e.target.value)}
                />
              </label>

              <div className="form-actions full-width">
                {isEditing && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleCancelEditing}
                    disabled={saving}
                  >
                    {text.cancel}
                  </button>
                )}

                <button type="submit" disabled={!isEditing || !isDirty || saving}>
                  {saving ? text.saving : text.saveProfile}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3>{text.subscription}</h3>

            {!subscription ? (
              <p>{text.noSubscription}</p>
            ) : (
              <div className="detail-grid">
                <p><strong>{text.plan}:</strong> {subscription.planName} ({subscription.planCode})</p>
                <p><strong>{text.status}:</strong> {subscription.status}</p>
                <p><strong>{text.billingMode}:</strong> {subscription.billingMode}</p>
                <p><strong>{text.billingCycle}:</strong> {subscription.billingCycle}</p>
                <p><strong>{text.paymentCollection}:</strong> {subscription.paymentCollectionMethod}</p>
                <p><strong>{text.provider}:</strong> {subscription.paymentProvider}</p>
                <p><strong>{text.accessStart}:</strong> {formatDateTime(subscription.accessStartAt)}</p>
                <p><strong>{text.accessEnd}:</strong> {formatDateTime(subscription.accessEndAt)}</p>
                <p>
                  <strong>{text.graceEnd}:</strong>{" "}
                  {subscription.gracePeriodEndAt ? formatDateTime(subscription.gracePeriodEndAt) : "-"}
                </p>
                <p><strong>{text.autoRenew}:</strong> {subscription.autoRenew ? text.yes : text.no}</p>
                <p>
                  <strong>{text.requiresPaymentMethod}:</strong>{" "}
                  {subscription.requiresPaymentMethod ? text.yes : text.no}
                </p>
                <p className="full-width"><strong>{text.notes}:</strong> {subscription.notes || "-"}</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3>{text.paymentMethod}</h3>

            {!subscription ? (
              <p>{text.noSubscriptionLoaded}</p>
            ) : subscription.paymentProvider !== "STRIPE" ? (
              <>
                <p>{text.stripeNotConfigured}</p>

                <div className="table-actions" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={handleStartPaidSubscription}
                    disabled={billingLoading}
                  >
                    {billingLoading ? text.preparing : text.registerCard}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="detail-grid">
                  <p><strong>{text.provider}:</strong> {paymentMethod?.provider || "STRIPE"}</p>
                  <p><strong>{text.customerId}:</strong> {paymentMethod?.customerId || "-"}</p>
                  <p><strong>{text.defaultPaymentMethodId}:</strong> {paymentMethod?.defaultPaymentMethodId || "-"}</p>
                  <p><strong>{text.cardBrand}:</strong> {paymentMethod?.cardBrand || "-"}</p>
                  <p><strong>{text.last4}:</strong> {paymentMethod?.cardLast4 || "-"}</p>
                </div>

                {!subscription.autoRenew && (
                  <div className="card warning" style={{ marginBottom: 16 }}>
                    {text.warning}
                  </div>
                )}

                <div className="table-actions" style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={handleStartPaidSubscription}
                    disabled={billingLoading}
                  >
                    {billingLoading
                      ? text.preparing
                      : subscription.autoRenew
                        ? text.startPaid
                        : text.resumeAutoPay}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrepareCardSetup}
                    disabled={billingLoading}
                  >
                    {billingLoading ? text.preparing : text.editCard}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleOpenBillingPortal}
                    disabled={billingLoading}
                  >
                    {text.billingPortal}
                  </button>

                  {subscription.autoRenew && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleDisableAutomaticCardPayments}
                      disabled={billingLoading}
                    >
                      {text.stopAutoPay}
                    </button>
                  )}
                </div>

                {setupIntentClientSecret && stripeEnabled && (
                  <Elements stripe={stripePromise} options={{ clientSecret: setupIntentClientSecret }}>
                    <StripePaymentMethodForm
                      clientSecret={setupIntentClientSecret}
                      onSuccess={refreshPaymentMethod}
                    />
                  </Elements>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

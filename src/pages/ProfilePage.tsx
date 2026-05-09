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
import { changePassword, updateUserProfile } from "../api/userAccountApi"
import { createCompanyUser, getCompanyUsers, setCompanyUserActive, type CompanyUserResponse } from "../api/companyUsersApi"
import {
  composeStructuredAddress,
  formatCurrentTimeInTimeZone,
  getBrowserTimeZone,
  getCountryOptions,
  getTimeZoneOptions,
  isValidTimeZone,
} from "../utils/companyLocalization"

type FormState = {
  name: string
  businessType: string
  phone: string
  email: string
  addressLine1: string
  city: string
  postalCode: string
  country: string
  timeZoneId: string
  currencyCode: string
}

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type UserProfileFormState = {
  firstName: string
  lastName: string
  email: string
  currentPassword: string
}

type CompanyUserCreateFormState = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "ADMIN" | "CASHIER"
  feeConsentAccepted: boolean
}

type EditableUserField = "firstName" | "lastName" | "email" | "password" | null

const emptyForm: FormState = {
  name: "",
  businessType: "",
  phone: "",
  email: "",
  addressLine1: "",
  city: "",
  postalCode: "",
  country: "",
  timeZoneId: getBrowserTimeZone(),
  currencyCode: "CAD",
}

const emptyPasswordForm: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

const emptyUserProfileForm: UserProfileFormState = {
  firstName: "",
  lastName: "",
  email: "",
  currentPassword: "",
}

const emptyCompanyUserCreateForm: CompanyUserCreateFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "CASHIER",
  feeConsentAccepted: false,
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
    addressLine1: profile.addressLine1 || "",
    city: profile.city || "",
    postalCode: profile.postalCode || "",
    country: profile.country || "",
    timeZoneId: profile.timeZoneId || getBrowserTimeZone(),
    currencyCode: profile.currencyCode || "CAD",
  }
}

function cleanSubscriptionNotes(notes: string | null | undefined) {
  if (!notes) {
    return "-"
  }

  const visibleNotes = notes
    .split("|")
    .map((note) => note.trim())
    .filter((note) => note && !note.toLowerCase().includes("stripe checkout"))

  return visibleNotes.length > 0 ? visibleNotes.join(" | ") : "-"
}

export default function ProfilePage() {
  const { applySession, refreshUser, user } = useAuth()
  const { language } = useI18n()
  const isAdmin = user?.role === "ADMIN"
  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null)
  const [subscription, setSubscription] = useState<CompanySubscriptionResponse | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodSummaryResponse | null>(null)
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm)
  const [userForm, setUserForm] = useState<UserProfileFormState>(emptyUserProfileForm)
  const [companyUsers, setCompanyUsers] = useState<CompanyUserResponse[]>([])
  const [companyUserCreateForm, setCompanyUserCreateForm] = useState<CompanyUserCreateFormState>(emptyCompanyUserCreateForm)
  const [editingUserField, setEditingUserField] = useState<EditableUserField>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [companyUsersSaving, setCompanyUsersSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [timePreviewTick, setTimePreviewTick] = useState(() => Date.now())

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
        companyLabel: "Entreprise",
        userProfile: "Profil utilisateur",
        firstName: "Prenom",
        lastName: "Nom",
        role: "Role",
        password: "Mot de passe",
        hiddenPassword: "********",
        edit: "Modifier",
        changePassword: "Changer le mot de passe",
        currentPassword: "Mot de passe actuel",
        newPassword: "Nouveau mot de passe",
        confirmPassword: "Confirmer le mot de passe",
        passwordRequired: "Tous les champs de mot de passe sont requis",
        passwordMismatch: "Les nouveaux mots de passe ne correspondent pas",
        passwordTooShort: "Le nouveau mot de passe doit contenir au moins 8 caracteres",
        passwordSuccess: "Mot de passe mis a jour avec succes",
        passwordError: "Echec du changement de mot de passe",
        userProfileSuccess: "Profil utilisateur mis a jour avec succes",
        userProfileError: "Echec de la mise a jour du profil utilisateur",
        emailPasswordRequired: "Le mot de passe actuel est requis pour changer l'email",
        companyInfo: "Informations de l'entreprise",
        usersSectionTitle: "Utilisateurs",
        usersSectionSubtitle: "Ajoutez ou retirez des utilisateurs supplementaires. Tout mois entame reste du, et la prochaine facturation refletera les changements de statut.",
        usersLoadError: "Echec du chargement des utilisateurs",
        usersCreateError: "Echec de la creation de l'utilisateur",
        usersCreateSuccess: "Utilisateur cree avec succes",
        usersUpdateStatusError: "Echec de la mise a jour du statut de l'utilisateur",
        usersUpdateStatusSuccess: "Statut de l'utilisateur mis a jour avec succes",
        additionalUserWarningTitle: "Impact tarifaire",
        additionalUserWarningMessage: "Chaque utilisateur supplementaire actif ajoute 5 USD au prochain cycle de facturation. Si un utilisateur est desactive, le changement sera pris en compte a la prochaine facturation.",
        additionalUserConsentLabel: "Je comprends et j'accepte l'augmentation de 5 USD pour cet utilisateur supplementaire.",
        additionalUserConsentRequired: "Votre consentement est requis avant de creer un utilisateur supplementaire.",
        usersRequired: "Tous les champs de creation d'utilisateur sont requis",
        usersListTitle: "Utilisateurs de l'entreprise",
        addUserTitle: "Ajouter un utilisateur",
        addUserButton: "Ajouter l'utilisateur",
        addUserSubmitting: "Ajout...",
        noUsers: "Aucun utilisateur trouve.",
        consent: "Consentement",
        consentDate: "Date du consentement",
        fee: "Frais",
        notTracked: "Non renseigne",
        deactivate: "Rendre inactif",
        reactivate: "Reactiver",
        cannotDeactivateSelf: "Vous ne pouvez pas desactiver votre propre compte.",
        editProfile: "Modifier le profil",
        status: "Statut",
        active: "Actif",
        inactive: "Inactif",
        companyName: "Nom de l'entreprise",
        businessType: "Type d'activité",
        phone: "Téléphone",
        email: "E-mail",
        city: "Ville",
        postalCode: "Code postal",
        country: "Pays",
        timeZone: "Fuseau horaire",
        currentTime: "Heure actuelle",
        invalidTimeZone: "Fuseau horaire invalide",
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
        additionalUsers: "Utilisateurs supplementaires",
        additionalUserFee: "Frais par utilisateur supplementaire",
        additionalUserTotal: "Supplement total par cycle",
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
        companyLabel: "Company",
        userProfile: "User profile",
        firstName: "First name",
        lastName: "Last name",
        role: "Role",
        password: "Password",
        hiddenPassword: "********",
        edit: "Edit",
        changePassword: "Change password",
        currentPassword: "Current password",
        newPassword: "New password",
        confirmPassword: "Confirm password",
        passwordRequired: "All password fields are required",
        passwordMismatch: "The new passwords do not match",
        passwordTooShort: "The new password must be at least 8 characters",
        passwordSuccess: "Password updated successfully",
        passwordError: "Failed to change password",
        userProfileSuccess: "User profile updated successfully",
        userProfileError: "Failed to update user profile",
        emailPasswordRequired: "Current password is required to change email",
        companyInfo: "Company information",
        usersSectionTitle: "Users",
        usersSectionSubtitle: "Add or remove additional users here. Any started month remains due, and the next billing cycle will reflect status changes.",
        usersLoadError: "Failed to load users",
        usersCreateError: "Failed to create the user",
        usersCreateSuccess: "User created successfully",
        usersUpdateStatusError: "Failed to update the user status",
        usersUpdateStatusSuccess: "User status updated successfully",
        additionalUserWarningTitle: "Fee impact",
        additionalUserWarningMessage: "Each active additional user adds 5 USD to the next billing cycle. If a user is deactivated, the change will be reflected on the next billing cycle.",
        additionalUserConsentLabel: "I understand and accept the 5 USD increase for this additional user.",
        additionalUserConsentRequired: "Your consent is required before creating an additional user.",
        usersRequired: "All user creation fields are required",
        usersListTitle: "Company users",
        addUserTitle: "Add user",
        addUserButton: "Add user",
        addUserSubmitting: "Adding...",
        noUsers: "No users found.",
        consent: "Consent",
        consentDate: "Consent date",
        fee: "Fee",
        notTracked: "Not recorded",
        deactivate: "Deactivate",
        reactivate: "Reactivate",
        cannotDeactivateSelf: "You cannot deactivate your own account.",
        editProfile: "Edit profile",
        status: "Status",
        active: "Active",
        inactive: "Inactive",
        companyName: "Company name",
        businessType: "Business type",
        phone: "Phone",
        email: "Email",
        city: "City",
        postalCode: "Postal code",
        country: "Country",
        timeZone: "Time zone",
        currentTime: "Current time",
        invalidTimeZone: "Invalid time zone",
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
        additionalUsers: "Additional users",
        additionalUserFee: "Fee per additional user",
        additionalUserTotal: "Total extra per cycle",
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

  useEffect(() => {
    setUserForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      currentPassword: "",
    })
  }, [user])

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

  const stripeEnabled = useMemo(() => {
    return subscription?.paymentProvider === "STRIPE" && stripePromise
  }, [subscription])

  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), [])
  const countryOptions = useMemo(() => getCountryOptions(), [])
  const currentTimePreview = useMemo(
    () => formatCurrentTimeInTimeZone(form.timeZoneId, language),
    [form.timeZoneId, language, timePreviewTick]
  )

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

      if (!isAdmin) {
        setProfile(null)
        setSubscription(null)
        setPaymentMethod(null)
        setCompanyUsers([])
        setForm(emptyForm)
        setCompanyUserCreateForm(emptyCompanyUserCreateForm)
        setIsEditing(false)
        return
      }

      const [profileData, subscriptionData, companyUsersData] = await Promise.all([
        getCompanyProfile(),
        getCompanySubscription(),
        getCompanyUsers(),
      ])

      setProfile(profileData)
      setSubscription(subscriptionData)
      setCompanyUsers(companyUsersData)
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

  function updatePasswordForm<K extends keyof PasswordFormState>(key: K, value: PasswordFormState[K]) {
    setPasswordForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateUserForm<K extends keyof UserProfileFormState>(key: K, value: UserProfileFormState[K]) {
    setUserForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateCompanyUserCreateForm<K extends keyof CompanyUserCreateFormState>(
    key: K,
    value: CompanyUserCreateFormState[K]
  ) {
    setCompanyUserCreateForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleStartUserEdit(field: EditableUserField) {
    setError("")
    setSuccess("")
    setEditingUserField(field)
    setUserForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      currentPassword: "",
    })
    setPasswordForm(emptyPasswordForm)
  }

  function handleCancelUserEdit() {
    setEditingUserField(null)
    setPasswordForm(emptyPasswordForm)
    setUserForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      currentPassword: "",
    })
  }

  function formatCompanyUserConsentDate(value: string | null) {
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

  function getCompanyUserRoleLabel(role: string) {
    return role === "ADMIN" ? "ADMIN" : role === "CASHIER" ? "CASHIER" : role
  }

  async function handleCreateCompanyUser(event: React.FormEvent) {
    event.preventDefault()

    if (
      !companyUserCreateForm.firstName.trim() ||
      !companyUserCreateForm.lastName.trim() ||
      !companyUserCreateForm.email.trim() ||
      !companyUserCreateForm.password.trim()
    ) {
      setError(text.usersRequired)
      return
    }

    if (!companyUserCreateForm.feeConsentAccepted) {
      setError(text.additionalUserConsentRequired)
      return
    }

    try {
      setCompanyUsersSaving(true)
      setError("")
      setSuccess("")

      const createdUser = await createCompanyUser({
        firstName: companyUserCreateForm.firstName.trim(),
        lastName: companyUserCreateForm.lastName.trim(),
        email: companyUserCreateForm.email.trim(),
        password: companyUserCreateForm.password,
        role: companyUserCreateForm.role,
        feeConsentAccepted: companyUserCreateForm.feeConsentAccepted,
      })

      setCompanyUsers((prev) => [...prev, createdUser].sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      }))
      setCompanyUserCreateForm(emptyCompanyUserCreateForm)
      const refreshedSubscription = await getCompanySubscription()
      setSubscription(refreshedSubscription)
      setSuccess(text.usersCreateSuccess)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.usersCreateError)
    } finally {
      setCompanyUsersSaving(false)
    }
  }

  async function handleToggleCompanyUserActive(targetUser: CompanyUserResponse, nextActive: boolean) {
    if (!nextActive && targetUser.id === user?.id) {
      setError(text.cannotDeactivateSelf)
      return
    }

    try {
      setCompanyUsersSaving(true)
      setError("")
      setSuccess("")

      const updatedUser = await setCompanyUserActive(targetUser.id, nextActive)
      setCompanyUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)))
      const refreshedSubscription = await getCompanySubscription()
      setSubscription(refreshedSubscription)
      setSuccess(text.usersUpdateStatusSuccess)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.usersUpdateStatusError)
    } finally {
      setCompanyUsersSaving(false)
    }
  }

  async function handleSaveUserProfile() {
    if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.email.trim()) {
      setError(text.userProfileError)
      return
    }

    const emailChanged = user?.email?.toLowerCase() !== userForm.email.trim().toLowerCase()
    if (emailChanged && !userForm.currentPassword.trim()) {
      setError(text.emailPasswordRequired)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const session = await updateUserProfile({
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        email: userForm.email.trim(),
        currentPassword: emailChanged ? userForm.currentPassword : undefined,
      })

      applySession(session)
      setEditingUserField(null)
      setSuccess(text.userProfileSuccess)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.userProfileError)
    } finally {
      setSaving(false)
    }
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

      const composedAddress = composeStructuredAddress({
        addressLine1: form.addressLine1,
        city: form.city,
        postalCode: form.postalCode,
        country: form.country,
      })

      const updatedProfile = await updateCompanyProfile({
        name: form.name.trim(),
        businessType: form.businessType.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: composedAddress,
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        timeZoneId: form.timeZoneId.trim(),
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

  async function handleChangePassword(e?: React.FormEvent) {
    e?.preventDefault()

    if (
      !passwordForm.currentPassword.trim() ||
      !passwordForm.newPassword.trim() ||
      !passwordForm.confirmPassword.trim()
    ) {
      setError(text.passwordRequired)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(text.passwordMismatch)
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setError(text.passwordTooShort)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })

      setPasswordForm(emptyPasswordForm)
      setEditingUserField(null)
      setSuccess(text.passwordSuccess)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.passwordError)
    } finally {
      setSaving(false)
    }
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

  function renderEditableUserRow(
    field: Exclude<EditableUserField, "password" | null>,
    label: string,
    value: string,
    type = "text"
  ) {
    const isEditingField = editingUserField === field

    return (
      <div className="profile-edit-row">
        <div className="profile-edit-content">
          <strong>{label}:</strong>
          {isEditingField ? (
            <>
              <input
                type={type}
                value={userForm[field]}
                onChange={(e) => updateUserForm(field, e.target.value)}
              />
              {field === "email" && (
                <input
                  type="password"
                  placeholder={text.currentPassword}
                  value={userForm.currentPassword}
                  onChange={(e) => updateUserForm("currentPassword", e.target.value)}
                />
              )}
            </>
          ) : (
            <span>{value || "-"}</span>
          )}
        </div>

        <div className="profile-edit-actions">
          {isEditingField ? (
            <>
              <button type="button" onClick={handleSaveUserProfile} disabled={saving}>
                {saving ? text.saving : text.saveProfile}
              </button>
              <button type="button" className="secondary-button" onClick={handleCancelUserEdit} disabled={saving}>
                {text.cancel}
              </button>
            </>
          ) : (
            <button type="button" className="secondary-button" onClick={() => handleStartUserEdit(field)}>
              {text.edit}
            </button>
          )}
        </div>
      </div>
    )
  }

  function renderPasswordRow() {
    const isEditingPassword = editingUserField === "password"

    return (
      <div className="profile-edit-row">
        <div className="profile-edit-content">
          <strong>{text.password}:</strong>
          {isEditingPassword ? (
            <>
              <input
                type="password"
                placeholder={text.currentPassword}
                value={passwordForm.currentPassword}
                onChange={(e) => updatePasswordForm("currentPassword", e.target.value)}
              />
              <input
                type="password"
                placeholder={text.newPassword}
                value={passwordForm.newPassword}
                onChange={(e) => updatePasswordForm("newPassword", e.target.value)}
              />
              <input
                type="password"
                placeholder={text.confirmPassword}
                value={passwordForm.confirmPassword}
                onChange={(e) => updatePasswordForm("confirmPassword", e.target.value)}
              />
            </>
          ) : (
            <span>{text.hiddenPassword}</span>
          )}
        </div>

        <div className="profile-edit-actions">
          {isEditingPassword ? (
            <>
              <button type="button" onClick={handleChangePassword} disabled={saving}>
                {saving ? text.saving : text.changePassword}
              </button>
              <button type="button" className="secondary-button" onClick={handleCancelUserEdit} disabled={saving}>
                {text.cancel}
              </button>
            </>
          ) : (
            <button type="button" className="secondary-button" onClick={() => handleStartUserEdit("password")}>
              {text.edit}
            </button>
          )}
        </div>
      </div>
    )
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
            <h3>{text.companyLabel}</h3>
            <div className="detail-grid">
              <p><strong>{text.companyName}:</strong> {user?.companyName || "-"}</p>
            </div>
          </div>

          <div className="card">
            <h3>{text.userProfile}</h3>
            <div className="profile-edit-list">
              {renderEditableUserRow("firstName", text.firstName, user?.firstName || "")}
              {renderEditableUserRow("lastName", text.lastName, user?.lastName || "")}
              {renderEditableUserRow("email", text.email, user?.email || "", "email")}
              <div className="profile-edit-row">
                <div className="profile-edit-content">
                  <strong>{text.role}:</strong>
                  <span>{user?.role || "-"}</span>
                </div>
              </div>
              {renderPasswordRow()}
            </div>
          </div>

          {isAdmin && (
            <>
          <div className="card">
            <h3>{text.usersSectionTitle}</h3>
            <p>{text.usersSectionSubtitle}</p>

            <div className="company-user-warning">
              <strong>{text.additionalUserWarningTitle}</strong>
              <span>{text.additionalUserWarningMessage}</span>
            </div>

            <form onSubmit={handleCreateCompanyUser} className="product-form-grid">
              <h4 className="full-width" style={{ margin: 0 }}>{text.addUserTitle}</h4>

              <label>
                {text.firstName}
                <input
                  type="text"
                  value={companyUserCreateForm.firstName}
                  onChange={(event) => updateCompanyUserCreateForm("firstName", event.target.value)}
                />
              </label>

              <label>
                {text.lastName}
                <input
                  type="text"
                  value={companyUserCreateForm.lastName}
                  onChange={(event) => updateCompanyUserCreateForm("lastName", event.target.value)}
                />
              </label>

              <label>
                {text.email}
                <input
                  type="email"
                  value={companyUserCreateForm.email}
                  onChange={(event) => updateCompanyUserCreateForm("email", event.target.value)}
                />
              </label>

              <label>
                {text.password}
                <input
                  type="password"
                  value={companyUserCreateForm.password}
                  onChange={(event) => updateCompanyUserCreateForm("password", event.target.value)}
                />
              </label>

              <label>
                {text.role}
                <select
                  value={companyUserCreateForm.role}
                  onChange={(event) => updateCompanyUserCreateForm("role", event.target.value as "ADMIN" | "CASHIER")}
                >
                  <option value="CASHIER">CASHIER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>

              <label className="checkbox-field full-width company-user-consent">
                <input
                  type="checkbox"
                  checked={companyUserCreateForm.feeConsentAccepted}
                  onChange={(event) => updateCompanyUserCreateForm("feeConsentAccepted", event.target.checked)}
                />
                <span>{text.additionalUserConsentLabel}</span>
              </label>

              <div className="form-actions full-width">
                <button type="submit" disabled={companyUsersSaving}>
                  {companyUsersSaving ? text.addUserSubmitting : text.addUserButton}
                </button>
              </div>
            </form>

            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginTop: 0 }}>{text.usersListTitle}</h4>
              <table>
                <thead>
                  <tr>
                    <th>{text.firstName}</th>
                    <th>{text.lastName}</th>
                    <th>{text.email}</th>
                    <th>{text.role}</th>
                    <th>{text.status}</th>
                    <th>{text.consent}</th>
                    <th>{text.consentDate}</th>
                    <th>{text.fee}</th>
                    <th>{text.edit}</th>
                  </tr>
                </thead>
                <tbody>
                  {companyUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9}>{text.noUsers}</td>
                    </tr>
                  ) : (
                    companyUsers.map((companyUser) => (
                      <tr key={companyUser.id}>
                        <td>{companyUser.firstName}</td>
                        <td>{companyUser.lastName}</td>
                        <td>{companyUser.email}</td>
                        <td>{getCompanyUserRoleLabel(companyUser.role)}</td>
                        <td>{companyUser.active ? text.active : text.inactive}</td>
                        <td>{companyUser.feeConsentAccepted ? text.yes : text.no}</td>
                        <td>{formatCompanyUserConsentDate(companyUser.feeConsentAcceptedAt)}</td>
                        <td>{companyUser.feeAmountUsd ? `${companyUser.feeAmountUsd} USD` : text.notTracked}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={companyUsersSaving || companyUser.id === user?.id}
                            onClick={() => handleToggleCompanyUserActive(companyUser, !companyUser.active)}
                          >
                            {companyUser.active ? text.deactivate : text.reactivate}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
                  value={form.addressLine1}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("addressLine1", e.target.value)}
                />
              </label>

              <label>
                {text.city}
                <input
                  type="text"
                  value={form.city}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("city", e.target.value)}
                />
              </label>

              <label>
                {text.postalCode}
                <input
                  type="text"
                  value={form.postalCode}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("postalCode", e.target.value)}
                />
              </label>

              <label>
                {text.country}
                <input
                  type="text"
                  list="profile-country-options"
                  value={form.country}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("country", e.target.value)}
                />
                <datalist id="profile-country-options">
                  {countryOptions.map((country) => (
                    <option key={country} value={country} />
                  ))}
                </datalist>
              </label>

              <label className="full-width">
                {text.timeZone}
                <select
                  value={form.timeZoneId}
                  disabled={!isEditing}
                  onChange={(e) => updateForm("timeZoneId", e.target.value)}
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
                <p><strong>{text.additionalUsers}:</strong> {subscription.additionalUserCount ?? 0}</p>
                <p>
                  <strong>{text.additionalUserFee}:</strong>{" "}
                  {subscription.additionalUserFeePerCycleUsd
                    ? `${subscription.additionalUserFeePerCycleUsd} USD`
                    : "-"}
                </p>
                <p>
                  <strong>{text.additionalUserTotal}:</strong>{" "}
                  {subscription.additionalUserTotalFeeUsd
                    ? `${subscription.additionalUserTotalFeeUsd} USD`
                    : "-"}
                </p>
                <p className="full-width"><strong>{text.notes}:</strong> {cleanSubscriptionNotes(subscription.notes)}</p>
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
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import { useAuth } from "../auth/AuthContext"
import {
  activateCompanyUser,
  createManagedCompany,
  createCompanyUser,
  createSubscriptionPlan,
  deactivateCompanyUser,
  extendCompanyAccess,
  getCompanySubscription,
  getCompanyUsers,
  getSubscriptionPlans,
  searchCompanySubscriptions,
  suspendCompanySubscription,
  unsuspendCompanySubscription,
  type CompanySubscriptionResponse,
  type CompanyUserResponse,
  type CreateCompanyUserRequest,
  type CreateManagedCompanyRequest,
  type CreateSubscriptionPlanRequest,
  type SubscriptionPlanResponse,
} from "../api/platformAdminApi"
import { useI18n } from "../i18n/I18nContext"
import { formatCurrency } from "../utils/format"

type PlanFormState = {
  code: string
  name: string
  description: string
  monthlyPrice: string
  yearlyPrice: string
  displayOrder: string
  active: boolean
  publicVisible: boolean
}

type CompanyFormState = {
  name: string
  businessType: string
  phone: string
  email: string
  address: string
  currencyCode: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
  planCode: string
  billingMode: "AUTOMATIC_CARD" | "MANUAL"
  billingCycle: "MONTHLY" | "YEARLY"
  paymentCollectionMethod: "CARD" | "INVOICE" | "BANK_TRANSFER" | "CASH" | "OTHER"
  paymentProvider: "STRIPE" | "NONE"
  accessStartAt: string
  accessEndAt: string
  autoRenew: boolean
  requiresPaymentMethod: boolean
  notes: string
}

type CompanyUserFormState = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "ADMIN" | "CASHIER"
}

function createDefaultPlanForm(): PlanFormState {
  return {
    code: "",
    name: "",
    description: "",
    monthlyPrice: "",
    yearlyPrice: "",
    displayOrder: "",
    active: true,
    publicVisible: true,
  }
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const adjusted = new Date(date.getTime() - offset * 60000)
  return adjusted.toISOString().slice(0, 16)
}

function createDefaultCompanyForm(): CompanyFormState {
  const start = new Date()
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)

  return {
    name: "",
    businessType: "",
    phone: "",
    email: "",
    address: "",
    currencyCode: "USD",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
    planCode: "",
    billingMode: "MANUAL",
    billingCycle: "MONTHLY",
    paymentCollectionMethod: "INVOICE",
    paymentProvider: "NONE",
    accessStartAt: toLocalInputValue(start),
    accessEndAt: toLocalInputValue(end),
    autoRenew: false,
    requiresPaymentMethod: false,
    notes: "",
  }
}

function createDefaultCompanyUserForm(): CompanyUserFormState {
  return {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "CASHIER",
  }
}

function toOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined
  }
  return Number(value)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default function PlatformConsolePage() {
  const { logoutUser } = useAuth()
  const { language } = useI18n()
  const [plans, setPlans] = useState<SubscriptionPlanResponse[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState("")
  const [planSuccess, setPlanSuccess] = useState("")
  const [companySuccess, setCompanySuccess] = useState("")
  const [subscriptionError, setSubscriptionError] = useState("")
  const [actionSuccess, setActionSuccess] = useState("")
  const [planSubmitting, setPlanSubmitting] = useState(false)
  const [companySubmitting, setCompanySubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState("")
  const [companyLookupId, setCompanyLookupId] = useState("")
  const [subscriptionSearch, setSubscriptionSearch] = useState("")
  const [subscriptionResults, setSubscriptionResults] = useState<CompanySubscriptionResponse[]>([])
  const [subscriptionSearchLoading, setSubscriptionSearchLoading] = useState(false)
  const [subscriptionSearchError, setSubscriptionSearchError] = useState("")
  const [extensionDays, setExtensionDays] = useState("30")
  const [actionReason, setActionReason] = useState("")
  const [subscription, setSubscription] = useState<CompanySubscriptionResponse | null>(null)
  const [companyUsers, setCompanyUsers] = useState<CompanyUserResponse[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")
  const [userSuccess, setUserSuccess] = useState("")
  const [userSubmitting, setUserSubmitting] = useState(false)
  const [userActionLoading, setUserActionLoading] = useState("")
  const [planForm, setPlanForm] = useState<PlanFormState>(createDefaultPlanForm)
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(createDefaultCompanyForm)
  const [companyUserForm, setCompanyUserForm] = useState<CompanyUserFormState>(createDefaultCompanyUserForm)

  const text = language === "fr"
    ? {
        loadPlansError: "Impossible de charger les plans",
        createPlanSuccess: "Le plan d'abonnement a été créé avec succès.",
        createPlanError: "Impossible de créer le plan",
        createCompanySuccess: (id: number) => `Entreprise créée avec succès avec l'ID ${id}.`,
        createCompanyError: "Impossible de créer l'entreprise",
        loadUsersError: "Impossible de charger les utilisateurs de l'entreprise",
        createUserSuccess: "Utilisateur créé avec succès.",
        createUserError: "Impossible de créer l'utilisateur",
        userStatusSuccess: "Statut utilisateur mis à jour.",
        userStatusError: "Impossible de modifier le statut utilisateur",
        userCompanyRequired: "Chargez une entreprise avant d'ajouter un utilisateur.",
        searchSubscriptionsError: "Impossible de charger la liste des abonnements",
        companyIdRequired: "Saisissez un ID entreprise pour charger un abonnement.",
        loadSubscriptionError: "Impossible de charger l'abonnement",
        extendMissing: "Chargez un abonnement avant de prolonger l'accès.",
        extendSuccess: "Accès prolongé avec succès.",
        extendError: "Impossible de prolonger l'accès",
        suspendMissing: "Chargez un abonnement avant de le suspendre.",
        suspendSuccess: "Abonnement suspendu avec succès.",
        suspendError: "Impossible de suspendre l'abonnement",
        unsuspendMissing: "Chargez un abonnement avant de le réactiver.",
        unsuspendSuccess: "Abonnement réactivé avec succès.",
        unsuspendError: "Impossible de réactiver l'abonnement",
        platformConsole: "Console plateforme",
        platformManagement: "Gestion de la plateforme",
        createManagedCompanyButton: "Créer l'entreprise",
        logout: "Déconnexion",
        companyUsers: "Utilisateurs de l'entreprise",
        addCompanyUser: "Ajouter un utilisateur",
        userFirstName: "Prénom",
        userLastName: "Nom",
        userEmail: "Email",
        userPassword: "Mot de passe",
        userRole: "Rôle",
        adding: "Ajout...",
        addUser: "Ajouter l'utilisateur",
        noUsersYet: "Aucun utilisateur trouvé pour cette entreprise.",
        activate: "Activer",
        deactivate: "Désactiver",
        status: "Statut",
        action: "Action",
        plans: "Plans",
        subscriptionCatalog: "Catalogue d'abonnement",
        refreshing: "Actualisation...",
        refresh: "Actualiser",
        loadingPlans: "Chargement des plans...",
        noPlansYet: "Aucun plan pour le moment. Créez le premier ici.",
        active: "Actif",
        inactive: "Inactif",
        noDescription: "Aucune description fournie.",
        monthly: "Mensuel",
        yearly: "Annuel",
        create: "Création",
        newSubscriptionPlan: "Nouveau plan d'abonnement",
        planCode: "Code plan",
        planName: "Nom du plan",
        description: "Description",
        monthlyPrice: "Prix mensuel",
        yearlyPrice: "Prix annuel",
        displayOrder: "Ordre d'affichage",
        publicVisible: "Visible publiquement",
        creating: "Création...",
        createPlan: "Créer le plan",
        onboarding: "Onboarding",
        createManagedCompany: "Créer une entreprise",
        companyName: "Nom de l'entreprise",
        businessType: "Type d'activité",
        phone: "Téléphone",
        companyEmail: "Email entreprise",
        address: "Adresse",
        currency: "Devise",
        adminFirstName: "Prénom admin",
        adminLastName: "Nom admin",
        adminEmail: "Email admin",
        adminPassword: "Mot de passe admin",
        plan: "Plan",
        selectPlan: "Sélectionner un plan",
        billingMode: "Mode de facturation",
        manual: "Manuel",
        automaticCard: "Carte automatique",
        billingCycle: "Cycle de facturation",
        collectionMethod: "Mode de collecte",
        invoice: "Facture",
        card: "Carte",
        bankTransfer: "Virement bancaire",
        cash: "Cash",
        other: "Autre",
        paymentProvider: "Fournisseur de paiement",
        none: "Aucun",
        accessStart: "Début d'accès",
        accessEnd: "Fin d'accès",
        autoRenew: "Renouvellement auto",
        requiresPaymentMethod: "Méthode de paiement requise",
        notes: "Notes",
        control: "Contrôle",
        manageCompanySubscription: "Gérer l'abonnement d'une entreprise",
        findSubscription: "Trouver un abonnement",
        searchByCompanyName: "Rechercher par nom d'entreprise",
        searchSubscriptions: "Rechercher",
        listAllSubscriptions: "Lister tout",
        companyNamePlaceholder: "Nom de la compagnie",
        noSubscriptionsFound: "Aucun abonnement trouvé.",
        loadThisSubscription: "Charger",
        companyId: "ID entreprise",
        loading: "Chargement...",
        loadSubscription: "Charger l'abonnement",
        accessWindow: "Fenêtre d'accès",
        collection: "Collecte",
        provider: "Fournisseur",
        yes: "Oui",
        no: "Non",
        actionReason: "Raison de l'action",
        actionReasonPlaceholder: "Note optionnelle pour prolonger, suspendre ou réactiver",
        extendByDays: "Prolonger de",
        extending: "Prolongation...",
        extendAccess: "Prolonger l'accès",
        suspending: "Suspension...",
        suspend: "Suspendre",
        reactivating: "Réactivation...",
        unsuspend: "Réactiver",
        notesLabel: "Notes",
        emptySubscription: "Chargez un abonnement par ID entreprise pour prolonger l'accès ou changer l'état de suspension.",
      }
    : {
        loadPlansError: "Failed to load plans",
        createPlanSuccess: "Subscription plan created successfully.",
        createPlanError: "Failed to create plan",
        createCompanySuccess: (id: number) => `Company created successfully with company ID ${id}.`,
        createCompanyError: "Failed to create company",
        loadUsersError: "Failed to load company users",
        createUserSuccess: "User created successfully.",
        createUserError: "Failed to create user",
        userStatusSuccess: "User status updated.",
        userStatusError: "Failed to update user status",
        userCompanyRequired: "Load a company before adding a user.",
        searchSubscriptionsError: "Failed to load subscriptions",
        companyIdRequired: "Enter a company ID to load a subscription.",
        loadSubscriptionError: "Failed to load subscription",
        extendMissing: "Load a company subscription before extending access.",
        extendSuccess: "Access extended successfully.",
        extendError: "Failed to extend access",
        suspendMissing: "Load a company subscription before suspending it.",
        suspendSuccess: "Subscription suspended successfully.",
        suspendError: "Failed to suspend subscription",
        unsuspendMissing: "Load a company subscription before reactivating it.",
        unsuspendSuccess: "Subscription reactivated successfully.",
        unsuspendError: "Failed to reactivate subscription",
        platformConsole: "Platform Console",
        platformManagement: "Platform management",
        createManagedCompanyButton: "Create company",
        logout: "Logout",
        companyUsers: "Company users",
        addCompanyUser: "Add a user",
        userFirstName: "First name",
        userLastName: "Last name",
        userEmail: "Email",
        userPassword: "Password",
        userRole: "Role",
        adding: "Adding...",
        addUser: "Add user",
        noUsersYet: "No users found for this company.",
        activate: "Activate",
        deactivate: "Deactivate",
        status: "Status",
        action: "Action",
        plans: "Plans",
        subscriptionCatalog: "Subscription catalog",
        refreshing: "Refreshing...",
        refresh: "Refresh",
        loadingPlans: "Loading plans...",
        noPlansYet: "No plans yet. Create the first one here.",
        active: "Active",
        inactive: "Inactive",
        noDescription: "No description provided.",
        monthly: "Monthly",
        yearly: "Yearly",
        create: "Create",
        newSubscriptionPlan: "New subscription plan",
        planCode: "Plan code",
        planName: "Plan name",
        description: "Description",
        monthlyPrice: "Monthly price",
        yearlyPrice: "Yearly price",
        displayOrder: "Display order",
        publicVisible: "Publicly visible",
        creating: "Creating...",
        createPlan: "Create plan",
        onboarding: "Onboarding",
        createManagedCompany: "Create a company",
        companyName: "Company name",
        businessType: "Business type",
        phone: "Phone",
        companyEmail: "Company email",
        address: "Address",
        currency: "Currency",
        adminFirstName: "Admin first name",
        adminLastName: "Admin last name",
        adminEmail: "Admin email",
        adminPassword: "Admin password",
        plan: "Plan",
        selectPlan: "Select a plan",
        billingMode: "Billing mode",
        manual: "Manual",
        automaticCard: "Automatic card",
        billingCycle: "Billing cycle",
        collectionMethod: "Collection method",
        invoice: "Invoice",
        card: "Card",
        bankTransfer: "Bank transfer",
        cash: "Cash",
        other: "Other",
        paymentProvider: "Payment provider",
        none: "None",
        accessStart: "Access start",
        accessEnd: "Access end",
        autoRenew: "Auto renew",
        requiresPaymentMethod: "Requires payment method",
        notes: "Notes",
        control: "Control",
        manageCompanySubscription: "Manage a company subscription",
        findSubscription: "Find a subscription",
        searchByCompanyName: "Search by company name",
        searchSubscriptions: "Search",
        listAllSubscriptions: "List all",
        companyNamePlaceholder: "Company name",
        noSubscriptionsFound: "No subscriptions found.",
        loadThisSubscription: "Load",
        companyId: "Company ID",
        loading: "Loading...",
        loadSubscription: "Load subscription",
        accessWindow: "Access window",
        collection: "Collection",
        provider: "Provider",
        yes: "Yes",
        no: "No",
        actionReason: "Action reason",
        actionReasonPlaceholder: "Optional note for extend, suspend, or unsuspend",
        extendByDays: "Extend by days",
        extending: "Extending...",
        extendAccess: "Extend access",
        suspending: "Suspending...",
        suspend: "Suspend",
        reactivating: "Reactivating...",
        unsuspend: "Unsuspend",
        notesLabel: "Notes",
        emptySubscription: "Load a company subscription by ID to extend access or change suspension state.",
      }

  useEffect(() => {
    loadPlans()
  }, [])

  async function loadPlans() {
    try {
      setPlansLoading(true)
      setPlansError("")
      const response = await getSubscriptionPlans()
      setPlans(response)
    } catch (err) {
      console.error(err)
      setPlansError(err instanceof Error ? err.message : text.loadPlansError)
    } finally {
      setPlansLoading(false)
    }
  }

  async function handleCreatePlan(event: React.FormEvent) {
    event.preventDefault()

    try {
      setPlanSubmitting(true)
      setPlansError("")
      setPlanSuccess("")

      const payload: CreateSubscriptionPlanRequest = {
        code: planForm.code.trim().toUpperCase(),
        name: planForm.name.trim(),
        description: toOptionalString(planForm.description),
        monthlyPrice: toOptionalNumber(planForm.monthlyPrice),
        yearlyPrice: toOptionalNumber(planForm.yearlyPrice),
        displayOrder: toOptionalNumber(planForm.displayOrder),
        active: planForm.active,
        publicVisible: planForm.publicVisible,
      }

      await createSubscriptionPlan(payload)
      setPlanForm(createDefaultPlanForm())
      setPlanSuccess(text.createPlanSuccess)
      await loadPlans()
    } catch (err) {
      console.error(err)
      setPlansError(err instanceof Error ? err.message : text.createPlanError)
    } finally {
      setPlanSubmitting(false)
    }
  }

  async function handleCreateCompany(event: React.FormEvent) {
    event.preventDefault()

    try {
      setCompanySubmitting(true)
      setCompanySuccess("")
      setSubscriptionError("")

      const payload: CreateManagedCompanyRequest = {
        name: companyForm.name.trim(),
        businessType: toOptionalString(companyForm.businessType),
        phone: toOptionalString(companyForm.phone),
        email: toOptionalString(companyForm.email),
        address: toOptionalString(companyForm.address),
        currencyCode: toOptionalString(companyForm.currencyCode),
        admin: {
          firstName: companyForm.adminFirstName.trim(),
          lastName: companyForm.adminLastName.trim(),
          email: companyForm.adminEmail.trim(),
          password: companyForm.adminPassword,
        },
        subscription: {
          planCode: companyForm.planCode.trim().toUpperCase(),
          billingMode: companyForm.billingMode,
          billingCycle: companyForm.billingCycle,
          paymentCollectionMethod: companyForm.paymentCollectionMethod,
          paymentProvider: companyForm.paymentProvider,
          accessStartAt: companyForm.accessStartAt,
          accessEndAt: companyForm.accessEndAt,
          autoRenew: companyForm.autoRenew,
          requiresPaymentMethod: companyForm.requiresPaymentMethod,
          notes: toOptionalString(companyForm.notes),
        },
      }

      const response = await createManagedCompany(payload)
      setCompanyLookupId(String(response.companyId))
      setCompanySuccess(text.createCompanySuccess(response.companyId))
      setCompanyForm((current) => ({
        ...createDefaultCompanyForm(),
        planCode: current.planCode || payload.subscription.planCode,
      }))
      await handleLoadSubscription(response.companyId)
    } catch (err) {
      console.error(err)
      setSubscriptionError(err instanceof Error ? err.message : text.createCompanyError)
    } finally {
      setCompanySubmitting(false)
    }
  }

  async function handleSearchSubscriptions(event?: React.FormEvent) {
    event?.preventDefault()
    await loadSubscriptionResults(subscriptionSearch)
  }

  async function handleListAllSubscriptions() {
    setSubscriptionSearch("")
    await loadSubscriptionResults("")
  }

  async function loadSubscriptionResults(search: string) {
    try {
      setSubscriptionSearchLoading(true)
      setSubscriptionSearchError("")
      const response = await searchCompanySubscriptions(search)
      setSubscriptionResults(response)
    } catch (err) {
      console.error(err)
      setSubscriptionResults([])
      setSubscriptionSearchError(err instanceof Error ? err.message : text.searchSubscriptionsError)
    } finally {
      setSubscriptionSearchLoading(false)
    }
  }

  async function loadCompanyUsers(companyId: number) {
    try {
      setUsersLoading(true)
      setUsersError("")
      const response = await getCompanyUsers(companyId)
      setCompanyUsers(response)
    } catch (err) {
      console.error(err)
      setCompanyUsers([])
      setUsersError(err instanceof Error ? err.message : text.loadUsersError)
    } finally {
      setUsersLoading(false)
    }
  }

  async function handleLoadSubscription(companyIdOverride?: number) {
    const companyId = companyIdOverride ?? Number(companyLookupId)

    if (!companyId) {
      setSubscriptionError(text.companyIdRequired)
      return
    }

    setCompanyLookupId(String(companyId))

    try {
      setActionLoading("load")
      setActionSuccess("")
      setSubscriptionError("")
      const response = await getCompanySubscription(companyId)
      setSubscription(response)
      await loadCompanyUsers(companyId)
    } catch (err) {
      console.error(err)
      setSubscription(null)
      setCompanyUsers([])
      setSubscriptionError(err instanceof Error ? err.message : text.loadSubscriptionError)
    } finally {
      setActionLoading("")
    }
  }

  async function handleCreateCompanyUser(event: React.FormEvent) {
    event.preventDefault()

    const companyId = subscription?.companyId ?? Number(companyLookupId)
    if (!companyId) {
      setUsersError(text.userCompanyRequired)
      return
    }

    try {
      setUserSubmitting(true)
      setUsersError("")
      setUserSuccess("")

      const payload: CreateCompanyUserRequest = {
        firstName: companyUserForm.firstName.trim(),
        lastName: companyUserForm.lastName.trim(),
        email: companyUserForm.email.trim(),
        password: companyUserForm.password,
        role: companyUserForm.role,
      }

      await createCompanyUser(companyId, payload)
      setCompanyUserForm(createDefaultCompanyUserForm())
      setUserSuccess(text.createUserSuccess)
      await loadCompanyUsers(companyId)
    } catch (err) {
      console.error(err)
      setUsersError(err instanceof Error ? err.message : text.createUserError)
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleCompanyUserStatus(userId: number, active: boolean) {
    try {
      setUserActionLoading(`${active ? "activate" : "deactivate"}-${userId}`)
      setUsersError("")
      setUserSuccess("")

      const response = active
        ? await activateCompanyUser(userId)
        : await deactivateCompanyUser(userId)

      setCompanyUsers((current) => current.map((user) => (user.id === userId ? response : user)))
      setUserSuccess(text.userStatusSuccess)
    } catch (err) {
      console.error(err)
      setUsersError(err instanceof Error ? err.message : text.userStatusError)
    } finally {
      setUserActionLoading("")
    }
  }

  async function handleExtend() {
    if (!subscription) {
      setSubscriptionError(text.extendMissing)
      return
    }

    try {
      setActionLoading("extend")
      setActionSuccess("")
      setSubscriptionError("")
      const response = await extendCompanyAccess(subscription.companyId, {
        days: Number(extensionDays),
        reason: toOptionalString(actionReason),
      })
      setSubscription(response)
      setActionReason("")
      setActionSuccess(text.extendSuccess)
    } catch (err) {
      console.error(err)
      setSubscriptionError(err instanceof Error ? err.message : text.extendError)
    } finally {
      setActionLoading("")
    }
  }

  async function handleSuspend() {
    if (!subscription) {
      setSubscriptionError(text.suspendMissing)
      return
    }

    try {
      setActionLoading("suspend")
      setActionSuccess("")
      setSubscriptionError("")
      const response = await suspendCompanySubscription(subscription.companyId, {
        reason: toOptionalString(actionReason),
      })
      setSubscription(response)
      setActionReason("")
      setActionSuccess(text.suspendSuccess)
    } catch (err) {
      console.error(err)
      setSubscriptionError(err instanceof Error ? err.message : text.suspendError)
    } finally {
      setActionLoading("")
    }
  }

  async function handleUnsuspend() {
    if (!subscription) {
      setSubscriptionError(text.unsuspendMissing)
      return
    }

    try {
      setActionLoading("unsuspend")
      setActionSuccess("")
      setSubscriptionError("")
      const response = await unsuspendCompanySubscription(subscription.companyId, {
        reason: toOptionalString(actionReason),
      })
      setSubscription(response)
      setActionReason("")
      setActionSuccess(text.unsuspendSuccess)
    } catch (err) {
      console.error(err)
      setSubscriptionError(err instanceof Error ? err.message : text.unsuspendError)
    } finally {
      setActionLoading("")
    }
  }

  return (
    <div className="platform-page">
      <section className="platform-toolbar card">
        <div>
          <div className="platform-badge">{text.platformConsole}</div>
          <h1>{text.platformManagement}</h1>
        </div>

        <div className="platform-toolbar-actions">
          <button type="button" className="secondary-button" onClick={logoutUser}>
            {text.logout}
          </button>
        </div>
      </section>

      <section className="platform-section-grid">
        <article className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{text.plans}</p>
              <h2>{text.subscriptionCatalog}</h2>
            </div>
            <button type="button" className="secondary-button" onClick={loadPlans} disabled={plansLoading}>
              {plansLoading ? text.refreshing : text.refresh}
            </button>
          </div>

          {planSuccess && <div className="card success">{planSuccess}</div>}
          {plansError && <div className="card error">{plansError}</div>}

          <div className="platform-plan-grid">
            {plansLoading ? (
              <div className="platform-empty-state">{text.loadingPlans}</div>
            ) : plans.length === 0 ? (
              <div className="platform-empty-state">{text.noPlansYet}</div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="platform-plan-card">
                  <div className="platform-plan-top">
                    <div>
                      <p>{plan.code}</p>
                      <h3>{plan.name}</h3>
                    </div>
                    <span className={`platform-chip ${plan.active ? "platform-chip-active" : ""}`}>
                      {plan.active ? text.active : text.inactive}
                    </span>
                  </div>
                  <p>{plan.description || text.noDescription}</p>
                  <div className="platform-plan-pricing">
                    <span>{plan.monthlyPrice === null ? `${text.monthly}: -` : `${text.monthly}: ${formatCurrency(plan.monthlyPrice)}`}</span>
                    <span>{plan.yearlyPrice === null ? `${text.yearly}: -` : `${text.yearly}: ${formatCurrency(plan.yearlyPrice)}`}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{text.create}</p>
              <h2>{text.newSubscriptionPlan}</h2>
            </div>
          </div>

          <form className="platform-form-grid" onSubmit={handleCreatePlan}>
            <label>
              {text.planCode}
              <input value={planForm.code} onChange={(event) => setPlanForm((current) => ({ ...current, code: event.target.value }))} />
            </label>
            <label>
              {text.planName}
              <input value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="full-width">
              {text.description}
              <textarea value={planForm.description} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              {text.monthlyPrice}
              <input type="number" min="0" step="0.01" value={planForm.monthlyPrice} onChange={(event) => setPlanForm((current) => ({ ...current, monthlyPrice: event.target.value }))} />
            </label>
            <label>
              {text.yearlyPrice}
              <input type="number" min="0" step="0.01" value={planForm.yearlyPrice} onChange={(event) => setPlanForm((current) => ({ ...current, yearlyPrice: event.target.value }))} />
            </label>
            <label>
              {text.displayOrder}
              <input type="number" min="0" value={planForm.displayOrder} onChange={(event) => setPlanForm((current) => ({ ...current, displayOrder: event.target.value }))} />
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={planForm.active} onChange={(event) => setPlanForm((current) => ({ ...current, active: event.target.checked }))} />
              {text.active}
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={planForm.publicVisible} onChange={(event) => setPlanForm((current) => ({ ...current, publicVisible: event.target.checked }))} />
              {text.publicVisible}
            </label>

            <div className="form-actions full-width">
              <button type="submit" disabled={planSubmitting}>
                {planSubmitting ? text.creating : text.createPlan}
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="platform-section-grid">
        <article className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{text.onboarding}</p>
              <h2>{text.createManagedCompany}</h2>
            </div>
          </div>

          {companySuccess && <div className="card success">{companySuccess}</div>}

          <form className="platform-form-grid" onSubmit={handleCreateCompany}>
            <label>
              {text.companyName}
              <input value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              {text.businessType}
              <input value={companyForm.businessType} onChange={(event) => setCompanyForm((current) => ({ ...current, businessType: event.target.value }))} />
            </label>
            <label>
              {text.phone}
              <input value={companyForm.phone} onChange={(event) => setCompanyForm((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label>
              {text.companyEmail}
              <input type="email" value={companyForm.email} onChange={(event) => setCompanyForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="full-width">
              {text.address}
              <input value={companyForm.address} onChange={(event) => setCompanyForm((current) => ({ ...current, address: event.target.value }))} />
            </label>
            <label>
              {text.currency}
              <input value={companyForm.currencyCode} onChange={(event) => setCompanyForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} />
            </label>
            <label>
              {text.adminFirstName}
              <input value={companyForm.adminFirstName} onChange={(event) => setCompanyForm((current) => ({ ...current, adminFirstName: event.target.value }))} />
            </label>
            <label>
              {text.adminLastName}
              <input value={companyForm.adminLastName} onChange={(event) => setCompanyForm((current) => ({ ...current, adminLastName: event.target.value }))} />
            </label>
            <label>
              {text.adminEmail}
              <input type="email" value={companyForm.adminEmail} onChange={(event) => setCompanyForm((current) => ({ ...current, adminEmail: event.target.value }))} />
            </label>
            <label>
              {text.adminPassword}
              <input type="password" value={companyForm.adminPassword} onChange={(event) => setCompanyForm((current) => ({ ...current, adminPassword: event.target.value }))} />
            </label>
            <label>
              {text.plan}
              <select value={companyForm.planCode} onChange={(event) => setCompanyForm((current) => ({ ...current, planCode: event.target.value }))}>
                <option value="">{text.selectPlan}</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.code}>
                    {plan.code} - {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text.billingMode}
              <select value={companyForm.billingMode} onChange={(event) => setCompanyForm((current) => ({ ...current, billingMode: event.target.value as CompanyFormState["billingMode"] }))}>
                <option value="MANUAL">{text.manual}</option>
                <option value="AUTOMATIC_CARD">{text.automaticCard}</option>
              </select>
            </label>
            <label>
              {text.billingCycle}
              <select value={companyForm.billingCycle} onChange={(event) => setCompanyForm((current) => ({ ...current, billingCycle: event.target.value as CompanyFormState["billingCycle"] }))}>
                <option value="MONTHLY">{text.monthly}</option>
                <option value="YEARLY">{text.yearly}</option>
              </select>
            </label>
            <label>
              {text.collectionMethod}
              <select value={companyForm.paymentCollectionMethod} onChange={(event) => setCompanyForm((current) => ({ ...current, paymentCollectionMethod: event.target.value as CompanyFormState["paymentCollectionMethod"] }))}>
                <option value="INVOICE">{text.invoice}</option>
                <option value="CARD">{text.card}</option>
                <option value="BANK_TRANSFER">{text.bankTransfer}</option>
                <option value="CASH">{text.cash}</option>
                <option value="OTHER">{text.other}</option>
              </select>
            </label>
            <label>
              {text.paymentProvider}
              <select value={companyForm.paymentProvider} onChange={(event) => setCompanyForm((current) => ({ ...current, paymentProvider: event.target.value as CompanyFormState["paymentProvider"] }))}>
                <option value="NONE">{text.none}</option>
                <option value="STRIPE">Stripe</option>
              </select>
            </label>
            <label>
              {text.accessStart}
              <input type="datetime-local" value={companyForm.accessStartAt} onChange={(event) => setCompanyForm((current) => ({ ...current, accessStartAt: event.target.value }))} />
            </label>
            <label>
              {text.accessEnd}
              <input type="datetime-local" value={companyForm.accessEndAt} onChange={(event) => setCompanyForm((current) => ({ ...current, accessEndAt: event.target.value }))} />
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={companyForm.autoRenew} onChange={(event) => setCompanyForm((current) => ({ ...current, autoRenew: event.target.checked }))} />
              {text.autoRenew}
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={companyForm.requiresPaymentMethod} onChange={(event) => setCompanyForm((current) => ({ ...current, requiresPaymentMethod: event.target.checked }))} />
              {text.requiresPaymentMethod}
            </label>
            <label className="full-width">
              {text.notes}
              <textarea value={companyForm.notes} onChange={(event) => setCompanyForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>

            <div className="form-actions full-width">
              <button type="submit" disabled={companySubmitting}>
                {companySubmitting ? text.creating : text.createManagedCompanyButton}
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{text.control}</p>
              <h2>{text.manageCompanySubscription}</h2>
            </div>
          </div>

          {subscriptionError && <div className="card error">{subscriptionError}</div>}
          {actionSuccess && <div className="card success">{actionSuccess}</div>}

          <form className="platform-subscription-search" onSubmit={handleSearchSubscriptions}>
            <label className="platform-inline-field">
              {text.searchByCompanyName}
              <input value={subscriptionSearch} onChange={(event) => setSubscriptionSearch(event.target.value)} placeholder={text.companyNamePlaceholder} />
            </label>
            <button type="submit" disabled={subscriptionSearchLoading}>
              {text.searchSubscriptions}
            </button>
            <button type="button" className="secondary-button" onClick={handleListAllSubscriptions} disabled={subscriptionSearchLoading}>
              {subscriptionSearchLoading ? text.loading : text.listAllSubscriptions}
            </button>
          </form>

          {subscriptionSearchError && <div className="card error">{subscriptionSearchError}</div>}
          {subscriptionResults.length > 0 ? (
            <div className="platform-subscription-results">
              <table>
                <thead>
                  <tr>
                    <th>{text.companyId}</th>
                    <th>{text.companyName}</th>
                    <th>{text.plan}</th>
                    <th>{text.status}</th>
                    <th>{text.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionResults.map((result) => (
                    <tr key={result.companyId}>
                      <td>{result.companyId}</td>
                      <td>{result.companyName}</td>
                      <td>{result.planCode} - {result.planName}</td>
                      <td>{result.status}</td>
                      <td>
                        <button type="button" onClick={() => handleLoadSubscription(result.companyId)}>
                          {text.loadThisSubscription}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : subscriptionSearchLoading ? null : (
            subscriptionSearch && <div className="platform-empty-state">{text.noSubscriptionsFound}</div>
          )}

          <div className="platform-inline-actions">
            <label className="platform-inline-field">
              {text.companyId}
              <input type="number" min="1" value={companyLookupId} onChange={(event) => setCompanyLookupId(event.target.value)} placeholder="12" />
            </label>
            <button type="button" onClick={() => handleLoadSubscription()} disabled={actionLoading === "load"}>
              {actionLoading === "load" ? text.loading : text.loadSubscription}
            </button>
          </div>

          {subscription ? (
            <div className="platform-subscription-panel">
              <div className="platform-subscription-head">
                <div>
                  <h3>{subscription.companyName}</h3>
                  <p>
                    Company #{subscription.companyId} | {subscription.planCode} | {subscription.planName}
                  </p>
                </div>
                <span className="platform-status-pill">{subscription.status}</span>
              </div>

              <div className="platform-detail-grid">
                <div>
                  <span>{text.accessWindow}</span>
                  <strong>{formatDateTime(subscription.accessStartAt)} to {formatDateTime(subscription.accessEndAt)}</strong>
                </div>
                <div>
                  <span>{text.billingMode}</span>
                  <strong>{subscription.billingMode}</strong>
                </div>
                <div>
                  <span>{text.billingCycle}</span>
                  <strong>{subscription.billingCycle}</strong>
                </div>
                <div>
                  <span>{text.collection}</span>
                  <strong>{subscription.paymentCollectionMethod}</strong>
                </div>
                <div>
                  <span>{text.provider}</span>
                  <strong>{subscription.paymentProvider}</strong>
                </div>
                <div>
                  <span>{text.autoRenew}</span>
                  <strong>{subscription.autoRenew ? text.yes : text.no}</strong>
                </div>
              </div>

              <label className="full-width">
                {text.actionReason}
                <textarea value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder={text.actionReasonPlaceholder} />
              </label>

              <div className="platform-inline-actions">
                <label className="platform-inline-field">
                  {text.extendByDays}
                  <input type="number" min="1" value={extensionDays} onChange={(event) => setExtensionDays(event.target.value)} />
                </label>
                <button type="button" onClick={handleExtend} disabled={actionLoading === "extend"}>
                  {actionLoading === "extend" ? text.extending : text.extendAccess}
                </button>
                <button type="button" className="secondary-button" onClick={handleSuspend} disabled={actionLoading === "suspend"}>
                  {actionLoading === "suspend" ? text.suspending : text.suspend}
                </button>
                <button type="button" className="secondary-button" onClick={handleUnsuspend} disabled={actionLoading === "unsuspend"}>
                  {actionLoading === "unsuspend" ? text.reactivating : text.unsuspend}
                </button>
              </div>

              {subscription.notes && (
                <div className="platform-notes-box">
                  <span>{text.notesLabel}</span>
                  <pre>{subscription.notes}</pre>
                </div>
              )}

            </div>
          ) : (
            <div className="platform-empty-state">
              {text.emptySubscription}
            </div>
          )}

          {subscription && (
          <div className="platform-user-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{text.control}</p>
                <h2>{text.companyUsers}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => loadCompanyUsers(subscription.companyId)} disabled={usersLoading}>
                {usersLoading ? text.refreshing : text.refresh}
              </button>
            </div>

            {usersError && <div className="card error">{usersError}</div>}
            {userSuccess && <div className="card success">{userSuccess}</div>}

            <form className="platform-form-grid" onSubmit={handleCreateCompanyUser}>
              <label>
                {text.userFirstName}
                <input value={companyUserForm.firstName} onChange={(event) => setCompanyUserForm((current) => ({ ...current, firstName: event.target.value }))} />
              </label>
              <label>
                {text.userLastName}
                <input value={companyUserForm.lastName} onChange={(event) => setCompanyUserForm((current) => ({ ...current, lastName: event.target.value }))} />
              </label>
              <label>
                {text.userEmail}
                <input type="email" value={companyUserForm.email} onChange={(event) => setCompanyUserForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                {text.userPassword}
                <input type="password" value={companyUserForm.password} onChange={(event) => setCompanyUserForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
              <label>
                {text.userRole}
                <select value={companyUserForm.role} onChange={(event) => setCompanyUserForm((current) => ({ ...current, role: event.target.value as CompanyUserFormState["role"] }))}>
                  <option value="ADMIN">Admin</option>
                  <option value="CASHIER">Cashier</option>
                </select>
              </label>
              <div className="form-actions full-width">
                <button type="submit" disabled={userSubmitting}>
                  {userSubmitting ? text.adding : text.addUser}
                </button>
              </div>
            </form>

            <div className="platform-users-table">
              {usersLoading ? (
                <div className="platform-empty-state">{text.loading}</div>
              ) : companyUsers.length === 0 ? (
                <div className="platform-empty-state">{text.noUsersYet}</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>{text.userFirstName}</th>
                      <th>{text.userLastName}</th>
                      <th>{text.userEmail}</th>
                      <th>{text.userRole}</th>
                      <th>{text.active}</th>
                      <th>{text.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyUsers.map((companyUser) => {
                      const loadingKey = `${companyUser.active ? "deactivate" : "activate"}-${companyUser.id}`

                      return (
                        <tr key={companyUser.id}>
                          <td>{companyUser.firstName}</td>
                          <td>{companyUser.lastName}</td>
                          <td>{companyUser.email}</td>
                          <td>{companyUser.role}</td>
                          <td>{companyUser.active ? text.yes : text.no}</td>
                          <td>
                            <button
                              type="button"
                              className={companyUser.active ? "secondary-button" : undefined}
                              onClick={() => handleCompanyUserStatus(companyUser.id, !companyUser.active)}
                              disabled={userActionLoading === loadingKey}
                            >
                              {companyUser.active ? text.deactivate : text.activate}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          )}
        </article>
      </section>
    </div>
  )
}

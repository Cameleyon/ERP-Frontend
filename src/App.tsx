import { useEffect, useState } from "react"
import ErrorMessage from "./components/common/ErrorMessage"
import { AuthProvider, useAuth } from "./auth/AuthContext"
import { COMPANY_TERMS_REQUIRED_EVENT } from "./api/client"
import { acceptCompanyTerms } from "./api/companyTermsApi"
import AppLayout from "./components/layout/AppLayout"
import { LanguageProvider, useI18n } from "./i18n/I18nContext"
import DashboardPage from "./pages/DashboardPage"
import CustomersPage from "./pages/CustomersPage"
import NewSalePage from "./pages/NewSalePage"
import SalesHistoryPage from "./pages/SalesHistoryPage"
import InventoryPage from "./pages/InventoryPage"
import ProductsPage from "./pages/ProductsPage"
import CostRubricsPage from "./pages/CostRubricsPage"
import LoginPage from "./pages/LoginPage"
import type { Page } from "./types/navigation"
import PublicLandingPage from "./pages/PublicLandingPage"
import PublicSignupPage from "./pages/PublicSignupPage"
import ProfilePage from "./pages/ProfilePage"
import SettingsPage from "./pages/SettingsPage"
import MarketingPrivacyPage from "./pages/MarketingPrivacyPage"
import PlatformRedirectPage from "./pages/PlatformRedirectPage"
import CurrencyRequiredDialog from "./components/common/CurrencyRequiredDialog"
import MarketingConsent from "./components/common/MarketingConsent"
import { metaPixel } from "./utils/metaPixel"
import { COMPANY_CURRENCY_REQUIRED_EVENT } from "./utils/companyCurrency"
import { accessiblePage } from "./utils/pageAccess"
import type { SetupAction } from "./utils/setupGuide"

type PublicPage = "landing" | "signup" | "login"
const PLATFORM_APP_URL =
  (import.meta.env.VITE_PLATFORM_APP_URL as string | undefined)?.trim() ||
  "https://erp.platform.cameleyondynamics.com"

function AppContent() {
  const { isAuthenticated, isLoading, logoutUser, refreshUser, user } = useAuth()
  const { copy, language } = useI18n()
  const scope = user ? `${user.companyId}:${user.id}` : ""
  type Navigation = { page: Page; productId?: number; siteId?: number; inspectStock?: boolean; guidedProduct?: boolean; resumeProduct?: boolean; manageSites?: boolean }
  const [route, setRoute] = useState<{ scope: string; nav: Navigation }>()
  const nav: Navigation = route?.scope === scope ? route.nav : { page: "dashboard" }
  const [sitePreferences, setSitePreferences] = useState<{ scope: string; defaultSite: number | null; revision: number; pages: Partial<Record<Page, number | null>> }>()
  const preferences = sitePreferences?.scope === scope ? sitePreferences : undefined
  const menuSite = preferences?.defaultSite ?? null
  const siteRevision = preferences?.revision ?? 0
  const menuSelection = { site: menuSite, revision: siteRevision }
  function pageSite(page: Page) {
    const chosen = preferences?.pages[page]
    return chosen === undefined ? menuSite : chosen
  }
  function rememberSite(page: Page, site: number | null) {
    setSitePreferences(previous => {
      const current = previous?.scope === scope ? previous : { scope, defaultSite: null, revision: 0, pages: {} }
      return { ...current, pages: { ...current.pages, [page]: site } }
    })
  }
  function changeMenuSite(site: number) {
    setSitePreferences(previous => ({
      scope, defaultSite: site, revision: (previous?.scope === scope ? previous.revision : 0) + 1, pages: {},
    }))
  }
  function navigate(next: Navigation, currency = false) {
    setConfigureCurrency(currency)
    setRoute({ scope, nav: next })
  }
  const [publicPage, setPublicPage] = useState<PublicPage>("landing")
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [currencyRequired, setCurrencyRequired] = useState(false)
  const [configureCurrency, setConfigureCurrency] = useState(false)
  const [acceptingTerms, setAcceptingTerms] = useState(false)
  const [termsError, setTermsError] = useState("")
  const [termsRequired, setTermsRequired] = useState(false)
  const [showTermsDetails, setShowTermsDetails] = useState(false)

  useEffect(() => {
    metaPixel?.setPublicView(!isLoading && !isAuthenticated ? publicPage : null)
  }, [isLoading, isAuthenticated, publicPage])

  useEffect(() => {
    const isPlatformOwner = user?.role === "SUPER_ADMIN"
    const primaryColor = isPlatformOwner ? "#0f6b9b" : user?.companyPrimaryColor || "#2563eb"
    const sidebarColor = isPlatformOwner ? "#044975" : user?.companySidebarColor || "#044975"

    document.documentElement.style.setProperty("--primary-color", primaryColor)
    document.documentElement.style.setProperty("--sidebar-color", sidebarColor)
  }, [user])

  useEffect(() => {
    function handleTermsRequired() {
      setTermsRequired(true)
      setTermsError("")
    }

    window.addEventListener(COMPANY_TERMS_REQUIRED_EVENT, handleTermsRequired)
    const handleCurrencyRequired = () => setCurrencyRequired(true)
    window.addEventListener(COMPANY_CURRENCY_REQUIRED_EVENT, handleCurrencyRequired)

    return () => {
      window.removeEventListener(COMPANY_TERMS_REQUIRED_EVENT, handleTermsRequired)
      window.removeEventListener(COMPANY_CURRENCY_REQUIRED_EVENT, handleCurrencyRequired)
    }
  }, [])

  useEffect(() => {
    if (!user?.companyId) {
      setRoute(undefined)
      setSitePreferences(undefined)
      setCurrencyRequired(false)
      setConfigureCurrency(false)
      setTermsRequired(false)
      setShowTermsDetails(false)
      return
    }

    if (user.termsAccepted === false) {
      setTermsRequired(true)
    }
  }, [user])

  if (isLoading) {
    return <div style={{ padding: 24 }}>{copy.app.sessionLoading}</div>
  }

  if (!isAuthenticated) {
    if (publicPage === "signup") {
      return (
          <PublicSignupPage
              onSignupComplete={(email) => {
                setRegisteredEmail(email)
                setPublicPage("login")
                window.scrollTo(0, 0)
              }}
              onGoToHome={() => setPublicPage("landing")}
          />
      )
    }

    if (publicPage === "login") {
      return (
          <LoginPage
              registeredEmail={registeredEmail}
              onSignedIn={() => setRegisteredEmail("")}
              onGoToHome={() => { setRegisteredEmail(""); setPublicPage("landing") }}
              onGoToSignup={() => { setRegisteredEmail(""); setPublicPage("signup") }}
          />
      )
    }

    return (
        <PublicLandingPage
            onGoToSignup={() => setPublicPage("signup")}
            onGoToLogin={() => setPublicPage("login")}
        />
    )
  }

  if (user?.role === "SUPER_ADMIN" || user?.role === "PROMOTER") {
    return <PlatformRedirectPage platformAppUrl={PLATFORM_APP_URL} />
  }

  const isAdmin = user?.role === "ADMIN"
  const termsText = getTermsGateText(language)

  async function handleAcceptTerms() {
    try {
      setAcceptingTerms(true)
      setTermsError("")
      await acceptCompanyTerms()
      await refreshUser()
      setTermsRequired(false)
      setShowTermsDetails(false)
    } catch (err) {
      console.error(err)
      setTermsError(err instanceof Error ? err.message : termsText.acceptError)
    } finally {
      setAcceptingTerms(false)
    }
  }

  if (user?.companyId && (termsRequired || user.termsAccepted !== true)) {
    return (
      <div className="public-page">
        <div className="card terms-required-card">
          <h1>{isAdmin ? termsText.adminTitle : termsText.blockedTitle}</h1>
          <p>{isAdmin ? termsText.adminIntro : termsText.blockedIntro}</p>

          <p className="terms-required-copy">
            {termsText.readPrompt}{" "}
            <button type="button" className="link-button" onClick={() => setShowTermsDetails(true)}>
              {termsText.termsLink}
            </button>
          </p>

          {termsError && <ErrorMessage message={termsError} onDismiss={() => setTermsError("")} />}

          <div className="form-actions">
            {isAdmin && (
              <button type="button" onClick={handleAcceptTerms} disabled={acceptingTerms}>
                {acceptingTerms ? termsText.accepting : termsText.acceptButton}
              </button>
            )}
            <button type="button" className="secondary-button" onClick={logoutUser}>
              {copy.common.logout}
            </button>
          </div>
        </div>

        {showTermsDetails && (
          <div className="terms-modal-backdrop" role="dialog" aria-modal="true">
            <div className="card terms-dialog">
              <h2>{termsText.termsTitle}</h2>
              <div className="terms-dialog-body">
                {termsText.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowTermsDetails(false)}>
                  {termsText.closeTerms}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const safePage = accessiblePage(user?.role, nav.page)
  const retainProducts = safePage === "profile" && nav.resumeProduct

  function followSetup(action: SetupAction) {
    switch (action.kind) {
      case "currency": navigate({ page: "profile" }, true); break
      case "product": navigate({ page: "products", guidedProduct: true }); break
      case "products": navigate({ page: "products" }); break
      case "opening": navigate({ page: "inventory", productId: action.productId, siteId: action.siteId }); break
      case "inventory": navigate({ page: "inventory" }); break
      case "sale": navigate({ page: "new-sale", siteId: action.siteId }); break
      case "manage": navigate({ page: "profile", manageSites: true }); break
    }
  }

  return (
      <AppLayout key={scope} page={safePage} onNavigate={page => navigate({ page })}
        menuSite={menuSite} onMenuSiteChange={changeMenuSite}>
        {safePage === "dashboard" && <DashboardPage initialSiteId={pageSite("dashboard")} menuSelection={menuSelection}
          onSetupAction={followSetup} onSiteChange={id => rememberSite("dashboard", id ?? null)} />}
        {safePage === "customers" && <CustomersPage />}
        {(safePage === "products" || retainProducts) && isAdmin &&
          <div hidden={retainProducts}><ProductsPage guided={nav.guidedProduct} visible={!retainProducts}
            onOpeningStock={productId => navigate({ page: "inventory", productId })}
            onInspectStock={productId => navigate({ page: "inventory", productId, inspectStock: true })} /></div>}
        {safePage === "cost-rubrics" && isAdmin && <CostRubricsPage onBack={() => navigate({ page: "inventory" })} />}
        {safePage === "new-sale" && <NewSalePage preferredSiteId={nav.siteId ?? pageSite("new-sale") ?? undefined} menuSelection={menuSelection}
          onSiteChange={id => rememberSite("new-sale", id)} onSetupReturn={() => navigate({ page: "dashboard" })} />}
        {safePage === "sales-history" && <SalesHistoryPage initialSiteId={siteRevision || preferences?.pages["sales-history"] !== undefined ? pageSite("sales-history") : undefined}
          menuSelection={menuSelection}
          onSiteChange={id => rememberSite("sales-history", id)} />}
        {safePage === "inventory" && isAdmin && <InventoryPage productId={nav.productId} preferredSiteId={nav.siteId ?? pageSite("inventory") ?? undefined}
          menuSelection={menuSelection}
          onSiteChange={id => rememberSite("inventory", id)} inspectStock={nav.inspectStock}
          onReviewProducts={() => navigate({ page: "products" })} />}
        {safePage === "profile" && <ProfilePage configureCurrency={route?.scope === scope && configureCurrency}
          manageSites={nav.manageSites} returnToProduct={retainProducts}
          onCurrencyReturn={() => navigate(retainProducts ? { page: "products", guidedProduct: nav.guidedProduct } : { page: "dashboard" })} />}
        {safePage === "settings" && isAdmin && <SettingsPage initialSiteId={pageSite("settings")} menuSelection={menuSelection}
          onSiteChange={id => rememberSite("settings", id)} />}
        {currencyRequired && <CurrencyRequiredDialog canConfigure={isAdmin} onClose={() => setCurrencyRequired(false)}
          onConfigure={() => {
            setCurrencyRequired(false)
            navigate({ page: "profile", resumeProduct: safePage === "products", guidedProduct: nav.guidedProduct }, true)
          }} />}
      </AppLayout>
  )
}

function getTermsGateText(language: "fr" | "en" | "es") {
  if (language === "en") {
    return {
      adminTitle: "Terms of use required",
      blockedTitle: "Access temporarily blocked",
      adminIntro: "Before your company can continue using CAMELEYON ERP, an admin must accept the updated terms of use.",
      blockedIntro: "Your company account is waiting for an admin to accept the terms of use. Please contact an administrator.",
      acceptButton: "I accept and continue",
      accepting: "Accepting...",
      acceptError: "Failed to accept the terms of use",
      readPrompt: "Please review the terms of use before continuing.",
      termsLink: "View terms of use",
      termsTitle: "CAMELEYON ERP Terms of Use",
      closeTerms: "Close",
      paragraphs: [
        "CAMELEYON ERP is provided by CAMELEYON Dynamics to help the company manage sales, inventory, products, pricing, customers, invoices, and operations.",
        "The company confirms that its information is accurate and that the main administrator is responsible for users, access, and company data.",
        "Use of the solution may depend on a paid subscription. Any month that has started is due. CAMELEYON reserves the right to review subscription pricing when needed, with prior notice when required.",
        "CAMELEYON may limit, suspend, or block access in case of non-payment, abusive use, attempted fraud, security risk, or breach of these terms.",
      ],
    }
  }

  if (language === "es") {
    return {
      adminTitle: "Términos de uso requeridos",
      blockedTitle: "Acceso temporalmente bloqueado",
      adminIntro: "Antes de que su empresa pueda continuar usando CAMELEYON ERP, un administrador debe aceptar los términos de uso actualizados.",
      blockedIntro: "La cuenta de su empresa está esperando que un administrador acepte los términos de uso. Contacte a un administrador.",
      acceptButton: "Acepto y continuar",
      accepting: "Aceptando...",
      acceptError: "No se pudieron aceptar los términos de uso",
      readPrompt: "Revise los términos de uso antes de continuar.",
      termsLink: "Ver términos de uso",
      termsTitle: "Términos de uso de CAMELEYON ERP",
      closeTerms: "Cerrar",
      paragraphs: [
        "CAMELEYON ERP es proporcionado por CAMELEYON Dynamics para ayudar a la empresa a gestionar ventas, inventario, productos, precios, clientes, facturas y operaciones.",
        "La empresa confirma que su información es correcta y que el administrador principal es responsable de usuarios, accesos y datos de la empresa.",
        "El uso de la solución puede depender de una suscripción paga. Todo mes iniciado debe pagarse. CAMELEYON se reserva el derecho de revisar el precio de la suscripción cuando sea necesario, con aviso previo cuando corresponda.",
        "CAMELEYON puede limitar, suspender o bloquear el acceso en caso de falta de pago, uso abusivo, intento de fraude, riesgo de seguridad o incumplimiento de estos términos.",
      ],
    }
  }

  return {
    adminTitle: "Conditions d'utilisation requises",
    blockedTitle: "Accès temporairement bloqué",
    adminIntro: "Avant que votre entreprise puisse continuer à utiliser CAMELEYON ERP, un admin doit accepter les conditions d'utilisation mises à jour.",
    blockedIntro: "Le compte de votre entreprise attend qu'un admin accepte les conditions d'utilisation. Veuillez contacter un administrateur.",
    acceptButton: "J'accepte et je continue",
    accepting: "Acceptation...",
    acceptError: "Impossible d'accepter les conditions d'utilisation",
    readPrompt: "Veuillez consulter les conditions d'utilisation avant de continuer.",
    termsLink: "Voir les conditions d'utilisation",
    termsTitle: "Conditions d'utilisation CAMELEYON ERP",
    closeTerms: "Fermer",
    paragraphs: [
      "CAMELEYON ERP est fourni par CAMELEYON Dynamics pour aider l'entreprise à gérer ses ventes, son inventaire, ses produits, ses prix, ses clients, ses factures et ses opérations.",
      "L'entreprise confirme que ses informations sont exactes et que l'administrateur principal est responsable des utilisateurs, des accès et des données de l'entreprise.",
      "L'utilisation de la solution peut dépendre d'un abonnement payant. Tout mois commencé est dû. CAMELEYON se réserve le droit de revoir le prix de l'abonnement au besoin, avec information préalable lorsque nécessaire.",
      "CAMELEYON peut limiter, suspendre ou bloquer l'accès en cas de non-paiement, d'utilisation abusive, de tentative de fraude, d'atteinte à la sécurité ou de violation des présentes conditions.",
    ],
  }
}

export default function App() {
  const isPrivacyPage = /^\/(?:(?:en|fr|es)\/)?privacy\/?$/.test(window.location.pathname)
  return (
      <AuthProvider>
        <LanguageProvider>
          {isPrivacyPage ? <MarketingPrivacyPage /> : (
            <>
              <AppContent />
              <MarketingConsent />
            </>
          )}
        </LanguageProvider>
      </AuthProvider>
  )
}

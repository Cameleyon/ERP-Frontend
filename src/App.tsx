import { useEffect, useState } from "react"
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
import InventoryReceiptPage from "./pages/InventoryReceiptPage"
import ProductsPage from "./pages/ProductsPage"
import CostRubricsPage from "./pages/CostRubricsPage"
import UnitsPage from "./pages/UnitsPage"
import LoginPage from "./pages/LoginPage"
import type { Page } from "./types/navigation"
import PublicLandingPage from "./pages/PublicLandingPage"
import PublicSignupPage from "./pages/PublicSignupPage"
import ProfilePage from "./pages/ProfilePage"
import PlatformRedirectPage from "./pages/PlatformRedirectPage"

type PublicPage = "landing" | "signup" | "login" | "profile"
const PLATFORM_APP_URL =
  (import.meta.env.VITE_PLATFORM_APP_URL as string | undefined)?.trim() ||
  "https://erp.platform.cameleyondynamics.com"

function AppContent() {
  const { isAuthenticated, isLoading, logoutUser, refreshUser, user } = useAuth()
  const { copy, language } = useI18n()
  const [page, setPage] = useState<Page>("dashboard")
  const [publicPage, setPublicPage] = useState<PublicPage>("landing")
  const [acceptingTerms, setAcceptingTerms] = useState(false)
  const [termsError, setTermsError] = useState("")
  const [termsRequired, setTermsRequired] = useState(false)
  const [showTermsDetails, setShowTermsDetails] = useState(false)

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

    return () => {
      window.removeEventListener(COMPANY_TERMS_REQUIRED_EVENT, handleTermsRequired)
    }
  }, [])

  useEffect(() => {
    if (!user?.companyId) {
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
              onGoToLogin={() => setPublicPage("login")}
              onGoToHome={() => setPublicPage("landing")}
          />
      )
    }

    if (publicPage === "login") {
      return (
          <LoginPage
              onGoToHome={() => setPublicPage("landing")}
              onGoToSignup={() => setPublicPage("signup")}
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

          {termsError && <div className="card error">{termsError}</div>}

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

  const safePage =
      !isAdmin &&
      (page === "inventory" ||
          page === "inventory-receipt" ||
          page === "cost-rubrics" ||
          page === "units" ||
          page === "products")
          ? "dashboard"
          : page

  return (
      <AppLayout page={safePage} onNavigate={setPage}>
        {safePage === "dashboard" && <DashboardPage />}
        {safePage === "customers" && <CustomersPage />}
        {safePage === "products" && isAdmin && <ProductsPage />}
        {safePage === "units" && isAdmin && <UnitsPage />}
        {safePage === "cost-rubrics" && isAdmin && <CostRubricsPage />}
        {safePage === "new-sale" && <NewSalePage />}
        {safePage === "sales-history" && <SalesHistoryPage />}
        {safePage === "inventory" && isAdmin && <InventoryPage />}
        {safePage === "inventory-receipt" && isAdmin && <InventoryReceiptPage />}
        {safePage === "profile" && <ProfilePage />}
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
      adminTitle: "Terminos de uso requeridos",
      blockedTitle: "Acceso temporalmente bloqueado",
      adminIntro: "Antes de que su empresa pueda continuar usando CAMELEYON ERP, un administrador debe aceptar los terminos de uso actualizados.",
      blockedIntro: "La cuenta de su empresa esta esperando que un administrador acepte los terminos de uso. Contacte a un administrador.",
      acceptButton: "Acepto y continuar",
      accepting: "Aceptando...",
      acceptError: "No se pudieron aceptar los terminos de uso",
      readPrompt: "Revise los terminos de uso antes de continuar.",
      termsLink: "Ver terminos de uso",
      termsTitle: "Terminos de uso de CAMELEYON ERP",
      closeTerms: "Cerrar",
      paragraphs: [
        "CAMELEYON ERP es proporcionado por CAMELEYON Dynamics para ayudar a la empresa a gestionar ventas, inventario, productos, precios, clientes, facturas y operaciones.",
        "La empresa confirma que su informacion es correcta y que el administrador principal es responsable de usuarios, accesos y datos de la empresa.",
        "El uso de la solucion puede depender de una suscripcion paga. Todo mes iniciado debe pagarse. CAMELEYON se reserva el derecho de revisar el precio de la suscripcion cuando sea necesario, con aviso previo cuando corresponda.",
        "CAMELEYON puede limitar, suspender o bloquear el acceso en caso de falta de pago, uso abusivo, intento de fraude, riesgo de seguridad o incumplimiento de estos terminos.",
      ],
    }
  }

  return {
    adminTitle: "Conditions d'utilisation requises",
    blockedTitle: "Acces temporairement bloque",
    adminIntro: "Avant que votre entreprise puisse continuer a utiliser CAMELEYON ERP, un admin doit accepter les conditions d'utilisation mises a jour.",
    blockedIntro: "Le compte de votre entreprise attend qu'un admin accepte les conditions d'utilisation. Veuillez contacter un administrateur.",
    acceptButton: "J'accepte et je continue",
    accepting: "Acceptation...",
    acceptError: "Impossible d'accepter les conditions d'utilisation",
    readPrompt: "Veuillez consulter les conditions d'utilisation avant de continuer.",
    termsLink: "Voir les conditions d'utilisation",
    termsTitle: "Conditions d'utilisation CAMELEYON ERP",
    closeTerms: "Fermer",
    paragraphs: [
      "CAMELEYON ERP est fourni par CAMELEYON Dynamics pour aider l'entreprise a gerer ses ventes, son inventaire, ses produits, ses prix, ses clients, ses factures et ses operations.",
      "L'entreprise confirme que ses informations sont exactes et que l'administrateur principal est responsable des utilisateurs, des acces et des donnees de l'entreprise.",
      "L'utilisation de la solution peut dependre d'un abonnement payant. Tout mois commence est du. CAMELEYON se reserve le droit de revoir le prix de l'abonnement au besoin, avec information prealable lorsque necessaire.",
      "CAMELEYON peut limiter, suspendre ou bloquer l'acces en cas de non-paiement, d'utilisation abusive, de tentative de fraude, d'atteinte a la securite ou de violation des presentes conditions.",
    ],
  }
}

export default function App() {
  return (
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
  )
}

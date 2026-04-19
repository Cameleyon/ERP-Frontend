import { useEffect, useState } from "react"
import { AuthProvider, useAuth } from "./auth/AuthContext"
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
import PlatformConsolePage from "./pages/PlatformConsolePage"
import ProfilePage from "./pages/ProfilePage"

type PublicPage = "landing" | "signup" | "login" | "profile"

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { copy } = useI18n()
  const [page, setPage] = useState<Page>("dashboard")
  const [publicPage, setPublicPage] = useState<PublicPage>("landing")

  useEffect(() => {
    const isPlatformOwner = user?.role === "SUPER_ADMIN"
    const primaryColor = isPlatformOwner ? "#0f6b9b" : user?.companyPrimaryColor || "#2563eb"
    const sidebarColor = isPlatformOwner ? "#044975" : user?.companySidebarColor || "#044975"

    document.documentElement.style.setProperty("--primary-color", primaryColor)
    document.documentElement.style.setProperty("--sidebar-color", sidebarColor)
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

  if (user?.role === "SUPER_ADMIN") {
    return <PlatformConsolePage />
  }

  const isAdmin = user?.role === "ADMIN"

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

export default function App() {
  return (
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
  )
}

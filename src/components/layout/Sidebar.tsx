import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import type { Page } from "../../types/navigation"
import LanguageSwitcher from "../common/LanguageSwitcher"

type Props = {
  page: Page
  onNavigate: (page: Page) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({
  page,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const { user, logoutUser } = useAuth()
  const { copy } = useI18n()
  const isAdmin = user?.role === "ADMIN"

  const sidebarStyle = {
    background: user?.companySidebarColor || "var(--sidebar-color)",
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} />}

      <aside
        className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}
        style={sidebarStyle}
      >
        <div>
          <div className="sidebar-mobile-header">
            <button
              type="button"
              className="sidebar-close-button"
              onClick={onCloseMobile}
            >
              {copy.common.close}
            </button>
          </div>

          <LanguageSwitcher className="sidebar-language-switcher" />

          {user && (
            <div className="sidebar-company-block">
              <div className="sidebar-company-header">
                {user.companyLogoUrl && (
                  <img
                    src={user.companyLogoUrl}
                    alt={`${user.companyName} logo`}
                    className="sidebar-company-logo"
                  />
                )}

                <div className="sidebar-company-name">{user.companyName ?? "CAMELEYON ERP"}</div>
              </div>
            </div>
          )}

          {user && (
            <div className="sidebar-user">
              <div>{user.firstName} {user.lastName}</div>
              <div>{user.role}</div>
            </div>
          )}

          <nav className="sidebar-nav">
            <button
              className={`sidebar-button ${page === "dashboard" ? "active" : ""}`}
              onClick={() => onNavigate("dashboard")}
            >
              {copy.sidebar.dashboard}
            </button>

            <button
              className={`sidebar-button ${page === "customers" ? "active" : ""}`}
              onClick={() => onNavigate("customers")}
            >
              {copy.sidebar.customers}
            </button>

            <button
              className={`sidebar-button ${page === "new-sale" ? "active" : ""}`}
              onClick={() => onNavigate("new-sale")}
            >
              {copy.sidebar.newSale}
            </button>

            <button
              className={`sidebar-button ${page === "sales-history" ? "active" : ""}`}
              onClick={() => onNavigate("sales-history")}
            >
              {copy.sidebar.salesHistory}
            </button>

            {isAdmin && (
              <>
                <button
                  className={`sidebar-button ${page === "inventory" ? "active" : ""}`}
                  onClick={() => onNavigate("inventory")}
                >
                  {copy.sidebar.inventory}
                </button>

                <button
                  className={`sidebar-button ${page === "inventory-receipt" ? "active" : ""}`}
                  onClick={() => onNavigate("inventory-receipt")}
                >
                  {copy.sidebar.inventoryReceipt}
                </button>

                <button
                  className={`sidebar-button ${page === "products" ? "active" : ""}`}
                  onClick={() => onNavigate("products")}
                >
                  {copy.sidebar.products}
                </button>

                <button
                  className={`sidebar-button ${page === "units" ? "active" : ""}`}
                  onClick={() => onNavigate("units")}
                >
                  {copy.sidebar.units}
                </button>

                <button
                  className={`sidebar-button ${page === "cost-rubrics" ? "active" : ""}`}
                  onClick={() => onNavigate("cost-rubrics")}
                >
                  {copy.sidebar.costRubrics}
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-actions">
            <button className="sidebar-button sidebar-footer-button logout-button" onClick={logoutUser}>
              {copy.common.logout}
            </button>

            {isAdmin && (
              <button
                className={`sidebar-button sidebar-footer-button ${page === "profile" ? "active" : ""}`}
                onClick={() => onNavigate("profile")}
              >
                {copy.common.profile}
              </button>
            )}
          </div>

          <div className="sidebar-product-name">
            CAMELEYON ERP
          </div>
        </div>
      </aside>
    </>
  )
}

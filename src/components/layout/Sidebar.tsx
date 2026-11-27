import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { internalCopy } from "../../i18n/internalCopy"
import type { Page } from "../../types/navigation"
import LanguageSwitcher from "../common/LanguageSwitcher"
import { calendarCopy } from "../profile/calendarCopy"
import { profileValueLabel } from "../profile/profileValueCopy"
import WorkspaceBrand from "./WorkspaceBrand"

type Props = { page: Page; onNavigate: (page: Page) => void; mobile?: boolean }

export default function Sidebar({ page, onNavigate, mobile = false }: Props) {
  const { user, logoutUser } = useAuth()
  const { copy, language } = useI18n()
  const text = internalCopy[language]
  const isAdmin = user?.role === "ADMIN"
  const labels = { dashboard: copy.sidebar.dashboard, customers: copy.sidebar.customers,
    products: copy.sidebar.products, "cost-rubrics": copy.sidebar.costRubrics, "new-sale": copy.sidebar.newSale,
    "sales-history": copy.sidebar.salesHistory, inventory: copy.sidebar.inventory, profile: copy.common.profile,
    settings: calendarCopy[language].settings,
  }
  const marks: Record<Page, string> = { dashboard: "▦", customers: "○", products: "□", "cost-rubrics": "≋",
    "new-sale": "+", "sales-history": "≡", inventory: "▤", profile: "○", settings: "⚙" }

  function group(title: string, pages: Page[]) {
    return <div className="workspace-nav-group" role="group" aria-label={title}>
      <p>{title}</p>
      {pages.map(target => <button type="button" key={target}
        className={`sidebar-button ${page === target ? "active" : ""}`.trim()}
        aria-current={page === target ? "page" : undefined} onClick={() => onNavigate(target)}>
        <span className="workspace-nav-mark" aria-hidden="true">{marks[target]}</span>{labels[target]}
      </button>)}
    </div>
  }

  return <aside className={`sidebar workspace-sidebar ${mobile ? "workspace-sidebar-mobile" : "workspace-sidebar-desktop"}`}>
    <WorkspaceBrand />
    {user && <div className="workspace-company">
      <div className="sidebar-company-header">
        {user.companyLogoUrl && <img src={user.companyLogoUrl} alt="" className="sidebar-company-logo" />}
        <strong>{user.companyName || "CAMELEYON-ERP"}</strong>
      </div>
      <span>{profileValueLabel(user.role, language)}</span>
      {([user.firstName, user.lastName].some(Boolean) || user.email) &&
        <span className="workspace-user">{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</span>}
      <LanguageSwitcher className="sidebar-language-switcher" />
    </div>}
    <nav className="sidebar-nav" aria-label={text.navigation}>
      {isAdmin && group(text.overview, ["dashboard"])}
      {group(text.sales, isAdmin ? ["new-sale", "sales-history", "customers"] : ["new-sale", "sales-history"])}
      {isAdmin && group(text.stock, ["products", "inventory", "cost-rubrics"])}
      {isAdmin && group(text.business, ["profile", "settings"])}
    </nav>
    <div className="sidebar-footer">
      <a className="sidebar-button" href="https://www.cameleyondynamics.com/contact" target="_blank" rel="noreferrer">{copy.sidebar.contactUs}</a>
      {user && <button type="button" className="sidebar-button sidebar-logout-button" onClick={logoutUser}>{copy.common.logout}</button>}
    </div>
  </aside>
}

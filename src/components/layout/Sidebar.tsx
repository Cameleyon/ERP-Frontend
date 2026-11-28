import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { internalCopy } from "../../i18n/internalCopy"
import { setupCopy } from "../../i18n/setupCopy"
import type { Page } from "../../types/navigation"
import LanguageSwitcher from "../common/LanguageSwitcher"
import { calendarCopy } from "../profile/calendarCopy"
import { profileValueLabel } from "../profile/profileValueCopy"
import WorkspaceBrand from "./WorkspaceBrand"
import type { CompanyLocationResponse } from "../../api/companyLocationsApi"

const icons = {
  dashboard: <path d="M3 3h18v18H3zM7 16v-3m5 3V8m5 8v-5" />,
  "new-sale": <><path d="M2 4h3l2.5 10h10.8l2.2-7H6M13 8v4m-2-2h4" /><circle cx="9" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></>,
  "sales-history": <><path d="M4 3l2 1.5L8 3l2 1.5L12 3v12H4zM6.5 7.5h3m-3 3h2" /><circle cx="16.5" cy="15.5" r="5" /><path d="M16.5 13v3h2" /></>,
  customers: <><circle cx="9" cy="8" r="3" /><path d="M3 19v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1m1-14a3 3 0 0 1 0 6m1 2a4.5 4.5 0 0 1 4 4.5V19" /></>,
  products: <><path d="M3 5h8l10 10-6 6L3 9z" /><circle cx="7" cy="8" r="1" /></>,
  inventory: <path d="m3 7 9-4 9 4v13H3zM7 20V10h10v10m-10-6h10m-10 3h10" />,
  "cost-rubrics": <path d="M5 3h14v18H5zM5 9h14m-10 4h1m4 0h1m-6 4h1m4 0h1" />,
  profile: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="2.7" /><path d="M6.7 17c1-2.2 2.7-3.3 5.3-3.3s4.3 1.1 5.3 3.3" /></>,
  settings: <><path d="M4 6h5m5 0h6M4 12h9m5 0h2M4 18h2m5 0h9" /><circle cx="11.5" cy="6" r="2.5" /><circle cx="15.5" cy="12" r="2.5" /><circle cx="8.5" cy="18" r="2.5" /></>,
} satisfies Record<Page, React.ReactElement>

type Props = { page: Page; onNavigate: (page: Page) => void; mobile?: boolean; menuSites: CompanyLocationResponse[];
  menuSite: number | null; onMenuSiteChange: (id: number) => void }

export default function Sidebar({ page, onNavigate, mobile = false, menuSites, menuSite, onMenuSiteChange }: Props) {
  const { user, logoutUser } = useAuth()
  const { copy, language } = useI18n()
  const text = internalCopy[language]
  const isAdmin = user?.role === "ADMIN"
  const defaultSiteLabel = { en: "Default site", fr: "Site par défaut", es: "Sede predeterminada" }[language]
  const selectedSite = menuSites.find(site => site.id === menuSite)
  const companyName = user?.companyName || "CAMELEYON-ERP"
  const labels = { dashboard: copy.sidebar.dashboard, customers: copy.sidebar.customers,
    products: copy.sidebar.products, "cost-rubrics": copy.sidebar.costRubrics, "new-sale": copy.sidebar.newSale,
    "sales-history": copy.sidebar.salesHistory, inventory: copy.sidebar.inventory, profile: copy.common.profile,
    settings: calendarCopy[language].settings,
  }
  function group(title: string, pages: Page[]) {
    return <div className="workspace-nav-group" role="group" aria-label={title}>
      <p>{title}</p>
      {pages.map(target => <button type="button" key={target}
        className={`sidebar-button ${page === target ? "active" : ""}`.trim()}
        aria-current={page === target ? "page" : undefined} onClick={() => onNavigate(target)}>
        <svg className="workspace-nav-icon" viewBox="0 0 24 24" width="22" height="22"
          fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true" focusable="false">{icons[target]}</svg>
        <span className="workspace-nav-label">{labels[target]}</span>
      </button>)}
    </div>
  }

  return <aside className={`sidebar workspace-sidebar ${mobile ? "workspace-sidebar-mobile" : "workspace-sidebar-desktop"}`}>
    <div className="workspace-sidebar-header">
      <WorkspaceBrand />
      {user && <div className="workspace-company">
        <div className="sidebar-company-header">
          {user.companyLogoUrl && <img src={user.companyLogoUrl} alt="" className="sidebar-company-logo" />}
          {menuSites.length > 0 ? <label className="workspace-menu-site">
            <strong aria-hidden="true">{selectedSite?.name ?? companyName}</strong>
            <span className="workspace-menu-site-chevron" aria-hidden="true" />
            <select aria-label={defaultSiteLabel} value={selectedSite ? String(selectedSite.id) : ""}
              onChange={event => {
                if (event.target.value) onMenuSiteChange(Number(event.target.value))
              }}>
              <option value="" disabled hidden>{setupCopy[language].selectSite}</option>
              {menuSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </label> : <strong>{companyName}</strong>}
        </div>
        <span>{profileValueLabel(user.role, language)}</span>
        {([user.firstName, user.lastName].some(Boolean) || user.email) &&
          <span className="workspace-user">{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</span>}
        <LanguageSwitcher className="sidebar-language-switcher" />
      </div>}
    </div>
    <div className="workspace-sidebar-scroll">
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
    </div>
  </aside>
}

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import Sidebar from "./Sidebar"
import type { Page } from "../../types/navigation"
import { useI18n } from "../../i18n/I18nContext"
import { useAuth } from "../../auth/AuthContext"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../../api/companyLocationsApi"
import { internalCopy } from "../../i18n/internalCopy"
import TrialReminder from "./TrialReminder"
import WorkspaceBrand from "./WorkspaceBrand"
import { contrastingText } from "./workspaceAppearance"
import "./internalTokens.css"
import "./internalWorkspace.css"

type Props = {
    children: ReactNode
    page: Page
    onNavigate: (page: Page) => void
    menuSite: number | null
    onMenuSiteChange: (id: number) => void
}

export default function AppLayout({ children, page, onNavigate, menuSite, onMenuSiteChange }: Props) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [menuSites, setMenuSites] = useState<CompanyLocationResponse[]>([])
    const dialog = useRef<HTMLDialogElement>(null)
    const { copy, language } = useI18n()
    const { user } = useAuth()
    const text = internalCopy[language]
    const companyId = user?.companyId
    const sidebarText = contrastingText(user?.companySidebarColor)
    const appearance = {
        "--workspace-sidebar": user?.companySidebarColor || undefined,
        "--workspace-sidebar-text": sidebarText,
        "--workspace-sidebar-icon": user?.companySidebarColor ? sidebarText : undefined,
        "--workspace-action": user?.companyPrimaryColor || undefined,
        "--workspace-action-text": contrastingText(user?.companyPrimaryColor),
    } as CSSProperties

    useEffect(() => {
        if (!companyId) return
        let active = true
        getAccessibleCompanyLocations()
            .then(sites => { if (active) setMenuSites(sites.filter(site => site.active)) })
            .catch(() => { if (active) setMenuSites([]) })
        return () => { active = false }
    }, [companyId, page])

    useEffect(() => {
        const viewport = matchMedia("(max-width: 768px)")
        const closeOnDesktop = () => { if (!viewport.matches) dialog.current?.close() }
        viewport.addEventListener("change", closeOnDesktop)
        return () => viewport.removeEventListener("change", closeOnDesktop)
    }, [])

    function closeMobileMenu() {
        dialog.current?.close()
        setMobileSidebarOpen(false)
    }

    function handleNavigate(nextPage: Page) {
        closeMobileMenu()
        onNavigate(nextPage)
    }

    return (
        <div className="app-shell internal-shell" style={appearance}>
            <Sidebar page={page} onNavigate={handleNavigate} menuSites={menuSites} menuSite={menuSite} onMenuSiteChange={onMenuSiteChange} />
            <div className="workspace-main">
                <header className="workspace-topbar">
                    <div className="workspace-mobile-brand"><WorkspaceBrand /></div>
                    <button type="button" className="mobile-menu-button workspace-outline" aria-haspopup="dialog"
                        aria-expanded={mobileSidebarOpen} aria-controls="workspace-mobile-navigation" onClick={() => {
                            dialog.current?.showModal()
                            setMobileSidebarOpen(true)
                        }}>{copy.common.menu}</button>
                    <div className="workspace-topbar-actions">
                        <TrialReminder />
                    </div>
                </header>
                <main className={`app-content ${page === "dashboard" ? "workspace-dashboard-content" : ""}`.trim()}>
                    {children}
                </main>
            </div>
            <dialog id="workspace-mobile-navigation" ref={dialog} className="workspace-menu-dialog"
                aria-label={text.navigation} onClose={() => setMobileSidebarOpen(false)}
                onClick={event => { if (event.target === event.currentTarget) closeMobileMenu() }}>
                <div className="workspace-dialog-content">
                    <div className="workspace-dialog-actions">
                        <button type="button" className="workspace-outline" onClick={closeMobileMenu}>{text.closeMenu}</button>
                    </div>
                    {mobileSidebarOpen && <Sidebar page={page} onNavigate={handleNavigate} mobile
                        menuSites={menuSites} menuSite={menuSite} onMenuSiteChange={onMenuSiteChange} />}
                </div>
            </dialog>
        </div>
    )
}

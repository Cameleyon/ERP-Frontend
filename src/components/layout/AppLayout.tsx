import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import Sidebar from "./Sidebar"
import type { Page } from "../../types/navigation"
import { useI18n } from "../../i18n/I18nContext"
import { useAuth } from "../../auth/AuthContext"
import { internalCopy } from "../../i18n/internalCopy"
import { calendarCopy } from "../profile/calendarCopy"
import TrialReminder from "./TrialReminder"
import WorkspaceBrand from "./WorkspaceBrand"
import { contrastingText } from "./workspaceAppearance"
import "./internalTokens.css"
import "./internalWorkspace.css"

type Props = {
    children: ReactNode
    page: Page
    onNavigate: (page: Page) => void
}

export default function AppLayout({ children, page, onNavigate }: Props) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const dialog = useRef<HTMLDialogElement>(null)
    const { copy, language } = useI18n()
    const { user } = useAuth()
    const text = internalCopy[language]
    const pageLabel = { dashboard: copy.sidebar.dashboard, customers: copy.sidebar.customers,
        products: copy.sidebar.products, "cost-rubrics": copy.sidebar.costRubrics, "new-sale": copy.sidebar.newSale,
        "sales-history": copy.sidebar.salesHistory, inventory: copy.sidebar.inventory, profile: copy.common.profile,
        settings: calendarCopy[language].settings,
    }[page]
    const appearance = {
        "--workspace-sidebar": user?.companySidebarColor || undefined,
        "--workspace-sidebar-text": contrastingText(user?.companySidebarColor),
        "--workspace-action": user?.companyPrimaryColor || undefined,
        "--workspace-action-text": contrastingText(user?.companyPrimaryColor),
    } as CSSProperties

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
            <Sidebar page={page} onNavigate={handleNavigate} />
            <div className="workspace-main">
                <header className="workspace-topbar">
                    <div className="workspace-context">
                        {user?.companyName && <>{user.companyName}<span aria-hidden="true"> / </span></>}
                        <span aria-current="page">{pageLabel}</span>
                    </div>
                    <div className="workspace-mobile-brand"><WorkspaceBrand /></div>
                    {user?.role === "ADMIN" &&
                        <button type="button" className="workspace-profile workspace-text-action" onClick={() => handleNavigate("profile")}>{copy.common.profile}</button>}
                    <button type="button" className="mobile-menu-button workspace-outline" aria-haspopup="dialog"
                        aria-expanded={mobileSidebarOpen} aria-controls="workspace-mobile-navigation" onClick={() => {
                            dialog.current?.showModal()
                            setMobileSidebarOpen(true)
                        }}>{copy.common.menu}</button>
                </header>
                <main className={`app-content ${page === "dashboard" ? "workspace-dashboard-content" : ""}`.trim()}>
                    {page !== "dashboard" && <TrialReminder />}
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
                    {mobileSidebarOpen && <Sidebar page={page} onNavigate={handleNavigate} mobile />}
                </div>
            </dialog>
        </div>
    )
}

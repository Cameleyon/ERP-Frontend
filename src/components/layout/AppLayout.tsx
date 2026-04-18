import { useState, type ReactNode } from "react"
import Sidebar from "./Sidebar"
import type { Page } from "../../types/navigation"
import LanguageSwitcher from "../common/LanguageSwitcher"
import { useI18n } from "../../i18n/I18nContext"

type Props = {
    children: ReactNode
    page: Page
    onNavigate: (page: Page) => void
}

export default function AppLayout({ children, page, onNavigate }: Props) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const { copy } = useI18n()

    function handleNavigate(nextPage: Page) {
        onNavigate(nextPage)
        setMobileSidebarOpen(false)
    }

    return (
        <div className="app-shell">
            <Sidebar
                page={page}
                onNavigate={handleNavigate}
                mobileOpen={mobileSidebarOpen}
                onCloseMobile={() => setMobileSidebarOpen(false)}
            />

            <main className="app-content">
                <div className="mobile-topbar">
                    <LanguageSwitcher />
                    <button
                        type="button"
                        className="mobile-menu-button"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        {copy.common.menu}
                    </button>
                </div>

                {children}
            </main>
        </div>
    )
}

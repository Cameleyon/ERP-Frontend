import { useAuth } from "../auth/AuthContext"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import { useI18n } from "../i18n/I18nContext"

type Props = {
  platformAppUrl: string
}

export default function PlatformRedirectPage({ platformAppUrl }: Props) {
  const { logoutUser, user } = useAuth()
  const { language } = useI18n()

  const text =
    language === "fr"
      ? {
          title: "Utilisez le portail plateforme",
          message:
            "Les espaces super admin et promoteur se connectent maintenant sur un portail dedie pour garder l'application entreprise plus legere.",
          openPlatform: "Ouvrir le portail plateforme",
          logout: "Deconnexion",
          connectedAs: "Connecte en tant que",
        }
      : language === "es"
        ? {
            title: "Use el portal de plataforma",
            message:
              "Los espacios de superadministrador y promotor ahora se conectan en un portal dedicado para mantener la aplicacion de empresa mas ligera.",
            openPlatform: "Abrir el portal de plataforma",
            logout: "Cerrar sesion",
            connectedAs: "Conectado como",
          }
        : {
            title: "Use the platform portal",
            message:
              "Super admin and promoter workspaces now sign in through a dedicated portal so the company app stays lighter.",
            openPlatform: "Open platform portal",
            logout: "Logout",
            connectedAs: "Signed in as",
          }

  return (
    <div className="platform-role-page">
      <div className="platform-role-card card">
        <div className="platform-login-topbar">
          <LanguageSwitcher />
          <button type="button" className="secondary-button" onClick={logoutUser}>
            {text.logout}
          </button>
        </div>

        <h1>{text.title}</h1>
        <p>{text.message}</p>
        <p className="platform-role-meta">
          {text.connectedAs}: <strong>{user?.email}</strong>
        </p>
        <a className="platform-role-link" href={platformAppUrl}>
          {text.openPlatform}
        </a>
      </div>
    </div>
  )
}

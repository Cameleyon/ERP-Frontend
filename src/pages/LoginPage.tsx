import { useState } from "react"
import { useAuth } from "../auth/AuthContext"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import { useI18n } from "../i18n/I18nContext"

type Props = {
  onGoToHome?: () => void
  onGoToSignup?: () => void
}

export default function LoginPage({ onGoToHome, onGoToSignup }: Props) {
  const { loginUser } = useAuth()
  const { language } = useI18n()

  const text = language === "fr"
    ? {
        fallbackError: "La connexion a echoue",
        backHome: "Retour a l'accueil",
        signUp: "S'inscrire",
        subtitle: "Connectez-vous pour continuer",
        email: "Email",
        password: "Mot de passe",
        passwordPlaceholder: "Entrez votre mot de passe",
        emailPlaceholder: "vous@exemple.com",
        submitting: "Connexion...",
        submit: "Se connecter",
      }
    : language === "es"
      ? {
          fallbackError: "Error de inicio de sesion",
          backHome: "Volver al inicio",
          signUp: "Registrarse",
          subtitle: "Inicia sesion para continuar",
          email: "Correo electronico",
          password: "Contrasena",
          passwordPlaceholder: "Ingrese su contrasena",
          emailPlaceholder: "usted@ejemplo.com",
          submitting: "Conectando...",
          submit: "Iniciar sesion",
        }
      : {
          fallbackError: "Login failed",
          backHome: "Back to home",
          signUp: "Sign Up",
          subtitle: "Sign in to continue",
          email: "Email",
          password: "Password",
          passwordPlaceholder: "Enter your password",
          emailPlaceholder: "you@example.com",
          submitting: "Logging in...",
          submit: "Login",
        }

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)
      setError("")
      await loginUser({ email, password })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.fallbackError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-language-row">
          <LanguageSwitcher />
        </div>

        <div className="hero-actions">
          {onGoToHome && (
            <button type="button" className="secondary-button" onClick={onGoToHome}>
              {text.backHome}
            </button>
          )}
          {onGoToSignup && (
            <button type="button" className="secondary-button" onClick={onGoToSignup}>
              {text.signUp}
            </button>
          )}
        </div>

        <h1>CAMELEYON ERP</h1>
        <p>{text.subtitle}</p>

        {error && <div className="card error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            {text.email}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={text.emailPlaceholder}
            />
          </label>

          <label>
            {text.password}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={text.passwordPlaceholder}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? text.submitting : text.submit}
          </button>
        </form>
      </div>
    </div>
  )
}

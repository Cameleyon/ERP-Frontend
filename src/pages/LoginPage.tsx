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
        fallbackError: "La connexion a échoué",
        backHome: "Retour à l'accueil",
        signUp: "S'inscrire",
        subtitle: "Connectez-vous pour continuer",
        password: "Mot de passe",
        passwordPlaceholder: "Entrez votre mot de passe",
        emailPlaceholder: "vous@exemple.com",
        submitting: "Connexion...",
        submit: "Se connecter",
      }
    : {
        fallbackError: "Login failed",
        backHome: "Back to home",
        signUp: "Sign Up",
        subtitle: "Sign in to continue",
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
            Email
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

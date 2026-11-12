import { useEffect, useRef, useState } from "react"
import { useAuth } from "../auth/AuthContext"
import {
  confirmPasswordReset,
  requestPasswordReset,
  type PasswordResetStartResponse,
  type CompanyAccountType,
} from "../auth/authApi"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import SupportContact from "../components/common/SupportContact"
import { useI18n } from "../i18n/I18nContext"
import ErrorMessage from "../components/common/ErrorMessage"

type Props = {
  onGoToHome?: () => void
  onGoToSignup?: () => void
  registeredEmail?: string
  onSignedIn?: () => void
}

export default function LoginPage({ onGoToHome, onGoToSignup, registeredEmail, onSignedIn }: Props) {
  const { loginUser } = useAuth()
  const { language } = useI18n()
  const accountText = language === "fr"
    ? {
        choose: "Comment souhaitez-vous vous connecter ?",
        owner: "Propriétaire", user: "Utilisateur d'une entreprise",
        ownerHint: "Vous avez enregistré votre entreprise.",
        userHint: "Votre compte a été créé par le propriétaire.",
        missingOwner: "Vous n'avez pas de compte en tant que propriétaire. Essayez de vous connecter comme utilisateur, ou contactez CAMELEYON Dynamics : contact@cameleyondynamics.com.",
        missingUser: "Vous n'avez pas de compte en tant qu'utilisateur d'une entreprise. Essayez de vous connecter comme propriétaire, ou contactez CAMELEYON Dynamics : contact@cameleyondynamics.com.",
        ambiguous: "Plusieurs comptes correspondent à ce choix. Contactez l'assistance technique : contact@cameleyondynamics.com.",
      }
    : language === "es"
      ? {
          choose: "¿Cómo desea iniciar sesión?",
          owner: "Propietario", user: "Usuario de una empresa",
          ownerHint: "Usted registró su empresa.", userHint: "El propietario creó su cuenta.",
          missingOwner: "No tiene una cuenta de propietario. Intente iniciar sesión como usuario o contacte con CAMELEYON Dynamics: contact@cameleyondynamics.com.",
          missingUser: "No tiene una cuenta de usuario de empresa. Intente iniciar sesión como propietario o contacte con CAMELEYON Dynamics: contact@cameleyondynamics.com.",
          ambiguous: "Hay varias cuentas para esta opción. Contacte con asistencia técnica: contact@cameleyondynamics.com.",
        }
      : {
          choose: "How would you like to sign in?",
          owner: "Owner", user: "Business user",
          ownerHint: "You registered your business.", userHint: "The owner created your account.",
          missingOwner: "You don't have an owner account. Try signing in as a business user, or contact CAMELEYON Dynamics: contact@cameleyondynamics.com.",
          missingUser: "You don't have a business user account. Try signing in as an owner, or contact CAMELEYON Dynamics: contact@cameleyondynamics.com.",
          ambiguous: "Multiple accounts match this choice. Contact technical support: contact@cameleyondynamics.com.",
        }
  const [accountType, setAccountType] = useState<CompanyAccountType | null>(registeredEmail ? "OWNER" : null)
  const [showRegistrationMessage, setShowRegistrationMessage] = useState(Boolean(registeredEmail))
  const registrationMessageRef = useRef<HTMLDivElement>(null)
  const registrationMessage = language === "fr"
    ? "Votre compte a été créé avec succès. Connectez-vous à votre nouveau compte."
    : language === "es"
      ? "Su cuenta se ha creado correctamente. Inicie sesión en su nueva cuenta."
      : "Your account has been created successfully. Log in to your new account."

  useEffect(() => {
    if (registeredEmail) registrationMessageRef.current?.focus()
  }, [registeredEmail])

  function accountError(err: unknown, fallback: string) {
    const message = err instanceof Error ? err.message : fallback
    if (message === "NO_OWNER_ACCOUNT") return accountText.missingOwner
    if (message === "NO_USER_ACCOUNT") return accountText.missingUser
    if (message === "ACCOUNT_TYPE_REQUIRED") return accountText.choose
    if (message === "MULTIPLE_COMPANY_ACCOUNTS_CONTACT_SUPPORT") return accountText.ambiguous
    return message
  }

  const text = language === "fr"
    ? {
        fallbackError: "La connexion a échoué",
        resetFallbackError: "La réinitialisation du mot de passe a échoué",
        backHome: "Retour à l'accueil",
        signUp: "S'inscrire",
        subtitle: "Connectez-vous pour continuer",
        email: "Email",
        password: "Mot de passe",
        passwordPlaceholder: "Entrez votre mot de passe",
        emailPlaceholder: "vous@exemple.com",
        submitting: "Connexion...",
        submit: "Se connecter",
        forgotPassword: "Mot de passe oublié ?",
        requestReset: "Envoyer un code",
        requestingReset: "Envoi du code...",
        resetTitle: "Réinitialiser le mot de passe",
        resetSubtitle: (email: string) => `Saisissez le code envoyé à ${email}.`,
        resetHint: "Vous avez 3 essais et 10 minutes.",
        resetCode: "Code de vérification",
        resetCodePlaceholder: "Entrez le code",
        newPassword: "Nouveau mot de passe",
        newPasswordPlaceholder: "Entrez votre nouveau mot de passe",
        confirmNewPassword: "Confirmer le nouveau mot de passe",
        confirmNewPasswordPlaceholder: "Confirmez votre nouveau mot de passe",
        confirmReset: "Mettre à jour le mot de passe",
        confirmingReset: "Mise à jour...",
        resetSuccess: "Mot de passe mis à jour. Vous pouvez maintenant vous connecter.",
        emailRequiredForReset: "Renseignez d'abord votre e-mail.",
        passwordMismatch: "La confirmation du mot de passe ne correspond pas.",
        verificationCodeRequired: "Le code de vérification est requis.",
        newPasswordRequired: "Le nouveau mot de passe est requis.",
        attemptsRemaining: (count: number) => `Essais restants : ${count}`,
        timeRemaining: (count: number) => `Temps restant : ${count}s`,
      }
    : language === "es"
      ? {
          fallbackError: "Error de inicio de sesión",
          resetFallbackError: "La restauración de contraseña falló",
          backHome: "Volver al inicio",
          signUp: "Registrarse",
          subtitle: "Inicia sesión para continuar",
          email: "Correo electrónico",
          password: "Contraseña",
          passwordPlaceholder: "Ingrese su contraseña",
          emailPlaceholder: "usted@ejemplo.com",
          submitting: "Conectando...",
          submit: "Iniciar sesión",
          forgotPassword: "¿Olvidó su contraseña?",
          requestReset: "Enviar código",
          requestingReset: "Enviando código...",
          resetTitle: "Restablecer contraseña",
          resetSubtitle: (email: string) => `Ingrese el código enviado a ${email}.`,
          resetHint: "Tiene 3 intentos y 10 minutos.",
          resetCode: "Código de verificación",
          resetCodePlaceholder: "Ingrese el código",
          newPassword: "Nueva contraseña",
          newPasswordPlaceholder: "Ingrese su nueva contraseña",
          confirmNewPassword: "Confirmar nueva contraseña",
          confirmNewPasswordPlaceholder: "Confirme su nueva contraseña",
          confirmReset: "Actualizar contraseña",
          confirmingReset: "Actualizando...",
          resetSuccess: "Contraseña actualizada. Ahora puede iniciar sesión.",
          emailRequiredForReset: "Primero ingrese su correo.",
          passwordMismatch: "La confirmación de la contraseña no coincide.",
          verificationCodeRequired: "El código de verificación es obligatorio.",
          newPasswordRequired: "La nueva contraseña es obligatoria.",
          attemptsRemaining: (count: number) => `Intentos restantes: ${count}`,
          timeRemaining: (count: number) => `Tiempo restante: ${count}s`,
        }
      : {
          fallbackError: "Login failed",
          resetFallbackError: "Password reset failed",
          backHome: "Back to home",
          signUp: "Sign Up",
          subtitle: "Sign in to continue",
          email: "Email",
          password: "Password",
          passwordPlaceholder: "Enter your password",
          emailPlaceholder: "you@example.com",
          submitting: "Logging in...",
          submit: "Login",
          forgotPassword: "Forgot password?",
          requestReset: "Send code",
          requestingReset: "Sending code...",
          resetTitle: "Reset password",
          resetSubtitle: (email: string) => `Enter the code sent to ${email}.`,
          resetHint: "You have 3 attempts and 10 minutes.",
          resetCode: "Verification code",
          resetCodePlaceholder: "Enter the code",
          newPassword: "New password",
          newPasswordPlaceholder: "Enter your new password",
          confirmNewPassword: "Confirm new password",
          confirmNewPasswordPlaceholder: "Confirm your new password",
          confirmReset: "Update password",
          confirmingReset: "Updating...",
          resetSuccess: "Password updated. You can now log in.",
          emailRequiredForReset: "Enter your email first.",
          passwordMismatch: "Password confirmation does not match.",
          verificationCodeRequired: "Verification code is required.",
          newPasswordRequired: "New password is required.",
          attemptsRemaining: (count: number) => `Attempts remaining: ${count}`,
          timeRemaining: (count: number) => `Time remaining: ${count}s`,
        }

  const [email, setEmail] = useState(registeredEmail ?? "")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [requestingReset, setRequestingReset] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [resetError, setResetError] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [pendingReset, setPendingReset] = useState<PasswordResetStartResponse | null>(null)

  useEffect(() => {
    if (!pendingReset) {
      setSecondsLeft(0)
      return
    }

    const expiresAt = pendingReset.expiresAt

    function updateCountdown() {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      )
      setSecondsLeft(remaining)

      if (remaining <= 0) {
        setPendingReset(null)
        setResetCode("")
        setNewPassword("")
        setConfirmNewPassword("")
        setResetError(text.resetFallbackError)
      }
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [pendingReset, text.resetFallbackError])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountType) return

    try {
      setLoading(true)
      setError("")
      setSuccess("")
      await loginUser({ email: email.trim(), password, accountType })
      onSignedIn?.()
    } catch (err) {
      console.error(err)
      setError(accountError(err, text.fallbackError))
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestReset() {
    if (!accountType) return
    if (!email.trim()) {
      setError(text.emailRequiredForReset)
      return
    }

    try {
      setRequestingReset(true)
      setError("")
      setSuccess("")
      setResetError("")
      const response = await requestPasswordReset({ email: email.trim(), accountType })
      setPendingReset(response)
      setResetCode("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (err) {
      console.error(err)
      setError(accountError(err, text.resetFallbackError))
    } finally {
      setRequestingReset(false)
    }
  }

  async function handleConfirmReset(event: React.FormEvent) {
    event.preventDefault()

    if (!pendingReset) {
      return
    }
    if (!resetCode.trim()) {
      setResetError(text.verificationCodeRequired)
      return
    }
    if (!newPassword.trim()) {
      setResetError(text.newPasswordRequired)
      return
    }
    if (newPassword !== confirmNewPassword) {
      setResetError(text.passwordMismatch)
      return
    }

    try {
      setConfirmingReset(true)
      setResetError("")
      const response = await confirmPasswordReset({
        pendingResetId: pendingReset.pendingResetId,
        verificationCode: resetCode.trim(),
        newPassword: newPassword.trim(),
      })

      if (!response.reset) {
        if (response.requiresRestart || response.expired) {
          setPendingReset(null)
          setResetCode("")
          setNewPassword("")
          setConfirmNewPassword("")
        } else {
          setPendingReset((current) => current
            ? { ...current, attemptsRemaining: response.attemptsRemaining }
            : current)
        }
        setResetError(response.message)
        return
      }

      setPendingReset(null)
      setResetCode("")
      setNewPassword("")
      setConfirmNewPassword("")
      setSuccess(text.resetSuccess)
      setPassword("")
    } catch (err) {
      console.error(err)
      setResetError(err instanceof Error ? err.message : text.resetFallbackError)
    } finally {
      setConfirmingReset(false)
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
        {showRegistrationMessage && (
          <div ref={registrationMessageRef} className="card success" role="status" tabIndex={-1}>
            {registrationMessage}
          </div>
        )}
        <p>{accountType ? text.subtitle : accountText.choose}</p>

        <fieldset className="account-type-selector" disabled={loading || requestingReset}>
          <legend className="visually-hidden">{accountText.choose}</legend>
          {(["OWNER", "USER"] as const).map((type) => (
            <label key={type} className={accountType === type ? "selected" : ""}>
              <input type="radio" name="accountType" value={type} checked={accountType === type}
                onChange={() => {
                  setAccountType(type)
                  setShowRegistrationMessage(false)
                  setPassword("")
                  setError("")
                  setSuccess("")
                  setPendingReset(null)
                  setResetError("")
                }} />
              <span><strong>{type === "OWNER" ? accountText.owner : accountText.user}</strong>
                <small>{type === "OWNER" ? accountText.ownerHint : accountText.userHint}</small></span>
            </label>
          ))}
        </fieldset>

        {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
        {success && <div className="card success">{success}</div>}

        {accountType && <><form onSubmit={handleSubmit} className="login-form">
          <label>
            {text.email}
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={text.emailPlaceholder}
            />
          </label>

          <label>
            {text.password}
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={text.passwordPlaceholder}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? text.submitting : text.submit}
          </button>
        </form>

        <button
          type="button"
          className="inline-text-button"
          onClick={handleRequestReset}
          disabled={requestingReset}
        >
          {requestingReset ? text.requestingReset : text.forgotPassword}
        </button>
        </>}
        <SupportContact />
      </div>

      {pendingReset && (
        <div className="auth-overlay">
          <div className="auth-overlay-card">
            <h2>{text.resetTitle}</h2>
            <p>{text.resetSubtitle(pendingReset.email)}</p>
            <p>{text.resetHint}</p>
            <p><strong>{text.attemptsRemaining(pendingReset.attemptsRemaining)}</strong></p>
            <p><strong>{text.timeRemaining(secondsLeft)}</strong></p>

            {resetError && <div className="card error">{resetError}</div>}

            <form onSubmit={handleConfirmReset} className="login-form">
              <label>
                {text.resetCode}
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder={text.resetCodePlaceholder}
                  autoFocus
                />
              </label>

              <label>
                {text.newPassword}
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={text.newPasswordPlaceholder}
                />
              </label>

              <label>
                {text.confirmNewPassword}
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={text.confirmNewPasswordPlaceholder}
                />
              </label>

              <button type="submit" disabled={confirmingReset || secondsLeft <= 0}>
                {confirmingReset ? text.confirmingReset : text.confirmReset}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

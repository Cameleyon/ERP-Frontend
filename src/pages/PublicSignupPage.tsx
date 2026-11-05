import { useEffect, useRef, useState, type FormEvent } from "react"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import SupportContact from "../components/common/SupportContact"
import { useI18n } from "../i18n/I18nContext"
import { confirmSignupCompany, signupCompany, type PublicSignupVerificationStartResponse } from "../api/publicSignupApi"
import { getBrowserTimeZone } from "../utils/companyLocalization"
import { newSignupAttemptId, signupErrorReason, trackSignupEvent } from "../utils/visitTracking"

type Props = {
  onSignupComplete: (email: string) => void
  onGoToHome: () => void
}

export default function PublicSignupPage({ onSignupComplete, onGoToHome }: Props) {
  const { language } = useI18n()
  const text = language === "fr" ? {
    title: "Inscription", home: "Retour à l'accueil", company: "Nom de l'entreprise", email: "Email du propriétaire", password: "Mot de passe",
    passwordHint: "8 caractères minimum", termsPrefix: "J'ai lu et j'accepte les", termsLink: "conditions d'utilisation",
    termsTitle: "Conditions d'utilisation CAMELEYON ERP", close: "Fermer", cancel: "Annuler",
    submit: "Créer mon compte", submitting: "Envoi du code...", verificationTitle: "Confirmer l'e-mail du propriétaire",
    verificationText: (email: string) => `Saisissez le code envoyé à ${email}.`, verificationHint: "Vous avez 3 essais et 30 secondes.",
    code: "Code de vérification", confirm: "Confirmer le code", confirming: "Vérification...",
    attempts: (count: number) => `Essais restants : ${count}`, time: (count: number) => `Temps restant : ${count}s`,
    required: "Renseignez le nom de l'entreprise, votre e-mail et un mot de passe d'au moins 8 caractères.",
    termsRequired: "Vous devez accepter les conditions d'utilisation pour continuer.", codeRequired: "Le code de vérification est requis.",
    failed: "L'inscription a échoué. Veuillez réessayer.", expired: "Le délai de vérification est expiré. Veuillez demander un nouveau code.",
    activeOwner: "Vous possédez déjà une entreprise active avec cet e-mail. Connectez-vous comme propriétaire ou contactez l'assistance technique : contact@cameleyondynamics.com.",
    paragraphs: [
      "CAMELEYON ERP est fourni par CAMELEYON Dynamics pour aider l'entreprise à gérer ses ventes, son inventaire, ses produits, ses prix, ses clients, ses factures et ses opérations.",
      "L'entreprise confirme que les informations fournies lors de l'inscription sont exactes et que l'administrateur principal est responsable de la gestion des utilisateurs, des accès et des données de l'entreprise.",
      "L'utilisation de la solution peut dépendre d'un abonnement payant. Tout mois commencé est dû. CAMELEYON se réserve le droit de revoir le prix de l'abonnement au besoin, avec information préalable lorsque nécessaire.",
      "L'entreprise demeure responsable des données qu'elle saisit dans la solution. CAMELEYON met en place des mesures raisonnables pour protéger la plateforme, mais l'entreprise doit aussi protéger ses identifiants et l'accès à ses comptes.",
      "Certaines fonctionnalités, comme l'envoi d'e-mails, les paiements automatiques, les rapports ou les intégrations externes, peuvent dépendre de services tiers et de leur disponibilité.",
      "CAMELEYON peut limiter, suspendre ou bloquer l'accès en cas de non-paiement, d'utilisation abusive, de tentative de fraude, d'atteinte à la sécurité ou de violation des présentes conditions.",
      "En créant son compte, l'entreprise accepte ces conditions et comprend qu'elles peuvent être mises à jour au besoin pour tenir compte de l'évolution du service.",
    ],
  } : language === "es" ? {
    title: "Registro", home: "Volver al inicio", company: "Nombre de la empresa", email: "Correo del propietario", password: "Contraseña",
    passwordHint: "Mínimo 8 caracteres", termsPrefix: "He leído y acepto los", termsLink: "términos de uso",
    termsTitle: "Términos de uso de CAMELEYON ERP", close: "Cerrar", cancel: "Cancelar",
    submit: "Crear mi cuenta", submitting: "Enviando código...", verificationTitle: "Confirmar correo del propietario",
    verificationText: (email: string) => `Ingrese el código enviado a ${email}.`, verificationHint: "Tiene 3 intentos y 30 segundos.",
    code: "Código de verificación", confirm: "Confirmar código", confirming: "Verificando...",
    attempts: (count: number) => `Intentos restantes: ${count}`, time: (count: number) => `Tiempo restante: ${count}s`,
    required: "Ingrese el nombre de la empresa, su correo y una contraseña de al menos 8 caracteres.",
    termsRequired: "Debe aceptar los términos de uso para continuar.", codeRequired: "El código de verificación es obligatorio.",
    failed: "El registro falló. Inténtelo de nuevo.", expired: "El tiempo de verificación expiró. Solicite un nuevo código.",
    activeOwner: "Ya tiene una empresa activa con este correo. Inicie sesión como propietario o contacte con asistencia técnica: contact@cameleyondynamics.com.",
    paragraphs: [
      "CAMELEYON ERP es proporcionado por CAMELEYON Dynamics para ayudar a la empresa a gestionar ventas, inventario, productos, precios, clientes, facturas y operaciones.",
      "La empresa confirma que la información enviada durante el registro es correcta y que el administrador principal es responsable de gestionar usuarios, accesos y datos de la empresa.",
      "El uso de la solución puede depender de una suscripción paga. Todo mes iniciado debe pagarse. CAMELEYON se reserva el derecho de revisar el precio de la suscripción cuando sea necesario, con aviso previo cuando corresponda.",
      "La empresa sigue siendo responsable de los datos que introduce en la solución. CAMELEYON aplica medidas razonables para proteger la plataforma, pero la empresa también debe proteger sus credenciales y el acceso a sus cuentas.",
      "Algunas funciones, como envío de correos, pagos automáticos, informes o integraciones externas, pueden depender de servicios de terceros y de su disponibilidad.",
      "CAMELEYON puede limitar, suspender o bloquear el acceso en caso de falta de pago, uso abusivo, intento de fraude, riesgo de seguridad o incumplimiento de estos términos.",
      "Al crear su cuenta, la empresa acepta estos términos y entiende que pueden actualizarse cuando sea necesario para reflejar la evolución del servicio.",
    ],
  } : {
    title: "Sign Up", home: "Back to home", company: "Company name", email: "Owner email", password: "Password",
    passwordHint: "At least 8 characters", termsPrefix: "I have read and accept the", termsLink: "terms of use",
    termsTitle: "CAMELEYON ERP Terms of Use", close: "Close", cancel: "Cancel",
    submit: "Create my account", submitting: "Sending code...", verificationTitle: "Confirm owner email",
    verificationText: (email: string) => `Enter the code sent to ${email}.`, verificationHint: "You have 3 attempts and 30 seconds.",
    code: "Verification code", confirm: "Confirm code", confirming: "Verifying...",
    attempts: (count: number) => `Attempts remaining: ${count}`, time: (count: number) => `Time remaining: ${count}s`,
    required: "Enter the company name, your email and a password of at least 8 characters.",
    termsRequired: "You must accept the terms of use to continue.", codeRequired: "Verification code is required.",
    failed: "Signup failed. Please try again.", expired: "Verification expired. Please request a new code.",
    activeOwner: "You already own an active business with this email. Sign in as an owner or contact technical support: contact@cameleyondynamics.com.",
    paragraphs: [
      "CAMELEYON ERP is provided by CAMELEYON Dynamics to help the company manage sales, inventory, products, pricing, customers, invoices, and operations.",
      "The company confirms that the information submitted during signup is accurate and that the main administrator is responsible for managing users, access, and company data.",
      "Use of the solution may depend on a paid subscription. Any month that has started is due. CAMELEYON reserves the right to review subscription pricing when needed, with prior notice when required.",
      "The company remains responsible for the data it enters into the solution. CAMELEYON applies reasonable measures to protect the platform, but the company must also protect credentials and account access.",
      "Some features, such as email delivery, automatic payments, reports, or external integrations, may depend on third-party services and their availability.",
      "CAMELEYON may limit, suspend, or block access in case of non-payment, abusive use, attempted fraud, security risk, or breach of these terms.",
      "By creating an account, the company accepts these terms and understands that they may be updated when needed to reflect the evolution of the service.",
    ],
  }

  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [verificationError, setVerificationError] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [pending, setPending] = useState<PublicSignupVerificationStartResponse | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [showTerms, setShowTerms] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const verificationRef = useRef<HTMLDialogElement>(null)
  const termsRef = useRef<HTMLDialogElement>(null)
  const pendingSignupId = pending?.pendingSignupId
  const pageTracked = useRef(false)
  const attemptId = useRef<string | null>(null)
  const validationTracked = useRef(false)

  function getAttemptId() {
    if (!attemptId.current) attemptId.current = newSignupAttemptId()
    return attemptId.current
  }
  function resetAttempt() { attemptId.current = null; validationTracked.current = false }
  function trackValidationError() {
    if (!validationTracked.current) {
      trackSignupEvent("FORM_ERROR", getAttemptId(), "VALIDATION")
      validationTracked.current = true
    }
  }
  function cancelVerification() {
    trackSignupEvent("CANCELLED", attemptId.current)
    resetAttempt()
    setPending(null)
  }

  useEffect(() => {
    if (!pageTracked.current) { pageTracked.current = true; trackSignupEvent("PAGE_VIEW") }
  }, [])

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  useEffect(() => { if (pendingSignupId) verificationRef.current?.showModal() }, [pendingSignupId])
  useEffect(() => { if (showTerms) termsRef.current?.showModal() }, [showTerms])
  useEffect(() => {
    if (!pending) return
    function tick() {
      const remaining = Math.max(0, Math.ceil((new Date(pending!.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (!remaining) {
        trackSignupEvent("CODE_EXPIRED", attemptId.current, "CODE_EXPIRED")
        attemptId.current = null; validationTracked.current = false
        setPending(null); setVerificationCode(""); setError(text.expired)
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [pending, text.expired])

  function message(err: unknown) {
    return err instanceof Error ? err.message === "ACTIVE_COMPANY_OWNER_EXISTS" ? text.activeOwner : err.message : text.failed
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!companyName.trim() || !email.trim() || password.length < 8) { trackValidationError(); setError(text.required); return }
    if (!termsAccepted) { trackValidationError(); setError(text.termsRequired); return }
    const currentAttempt = getAttemptId()
    trackSignupEvent("FORM_SUBMITTED", currentAttempt)
    try {
      setSaving(true); setError(""); setVerificationError(""); setVerificationCode("")
      const response = await signupCompany({ companyName: companyName.trim(), adminEmail: email.trim(), adminPassword: password,
        termsAccepted, timeZoneId: getBrowserTimeZone() })
      setPending(response)
      trackSignupEvent("CODE_SENT", currentAttempt)
    } catch (err) {
      trackSignupEvent("FORM_ERROR", currentAttempt, signupErrorReason(err)); resetAttempt(); setError(message(err))
    }
    finally { setSaving(false) }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault()
    if (!pending) return
    const currentAttempt = attemptId.current
    if (!verificationCode.trim()) { trackSignupEvent("VERIFICATION_ERROR", currentAttempt, "VALIDATION"); setVerificationError(text.codeRequired); return }
    try {
      setVerifying(true); setVerificationError("")
      const response = await confirmSignupCompany({ pendingSignupId: pending.pendingSignupId, verificationCode: verificationCode.trim() })
      if (!response.verified) {
        if (response.expired || response.requiresRestart) {
          trackSignupEvent(response.expired ? "CODE_EXPIRED" : "VERIFICATION_ERROR", currentAttempt,
            response.expired ? "CODE_EXPIRED" : "ATTEMPTS_EXHAUSTED")
          resetAttempt(); setPending(null); setError(response.message || text.expired)
        } else {
          trackSignupEvent("VERIFICATION_ERROR", currentAttempt, "INVALID_CODE")
          setPending({ ...pending, attemptsRemaining: response.attemptsRemaining }); setVerificationError(response.message)
        }
        return
      }
      if (!response.signup) { trackSignupEvent("VERIFICATION_ERROR", currentAttempt, "INVALID_RESPONSE"); setVerificationError(text.failed); return }
      trackSignupEvent("COMPLETED", currentAttempt)
      resetAttempt()
      setPending(null)
      onSignupComplete(response.signup.adminEmail)
    } catch (err) { trackSignupEvent("VERIFICATION_ERROR", currentAttempt, signupErrorReason(err)); setVerificationError(message(err)) }
    finally { setVerifying(false) }
  }

  return (
    <div className="public-page public-signup-page">
      <section className="card public-signup-form">
        <div className="login-language-row"><LanguageSwitcher /></div>
        <button type="button" className="secondary-button" onClick={onGoToHome}>{text.home}</button>
        <h1>{text.title}</h1>
        <form onSubmit={handleSubmit} onInvalidCapture={trackValidationError} className="login-form">
          <label>{text.company}<input required maxLength={255} autoComplete="organization" value={companyName} onChange={event => setCompanyName(event.target.value)} /></label>
          <label>{text.email}<input required type="email" maxLength={255} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>{text.password}<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} aria-describedby="signup-password-hint" /><small id="signup-password-hint">{text.passwordHint}</small></label>
          <label className="terms-acceptance"><input type="checkbox" checked={termsAccepted} onChange={event => { setTermsAccepted(event.target.checked); if (error === text.termsRequired) setError("") }} /><span>{text.termsPrefix} <button className="link-button" type="button" onClick={() => setShowTerms(true)}>{text.termsLink}</button>.</span></label>
          {error && <div ref={errorRef} className="card error" role="alert" tabIndex={-1}>{error}</div>}
          <button type="submit" disabled={saving}>{saving ? text.submitting : text.submit}</button>
        </form>
        <SupportContact />
      </section>
      {pending && <dialog ref={verificationRef} className="card signup-dialog" aria-labelledby="signup-verification-title" onCancel={event => { if (verifying) event.preventDefault(); else cancelVerification() }}>
        <h2 id="signup-verification-title">{text.verificationTitle}</h2>
        <p>{text.verificationText(pending.adminEmail)}</p><p>{text.verificationHint}</p>
        <p><strong>{text.attempts(pending.attemptsRemaining)}</strong></p><p><strong>{text.time(secondsLeft)}</strong></p>
        <form onSubmit={handleConfirm} className="login-form">
          <label>{text.code}<input autoFocus inputMode="numeric" autoComplete="one-time-code" value={verificationCode} onChange={event => setVerificationCode(event.target.value)} /></label>
          {verificationError && <div className="card error" role="alert">{verificationError}</div>}
          <button type="submit" disabled={verifying || secondsLeft <= 0}>{verifying ? text.confirming : text.confirm}</button>
          <button type="button" className="secondary-button" disabled={verifying} onClick={cancelVerification}>{text.cancel}</button>
        </form>
      </dialog>}
      {showTerms && <dialog ref={termsRef} className="card signup-dialog terms-dialog" aria-labelledby="signup-terms-title" onCancel={() => setShowTerms(false)}>
        <h2 id="signup-terms-title">{text.termsTitle}</h2>
        <div className="terms-dialog-body">{text.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
        <button type="button" onClick={() => setShowTerms(false)}>{text.close}</button>
      </dialog>}
    </div>
  )
}

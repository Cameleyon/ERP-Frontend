import { useEffect, useState } from "react"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import { useI18n } from "../i18n/I18nContext"
import { getPublicPlans, type PublicPlanResponse } from "../api/publicPlansApi"
import {
  getPublicPromotions,
  type PublicPromotionResponse,
} from "../api/publicPromotionsApi"
import { formatCurrency } from "../utils/format"

type Props = {
  onGoToSignup: () => void
  onGoToLogin: () => void
}

export default function PublicLandingPage({ onGoToSignup, onGoToLogin }: Props) {
  const { language } = useI18n()
  const [plans, setPlans] = useState<PublicPlanResponse[]>([])
  const [promotions, setPromotions] = useState<PublicPromotionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const text = language === "fr"
    ? {
        loadError: "Impossible de charger les données publiques",
        badge: "Propulsé par CAMELEYON Dynamics",
        heroSubtitle: "Une seule plateforme pour les opérations, le stock, les ventes et la croissance.",
        signUp: "S'inscrire",
        login: "Se connecter",
        introTitle:
          "CAMELEYON ERP réunit les ventes, l'inventaire, les produits, les prix et la prise de décision dans un espace de travail élégant conçu pour les organisations en croissance.",
        introSubtitle: "Fini les tableurs et les feuilles dispersées.",
        featuresEyebrow: "Fonctionnalités clés",
        featuresTitle: "Tout ce dont votre organisation a besoin pour rester alignée",
        featuresSubtitle: "Zéro rupture d'inventaire. Zéro déficit surprise. Zéro opportunité manquée.",
        cards: [
          ["Pilotage des ventes", "Créez rapidement des transactions et conservez un historique de ventes clair."],
          ["Contrôle de l'inventaire", "Suivez les mouvements de stock et restez alerté sur les écarts d'inventaire."],
          ["Structure produits", "Gérez les produits et les prix."],
          ["Visibilité d'entreprise", "Accédez à votre entreprise à tout moment, partout."],
        ],
        promotionsEyebrow: "Promotions",
        promotionsTitle: "Offres en cours",
        promotionsLoading: "Chargement des promotions...",
        promotionsEmpty: "Aucune promotion disponible pour le moment.",
        specialOffer: "Offre spéciale",
        promoText: "Tarification promotionnelle actuellement disponible.",
        freeTrial: "Essai gratuit :",
        days: "jours",
        monthlyPromo: "Promo mensuelle :",
        yearlyPromo: "Promo annuelle :",
        plansEyebrow: "Plans",
        plansTitle: "Choisissez l'abonnement qui correspond à votre rythme",
        plansLoading: "Chargement des plans...",
        plansEmpty: "Aucun plan disponible.",
        defaultPlanText: "Pack opérationnel pour les équipes qui veulent de la clarté et de la rapidité.",
        custom: "Sur mesure",
        perMonth: "par mois",
        yearly: "Annuel :",
        continuePlan: "Continuer avec ce plan",
      }
    : {
        loadError: "Failed to load public data",
        badge: "Powered by CAMELEYON Dynamics",
        heroSubtitle: "One platform for operations, stock, sales, and growth.",
        signUp: "Sign Up",
        login: "Login",
        introTitle:
          "CAMELEYON ERP brings sales, inventory, products, pricing, and decision-making into one elegant workspace built for growing organisations.",
        introSubtitle: "No more spreadsheets and loose sheets.",
        featuresEyebrow: "Key features",
        featuresTitle: "Everything your organisation needs to stay aligned",
        featuresSubtitle: "Zero inventory gaps. Zero surprise deficits. Zero missed opportunities.",
        cards: [
          ["Sales control", "Create transactions quickly and keep a clean sales history."],
          ["Inventory control", "Track stock movement and stay alert on inventory gaps."],
          ["Product structure", "Manage products and pricing."],
          ["Business visibility", "Access your company anytime, anywhere."],
        ],
        promotionsEyebrow: "Promotions",
        promotionsTitle: "Current offers",
        promotionsLoading: "Loading promotions...",
        promotionsEmpty: "No promotions available at the moment.",
        specialOffer: "Special offer",
        promoText: "Promotional pricing currently available.",
        freeTrial: "Free trial:",
        days: "days",
        monthlyPromo: "Monthly promo:",
        yearlyPromo: "Yearly promo:",
        plansEyebrow: "Plans",
        plansTitle: "Choose the subscription that matches your pace",
        plansLoading: "Loading plans...",
        plansEmpty: "No plan available.",
        defaultPlanText: "Operational package for teams that want clarity and speed.",
        custom: "Custom",
        perMonth: "per month",
        yearly: "Yearly:",
        continuePlan: "Continue with this plan",
      }

  function formatTrialDuration(days: number) {
    if (days === 60) {
      return language === "fr" ? "2 mois" : "2 months"
    }

    return language === "fr" ? `${days} jours` : `${days} days`
  }

  function resolvePromotionName(promotion: PublicPromotionResponse) {
    const localizedName = language === "fr" ? promotion.nameFr : promotion.nameEn
    if (localizedName) {
      return localizedName
    }

    if (promotion.freeTrialDays) {
      return language === "fr"
        ? `${formatTrialDuration(promotion.freeTrialDays)} gratuits`
        : `${formatTrialDuration(promotion.freeTrialDays)} free`
    }

    return promotion.name
  }

  function resolvePromotionDescription(promotion: PublicPromotionResponse) {
    const localizedDescription = language === "fr" ? promotion.descriptionFr : promotion.descriptionEn
    if (localizedDescription) {
      return localizedDescription
    }

    if (promotion.freeTrialDays) {
      return language === "fr"
        ? `${formatTrialDuration(promotion.freeTrialDays)} gratuits pour les nouvelles compagnies.`
        : `${formatTrialDuration(promotion.freeTrialDays)} free for new companies.`
    }

    return promotion.description || text.promoText
  }

  useEffect(() => {
    loadPublicData()
  }, [])

  async function loadPublicData() {
    try {
      setLoading(true)
      setError("")

      const [plansData, promotionsData] = await Promise.all([
        getPublicPlans(),
        getPublicPromotions(),
      ])

      setPlans(Array.isArray(plansData) ? plansData : [])
      setPromotions(Array.isArray(promotionsData) ? promotionsData : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.loadError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-page">
      <LanguageSwitcher className="public-language-switcher" />

      <section className="public-hero">
        <div className="public-hero-copy">
          <div className="public-badge">{text.badge}</div>
          <h1>CAMELEYON-ERP</h1>
          <p className="public-hero-tagline">{text.heroSubtitle}</p>
        </div>

        <div className="public-hero-actions-wrap">
          <div className="hero-actions public-cta-actions">
            <button onClick={onGoToSignup}>{text.signUp}</button>
            <button type="button" className="secondary-button public-login-button" onClick={onGoToLogin}>
              {text.login}
            </button>
          </div>
        </div>
      </section>

      <section className="public-intro card">
        <h2>{text.introTitle}</h2>
        <p>{text.introSubtitle}</p>
      </section>

      {error && <div className="card error">{error}</div>}

      <section className="public-band">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{text.featuresEyebrow}</p>
            <h2>{text.featuresTitle}</h2>
            <p className="section-subtitle">{text.featuresSubtitle}</p>
          </div>
        </div>

        <div className="public-grid">
          {text.cards.map(([title, body]) => (
            <div key={title} className="public-feature-card">
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section public-section-soft">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{text.promotionsEyebrow}</p>
            <h2>{text.promotionsTitle}</h2>
          </div>
        </div>

        {loading ? (
          <p>{text.promotionsLoading}</p>
        ) : promotions.length === 0 ? (
          <p>{text.promotionsEmpty}</p>
        ) : (
          <div className="public-grid">
            {promotions.map((promotion) => (
              <div key={promotion.id} className="public-promo-card">
                <div className="public-card-label">{text.specialOffer}</div>
                <h3>{resolvePromotionName(promotion)}</h3>
                <p>{resolvePromotionDescription(promotion)}</p>
                {promotion.freeTrialDays && (
                  <p><strong>{text.freeTrial}</strong> {promotion.freeTrialDays} {text.days}</p>
                )}
                {promotion.promoPriceMonthly !== null && (
                  <p><strong>{text.monthlyPromo}</strong> {formatCurrency(promotion.promoPriceMonthly)}</p>
                )}
                {promotion.promoPriceYearly !== null && (
                  <p><strong>{text.yearlyPromo}</strong> {formatCurrency(promotion.promoPriceYearly)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{text.plansEyebrow}</p>
            <h2>{text.plansTitle}</h2>
          </div>
        </div>

        {loading ? (
          <p>{text.plansLoading}</p>
        ) : plans.length === 0 ? (
          <div className="card">{text.plansEmpty}</div>
        ) : (
          <div className="public-grid">
            {plans.map((plan) => (
              <div key={plan.id} className="public-plan-card">
                <div className="public-plan-topline">
                  <span>{plan.code}</span>
                </div>
                <h3>{plan.name}</h3>
                <p>{plan.description || text.defaultPlanText}</p>
                <div className="public-price-stack">
                  <strong>{plan.monthlyPrice === null ? text.custom : formatCurrency(plan.monthlyPrice)}</strong>
                  <span>{text.perMonth}</span>
                </div>
                <p>
                  <strong>{text.yearly}</strong> {plan.yearlyPrice === null ? "-" : formatCurrency(plan.yearlyPrice)}
                </p>
                <button type="button" onClick={onGoToSignup}>
                  {text.continuePlan}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

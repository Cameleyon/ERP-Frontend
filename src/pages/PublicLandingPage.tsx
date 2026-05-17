import { useEffect, useState } from "react"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import { useI18n } from "../i18n/I18nContext"
import { getPublicPlans, type PublicPlanResponse } from "../api/publicPlansApi"
import {
  getPublicPromotions,
  type PublicPromotionResponse,
} from "../api/publicPromotionsApi"
import { formatCurrency } from "../utils/format"
import cameleyonDynamicsLogo from "../assets/cameleyon-dynamics-logo.png"
import landingCustomers from "../assets/landing-customers.png"
import landingDashboard from "../assets/landing-dashboard.png"
import landingInventory from "../assets/landing-inventory.png"
import landingNewSale from "../assets/landing-new-sale.png"
import landingProducts from "../assets/landing-products.png"
import landingSalesHistory from "../assets/landing-sales-history.png"

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
  const [activeSlide, setActiveSlide] = useState(0)

  const text = language === "fr"
    ? {
        loadError: "Impossible de charger les donnees publiques",
        badge: "Propulse par CAMELEYON Dynamics",
        heroSubtitle: "Une seule plateforme pour toutes vos entreprises pour gerer vos ventes, vos produits, vos clients et vos stocks.",
        signUp: "S'inscrire",
        login: "Se connecter",
        contactEyebrow: "Contact",
        contactTitle: "Cette solution ne correspond pas a vos besoins? Pas de souci, parlons de vos besoins.",
        websiteLabel: "Site web",
        emailLabel: "Email",
        featuresEyebrow: "Fonctionnalites cles",
        featuresSubtitle: "Zero rupture d'inventaire. Zero deficit surprise. Zero opportunite manquee.",
        cards: [
          ["Pilotage des ventes", "Creez rapidement des transactions et conservez un historique de ventes clair."],
          ["Controle de l'inventaire", "Suivez les mouvements de stock et restez alerte sur les ecarts d'inventaire."],
          ["Structure produits", "Gerez les produits et les prix."],
          ["Visibilite d'entreprise", "Accedez a votre entreprise a tout moment, partout."],
        ],
        promotionsEyebrow: "Promotions",
        promotionsTitle: "Offres en cours",
        promotionsLoading: "Chargement des promotions...",
        promotionsEmpty: "Aucune promotion disponible pour le moment.",
        specialOffer: "Offre speciale",
        promoText: "Tarification promotionnelle actuellement disponible.",
        freeTrial: "Essai gratuit :",
        days: "jours",
        monthlyPromo: "Promo mensuelle :",
        yearlyPromo: "Promo annuelle :",
        plansEyebrow: "Plans",
        plansTitle: "Choisissez l'abonnement qui correspond a vos besoins.",
        plansLoading: "Chargement des plans...",
        plansEmpty: "Aucun plan disponible.",
        defaultPlanText: "Pack operationnel pour les equipes qui veulent de la clarte et de la rapidite.",
        custom: "Sur mesure",
        perMonth: "par mois",
        yearly: "Annuel :",
        continuePlan: "Continuer avec ce plan",
        comingSoon: "A venir",
        planLabels: {
          BASIC: "Basic",
          STANDARD: "Standard",
          PREMIUM: "Premium",
        },
        navigationWebsite: "Site web",
        navigationEmail: "Contact",
        carouselEyebrow: "Apercu de la plateforme",
        carouselSlides: [
          {
            eyebrow: "Tableau de bord",
            title: "Suivez les ventes et les indicateurs",
            description: "Un apercu rapide de l'activite, du stock faible et des produits performants.",
            image: landingDashboard,
            mediaFit: "cover",
          },
          {
            eyebrow: "Clients",
            title: "Gardez les clients organises",
            description: "Ajoutez les contacts et suivez facilement les informations utiles.",
            image: landingCustomers,
            mediaFit: "contain",
          },
          {
            eyebrow: "Nouvelle vente",
            title: "Encaissez avec fluidite",
            description: "Recherche produit, client, mode de paiement et facture reunis au meme endroit.",
            image: landingNewSale,
            mediaFit: "contain",
          },
          {
            eyebrow: "Historique",
            title: "Retrouvez les ventes en quelques secondes",
            description: "Filtrez, consultez les details et gardez une vue claire de l'activite.",
            image: landingSalesHistory,
            mediaFit: "cover",
          },
          {
            eyebrow: "Inventaire",
            title: "Gardez le stock sous controle",
            description: "Receptions, retraits et quantites restantes restent visibles en un coup d'oeil.",
            image: landingInventory,
            mediaFit: "contain",
          },
          {
            eyebrow: "Produits",
            title: "Structurez votre catalogue",
            description: "Importez, creez et gerez vos produits depuis un seul espace.",
            image: landingProducts,
            mediaFit: "cover",
          },
          {
            eyebrow: "CAMELEYON Dynamics",
            title: "Une marque pour accompagner la croissance",
            description: "Le logo viendra conclure le defilement avec une signature claire de la marque.",
            image: cameleyonDynamicsLogo,
            mediaFit: "logo",
          },
        ],
      }
    : language === "es"
      ? {
          loadError: "No fue posible cargar los datos publicos",
          badge: "Impulsado por CAMELEYON Dynamics",
          heroSubtitle: "Una sola plataforma para operaciones, inventario, ventas y crecimiento.",
          signUp: "Registrarse",
          login: "Iniciar sesion",
          contactEyebrow: "Contacto",
          contactTitle: "Si esta solucion no corresponde a sus necesidades, no se preocupe, conversemos sobre ellas.",
          websiteLabel: "Sitio web",
          emailLabel: "Correo",
        featuresEyebrow: "Funciones clave",
        featuresSubtitle: "Cero faltantes de inventario. Cero deficits sorpresa. Cero oportunidades perdidas.",
          cards: [
            ["Control de ventas", "Cree transacciones rapidamente y conserve un historial de ventas claro."],
            ["Control de inventario", "Siga el movimiento del inventario y mantengase alerta ante faltantes."],
            ["Estructura de productos", "Gestione productos y precios."],
            ["Visibilidad del negocio", "Acceda a su empresa en cualquier momento y desde cualquier lugar."],
          ],
          promotionsEyebrow: "Promociones",
          promotionsTitle: "Ofertas actuales",
          promotionsLoading: "Cargando promociones...",
          promotionsEmpty: "No hay promociones disponibles por el momento.",
          specialOffer: "Oferta especial",
          promoText: "Precio promocional disponible actualmente.",
          freeTrial: "Prueba gratis:",
          days: "dias",
          monthlyPromo: "Promo mensual:",
          yearlyPromo: "Promo anual:",
          plansEyebrow: "Planes",
          plansTitle: "Elija la suscripcion que mejor se adapte a su ritmo",
          plansLoading: "Cargando planes...",
          plansEmpty: "No hay planes disponibles.",
          defaultPlanText: "Paquete operativo para equipos que buscan claridad y rapidez.",
          custom: "Personalizado",
          perMonth: "por mes",
          yearly: "Anual:",
          continuePlan: "Continuar con este plan",
          comingSoon: "Proximamente",
          planLabels: {
            BASIC: "Basic",
            STANDARD: "Standard",
            PREMIUM: "Premium",
          },
          navigationWebsite: "Sitio web",
          navigationEmail: "Contacto",
          carouselEyebrow: "Vista de la plataforma",
          carouselSlides: [
            {
              eyebrow: "Panel",
              title: "Siga ventas e indicadores",
              description: "Una vista rapida de la actividad, el inventario bajo y los productos destacados.",
              image: landingDashboard,
              mediaFit: "cover",
            },
            {
              eyebrow: "Clientes",
              title: "Mantenga sus clientes organizados",
              description: "Agregue contactos y consulte facilmente la informacion util.",
              image: landingCustomers,
              mediaFit: "contain",
            },
            {
              eyebrow: "Nueva venta",
              title: "Venda con fluidez",
              description: "Busqueda de producto, cliente, pago y factura reunidos en un mismo lugar.",
              image: landingNewSale,
              mediaFit: "contain",
            },
            {
              eyebrow: "Historial",
              title: "Encuentre ventas en segundos",
              description: "Filtre, consulte detalles y mantenga una vista clara de la actividad.",
              image: landingSalesHistory,
              mediaFit: "cover",
            },
            {
              eyebrow: "Inventario",
              title: "Mantenga el stock bajo control",
              description: "Recepciones, retiros y cantidades restantes visibles de un vistazo.",
              image: landingInventory,
              mediaFit: "contain",
            },
            {
              eyebrow: "Productos",
              title: "Estructure su catalogo",
              description: "Importe, cree y gestione productos desde un solo espacio.",
              image: landingProducts,
              mediaFit: "cover",
            },
            {
              eyebrow: "CAMELEYON Dynamics",
              title: "Una marca para acompanar el crecimiento",
              description: "El logo cerrara el recorrido con una firma clara de la marca.",
              image: cameleyonDynamicsLogo,
              mediaFit: "logo",
            },
          ],
        }
      : {
          loadError: "Failed to load public data",
          badge: "Powered by CAMELEYON Dynamics",
          heroSubtitle: "One platform for operations, stock, sales, and growth.",
          signUp: "Sign Up",
          login: "Login",
          contactEyebrow: "Contact",
          contactTitle: "If this solution does not match your needs, no problem, let's talk about what you need.",
          websiteLabel: "Website",
          emailLabel: "Email",
        featuresEyebrow: "Key features",
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
          comingSoon: "Coming soon",
          planLabels: {
            BASIC: "Basic",
            STANDARD: "Standard",
            PREMIUM: "Premium",
          },
          navigationWebsite: "Website",
          navigationEmail: "Contact",
          carouselEyebrow: "Platform preview",
          carouselSlides: [
            {
              eyebrow: "Dashboard",
              title: "Track sales and indicators",
              description: "A quick view of activity, low stock, and top-performing products.",
              image: landingDashboard,
              mediaFit: "cover",
            },
            {
              eyebrow: "Customers",
              title: "Keep customers organised",
              description: "Add contacts and keep the useful details easy to reach.",
              image: landingCustomers,
              mediaFit: "contain",
            },
            {
              eyebrow: "New sale",
              title: "Sell with less friction",
              description: "Product search, customer, payment method, and invoice in one place.",
              image: landingNewSale,
              mediaFit: "contain",
            },
            {
              eyebrow: "Sales history",
              title: "Find sales in seconds",
              description: "Filter, review details, and keep a clear view of activity.",
              image: landingSalesHistory,
              mediaFit: "cover",
            },
            {
              eyebrow: "Inventory",
              title: "Keep stock under control",
              description: "Receipts, withdrawals, and remaining quantities stay visible at a glance.",
              image: landingInventory,
              mediaFit: "contain",
            },
            {
              eyebrow: "Products",
              title: "Structure your catalogue",
              description: "Import, create, and manage products from one workspace.",
              image: landingProducts,
              mediaFit: "cover",
            },
            {
              eyebrow: "CAMELEYON Dynamics",
              title: "A brand built to support growth",
              description: "The logo will close the sequence with a clear brand signature.",
              image: cameleyonDynamicsLogo,
              mediaFit: "logo",
            },
          ],
        }

  function formatTrialDuration(days: number) {
    if (days === 60) {
      if (language === "fr") return "2 mois"
      if (language === "es") return "2 meses"
      return "2 months"
    }

    if (language === "fr") return `${days} jours`
    if (language === "es") return `${days} dias`
    return `${days} days`
  }

  function resolvePromotionName(promotion: PublicPromotionResponse) {
    const localizedName = language === "fr" ? promotion.nameFr : promotion.nameEn
    if (localizedName) {
      return localizedName
    }

    if (promotion.freeTrialDays) {
      if (language === "fr") return `${formatTrialDuration(promotion.freeTrialDays)} gratuits`
      if (language === "es") return `${formatTrialDuration(promotion.freeTrialDays)} gratis`
      return `${formatTrialDuration(promotion.freeTrialDays)} free`
    }

    return promotion.name
  }

  function resolvePromotionDescription(promotion: PublicPromotionResponse) {
    const localizedDescription = language === "fr" ? promotion.descriptionFr : promotion.descriptionEn
    if (localizedDescription) {
      return localizedDescription
    }

    if (promotion.freeTrialDays) {
      if (language === "fr") return `${formatTrialDuration(promotion.freeTrialDays)} gratuits pour les nouvelles compagnies.`
      if (language === "es") return `${formatTrialDuration(promotion.freeTrialDays)} gratis para nuevas empresas.`
      return `${formatTrialDuration(promotion.freeTrialDays)} free for new companies.`
    }

    return promotion.description || text.promoText
  }

  useEffect(() => {
    loadPublicData()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % text.carouselSlides.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [text.carouselSlides.length])

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

  const currentSlide = text.carouselSlides[activeSlide]
  const displayPlans = ["BASIC", "STANDARD", "PREMIUM"].map((code) => {
    const plan = plans.find((candidate) => candidate.code.toUpperCase() === code)

    return {
      code,
      name: plan?.name || text.planLabels[code as keyof typeof text.planLabels],
      description: plan?.description || (code === "BASIC" ? text.defaultPlanText : text.comingSoon),
      monthlyPrice: plan?.monthlyPrice ?? null,
      yearlyPrice: plan?.yearlyPrice ?? null,
      available: Boolean(plan),
    }
  })

  return (
    <div className="public-page public-page-redesign">
      <div className="public-utility-bar">
        <LanguageSwitcher className="public-language-switcher" />
      </div>

      <header className="public-site-header">
        <div className="public-wordmark">
          <span>CAMELEYON-ERP</span>
        </div>

        <div className="hero-actions public-cta-actions public-header-actions">
          <button onClick={onGoToSignup}>{text.signUp}</button>
          <button type="button" className="secondary-button public-login-button" onClick={onGoToLogin}>
            {text.login}
          </button>
        </div>
      </header>

      <section className="public-showcase">
        <div className="public-showcase-copy">
          <div className="public-badge">{text.badge}</div>
          <p className="public-hero-tagline">
            <strong>CAMELEYON-ERP,</strong> {text.heroSubtitle}
          </p>
          <p className="public-hero-supporting-copy">{text.featuresSubtitle}</p>
        </div>

        <div className="public-carousel-panel">
          <div className="public-carousel-heading">
            <p className="eyebrow">{text.carouselEyebrow}</p>
          </div>

          <div className="public-carousel-frame">
            <div className={`public-carousel-slide slide-${activeSlide}`}>
              <div className="public-carousel-slide-copy">
                <span>{currentSlide.eyebrow}</span>
                <h3>{currentSlide.title}</h3>
                <p>{currentSlide.description}</p>
              </div>

              <div className={`public-carousel-media ${currentSlide.mediaFit}`}>
                <img src={currentSlide.image} alt="" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="public-carousel-dots">
            {text.carouselSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={index === activeSlide ? "active" : ""}
                aria-label={`${slide.eyebrow} ${index + 1}`}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {error && <div className="card error">{error}</div>}

      <section className="public-band">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{text.featuresEyebrow}</p>
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
        ) : (
          <div className="public-plan-grid">
            {displayPlans.map((plan) => (
              <div key={plan.code} className="public-plan-card">
                <div className="public-plan-topline">
                  <span>{plan.code}</span>
                </div>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <div className="public-price-stack">
                  <strong>{plan.monthlyPrice === null ? text.comingSoon : formatCurrency(plan.monthlyPrice)}</strong>
                  <span>{text.perMonth}</span>
                </div>
                <p>
                  <strong>{text.yearly}</strong> {plan.yearlyPrice === null ? text.comingSoon : formatCurrency(plan.yearlyPrice)}
                </p>
                {plan.available ? (
                  <button type="button" onClick={onGoToSignup}>
                    {text.continuePlan}
                  </button>
                ) : (
                  <button type="button" disabled>
                    {text.comingSoon}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="public-contact-card card">
        <div className="public-contact-heading">
          <p className="eyebrow">{text.contactEyebrow}</p>
          <h3>{text.contactTitle}</h3>
        </div>

        <div className="public-contact-grid">
          <div className="public-contact-item">
            <span>{text.websiteLabel}</span>
            <strong>
              <a
                href="https://www.cameleyondynamics.com"
                target="_blank"
                rel="noreferrer"
              >
                www.cameleyondynamics.com
              </a>
            </strong>
          </div>

          <div className="public-contact-item">
            <span>{text.emailLabel}</span>
            <strong>contact@cameleyondynamics.com</strong>
          </div>
        </div>
      </section>
    </div>
  )
}

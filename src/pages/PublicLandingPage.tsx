import { useEffect, useMemo, useState } from "react"
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

type LandingSlide = {
  eyebrow: string
  title: string
  description: string
  image: string
  mediaFit: "cover" | "contain" | "logo"
}

type LandingCopy = {
  loadError: string
  badge: string
  headlinePrimary: string
  headlineSecondary: string
  heroDescription: string
  signUp: string
  login: string
  discover: string
  contactEyebrow: string
  contactTitle: string
  websiteLabel: string
  emailLabel: string
  footerRights: string
  poweredBy: string
  featuresEyebrow: string
  featuresTitle: string
  cards: Array<[string, string, string]>
  promotionsEyebrow: string
  promotionsTitle: string
  promotionsLoading: string
  promotionsEmpty: string
  specialOffer: string
  promoText: string
  freeTrial: string
  days: string
  monthlyPromo: string
  yearlyPromo: string
  plansEyebrow: string
  plansTitle: string
  plansAction: string
  plansLoading: string
  plansEmpty: string
  perMonth: string
  yearly: string
  continuePlan: string
  notAvailable: string
  planLabels: Record<"BASIC" | "STANDARD" | "PREMIUM", string>
  carouselEyebrow: string
  carouselSlides: LandingSlide[]
  trustCards: Array<[string, string, string]>
}

export default function PublicLandingPage({ onGoToSignup, onGoToLogin }: Props) {
  const { language } = useI18n()
  const [plans, setPlans] = useState<PublicPlanResponse[]>([])
  const [promotions, setPromotions] = useState<PublicPromotionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeSlide, setActiveSlide] = useState(0)

  const text: LandingCopy = language === "fr"
    ? {
        loadError: "Impossible de charger les données publiques",
        badge: "Propulsé par CAMELEYON Dynamics",
        headlinePrimary: "Gérez votre entreprise.",
        headlineSecondary: "Simplifiez. Pilotez. Développez.",
        heroDescription: "CAMELEYON-ERP est une plateforme tout-en-un qui aide les entreprises à gérer leurs ventes, leurs produits, leurs clients et leurs stocks en toute simplicité.",
        signUp: "S'inscrire",
        login: "Se connecter",
        discover: "Découvrir la plateforme",
        contactEyebrow: "Contact",
        contactTitle: "Besoin d'aide ou d'une solution adaptée ? Parlons de vos besoins.",
        websiteLabel: "Site web",
        emailLabel: "Email",
        footerRights: "Tous droits réservés.",
        poweredBy: "Propulsé par CAMELEYON Dynamics",
        featuresEyebrow: "Fonctionnalités clés",
        featuresTitle: "Les outils essentiels pour garder le contrôle de votre activité.",
        cards: [
          ["Pilotage des ventes", "Créez rapidement des transactions et conservez un historique clair des ventes.", "01"],
          ["Contrôle de l'inventaire", "Suivez les mouvements de stock et gardez une meilleure visibilité sur votre inventaire.", "02"],
          ["Structure produits", "Gérez vos produits, catégories et prix facilement.", "03"],
          ["Visibilité d'entreprise", "Accédez aux informations de votre entreprise à tout moment, où que vous soyez.", "04"],
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
        plansTitle: "Choisissez l'abonnement qui correspond à vos besoins.",
        plansAction: "Voir tous les plans",
        plansLoading: "Chargement des plans...",
        plansEmpty: "Aucun plan disponible.",
        perMonth: "par mois",
        yearly: "Annuel :",
        continuePlan: "Choisir ce plan",
        notAvailable: "Non disponible",
        planLabels: {
          BASIC: "Basic",
          STANDARD: "Standard",
          PREMIUM: "Premium",
        },
        carouselEyebrow: "Aperçu de la plateforme",
        carouselSlides: [
          {
            eyebrow: "Nouvelle vente",
            title: "Encaissez avec fluidité",
            description: "Recherche produit, client, mode de paiement et facture réunis au même endroit.",
            image: landingNewSale,
            mediaFit: "contain",
          },
          {
            eyebrow: "Tableau de bord",
            title: "Suivez les ventes et les indicateurs",
            description: "Un aperçu rapide de l'activité, du stock faible et des produits performants.",
            image: landingDashboard,
            mediaFit: "cover",
          },
          {
            eyebrow: "Inventaire",
            title: "Gardez le stock sous contrôle",
            description: "Réceptions, retraits et quantités restantes restent visibles en un coup d'œil.",
            image: landingInventory,
            mediaFit: "contain",
          },
          {
            eyebrow: "Clients",
            title: "Gardez les clients organisés",
            description: "Ajoutez les contacts et suivez facilement les informations utiles.",
            image: landingCustomers,
            mediaFit: "contain",
          },
          {
            eyebrow: "Produits",
            title: "Structurez votre catalogue",
            description: "Importez, créez et gérez vos produits depuis un seul espace.",
            image: landingProducts,
            mediaFit: "cover",
          },
          {
            eyebrow: "Historique",
            title: "Retrouvez les ventes en quelques secondes",
            description: "Filtrez, consultez les détails et gardez une vue claire de l'activité.",
            image: landingSalesHistory,
            mediaFit: "cover",
          },
        ],
        trustCards: [
          ["Sécurisé", "Vos données sont protégées.", "SH"],
          ["Accessible partout", "Ordinateur, tablette et mobile.", "CL"],
          ["Support réactif", "Notre équipe vous accompagne.", "HD"],
          ["Conçu pour grandir", "Une solution qui évolue avec votre entreprise.", "UP"],
        ],
      }
    : language === "es"
      ? {
          loadError: "No fue posible cargar los datos públicos",
          badge: "Impulsado por CAMELEYON Dynamics",
          headlinePrimary: "Gestione su empresa.",
          headlineSecondary: "Simplifique. Dirija. Crezca.",
          heroDescription: "CAMELEYON-ERP es una plataforma todo en uno que ayuda a las empresas a gestionar ventas, productos, clientes e inventario con simplicidad.",
          signUp: "Registrarse",
          login: "Iniciar sesión",
          discover: "Explorar la plataforma",
          contactEyebrow: "Contacto",
          contactTitle: "¿Necesita ayuda o una solución adaptada? Hablemos de sus necesidades.",
          websiteLabel: "Sitio web",
          emailLabel: "Correo",
          footerRights: "Todos los derechos reservados.",
          poweredBy: "Impulsado por CAMELEYON Dynamics",
          featuresEyebrow: "Funciones clave",
          featuresTitle: "Herramientas esenciales para mantener el control de su operación.",
          cards: [
            ["Control de ventas", "Cree transacciones rápidamente y conserve un historial de ventas claro.", "01"],
            ["Control de inventario", "Siga los movimientos de stock y mantenga mejor visibilidad de su inventario.", "02"],
            ["Estructura de productos", "Gestione productos, categorías y precios con facilidad.", "03"],
            ["Visibilidad del negocio", "Acceda a la información de su empresa en cualquier momento y lugar.", "04"],
          ],
          promotionsEyebrow: "Promociones",
          promotionsTitle: "Ofertas actuales",
          promotionsLoading: "Cargando promociones...",
          promotionsEmpty: "No hay promociones disponibles por el momento.",
          specialOffer: "Oferta especial",
          promoText: "Precio promocional disponible actualmente.",
          freeTrial: "Prueba gratis:",
          days: "días",
          monthlyPromo: "Promo mensual:",
          yearlyPromo: "Promo anual:",
          plansEyebrow: "Planes",
          plansTitle: "Elija la suscripción que corresponde a sus necesidades.",
          plansAction: "Ver todos los planes",
          plansLoading: "Cargando planes...",
          plansEmpty: "No hay planes disponibles.",
          perMonth: "por mes",
          yearly: "Anual:",
          continuePlan: "Elegir este plan",
          notAvailable: "No disponible",
          planLabels: {
            BASIC: "Basic",
            STANDARD: "Standard",
            PREMIUM: "Premium",
          },
          carouselEyebrow: "Vista de la plataforma",
          carouselSlides: [
            {
              eyebrow: "Nueva venta",
              title: "Venda con fluidez",
              description: "Búsqueda de producto, cliente, pago y factura reunidos en un mismo lugar.",
              image: landingNewSale,
              mediaFit: "contain",
            },
            {
              eyebrow: "Panel",
              title: "Siga ventas e indicadores",
              description: "Una vista rápida de la actividad, el inventario bajo y los productos destacados.",
              image: landingDashboard,
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
              eyebrow: "Clientes",
              title: "Mantenga sus clientes organizados",
              description: "Agregue contactos y consulte fácilmente la información útil.",
              image: landingCustomers,
              mediaFit: "contain",
            },
            {
              eyebrow: "Productos",
              title: "Estructure su catálogo",
              description: "Importe, cree y gestione productos desde un solo espacio.",
              image: landingProducts,
              mediaFit: "cover",
            },
            {
              eyebrow: "Historial",
              title: "Encuentre ventas en segundos",
              description: "Filtre, consulte detalles y mantenga una vista clara de la actividad.",
              image: landingSalesHistory,
              mediaFit: "cover",
            },
          ],
          trustCards: [
            ["Seguro", "Sus datos están protegidos.", "SH"],
            ["Accesible en todas partes", "Computadora, tableta y móvil.", "CL"],
            ["Soporte receptivo", "Nuestro equipo le acompaña.", "HD"],
            ["Diseñado para crecer", "Una solución que evoluciona con su empresa.", "UP"],
          ],
        }
      : {
          loadError: "Failed to load public data",
          badge: "Powered by CAMELEYON Dynamics",
          headlinePrimary: "Manage your business.",
          headlineSecondary: "Simplify. Control. Grow.",
          heroDescription: "CAMELEYON-ERP is an all-in-one platform that helps companies manage sales, products, customers, and inventory with simplicity.",
          signUp: "Sign Up",
          login: "Login",
          discover: "Explore the platform",
          contactEyebrow: "Contact",
          contactTitle: "Need help or a tailored solution? Let's talk about what you need.",
          websiteLabel: "Website",
          emailLabel: "Email",
          footerRights: "All rights reserved.",
          poweredBy: "Powered by CAMELEYON Dynamics",
          featuresEyebrow: "Key features",
          featuresTitle: "Essential tools to keep your operation under control.",
          cards: [
            ["Sales control", "Create transactions quickly and keep a clear sales history.", "01"],
            ["Inventory control", "Track stock movements and keep better visibility into inventory.", "02"],
            ["Product structure", "Manage products, categories, and prices easily.", "03"],
            ["Business visibility", "Access company information anytime, wherever you are.", "04"],
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
          plansTitle: "Choose the subscription that matches your needs.",
          plansAction: "View all plans",
          plansLoading: "Loading plans...",
          plansEmpty: "No plans available.",
          perMonth: "per month",
          yearly: "Yearly:",
          continuePlan: "Choose this plan",
          notAvailable: "Not available",
          planLabels: {
            BASIC: "Basic",
            STANDARD: "Standard",
            PREMIUM: "Premium",
          },
          carouselEyebrow: "Platform preview",
          carouselSlides: [
            {
              eyebrow: "New sale",
              title: "Sell with less friction",
              description: "Product search, customer, payment method, and invoice in one place.",
              image: landingNewSale,
              mediaFit: "contain",
            },
            {
              eyebrow: "Dashboard",
              title: "Track sales and indicators",
              description: "A quick view of activity, low stock, and top-performing products.",
              image: landingDashboard,
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
              eyebrow: "Customers",
              title: "Keep customers organised",
              description: "Add contacts and keep the useful details easy to reach.",
              image: landingCustomers,
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
              eyebrow: "Sales history",
              title: "Find sales in seconds",
              description: "Filter, review details, and keep a clear view of activity.",
              image: landingSalesHistory,
              mediaFit: "cover",
            },
          ],
          trustCards: [
            ["Secure", "Your data is protected.", "SH"],
            ["Accessible anywhere", "Desktop, tablet, and mobile.", "CL"],
            ["Responsive support", "Our team helps you move forward.", "HD"],
            ["Built to grow", "A solution that evolves with your company.", "UP"],
          ],
        }

  function formatTrialDuration(days: number) {
    if (days === 60) {
      if (language === "fr") return "2 mois"
      if (language === "es") return "2 meses"
      return "2 months"
    }

    if (language === "fr") return `${days} jours`
    if (language === "es") return `${days} días`
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

  const displayPlans = useMemo(
    () =>
      (["BASIC", "STANDARD", "PREMIUM"] as const).map((code) => {
        const plan = plans.find((candidate) => candidate.code.toUpperCase() === code)

        return {
          code,
          name: plan?.name || text.planLabels[code],
          description: plan?.description || text.notAvailable,
          monthlyPrice: plan?.monthlyPrice ?? null,
          yearlyPrice: plan?.yearlyPrice ?? null,
          available: Boolean(plan),
        }
      }),
    [plans, text.notAvailable, text.planLabels],
  )

  const currentSlide = text.carouselSlides[activeSlide]

  return (
    <div className="public-page public-page-redesign">
      <header className="public-site-header">
        <a
          className="public-brand-link"
          href="https://www.cameleyondynamics.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="CAMELEYON Dynamics"
        >
          <img src={cameleyonDynamicsLogo} alt="CAMELEYON Dynamics" />
          <span>CAMELEYON-ERP</span>
        </a>

        <nav className="public-header-nav" aria-label="Public navigation">
          <LanguageSwitcher className="public-language-switcher" />
          <button type="button" className="public-nav-button public-nav-primary" onClick={onGoToSignup}>
            {text.signUp}
          </button>
          <button type="button" className="public-nav-button public-nav-secondary" onClick={onGoToLogin}>
            {text.login}
          </button>
        </nav>
      </header>

      <main>
        <section className="public-showcase" aria-labelledby="public-hero-title">
          <div className="public-showcase-copy">
            <div className="public-badge">{text.badge}</div>
            <h1 id="public-hero-title">
              <span>{text.headlinePrimary}</span>
              <strong>{text.headlineSecondary}</strong>
            </h1>
            <p>{text.heroDescription}</p>

            <div className="public-hero-actions">
              <button type="button" onClick={onGoToSignup}>
                {text.signUp}
              </button>
              <a href="#platform-preview">{text.discover}</a>
            </div>
          </div>

          <div className="public-carousel-panel" id="platform-preview">
            <div className="public-carousel-heading">
              <p className="eyebrow">{text.carouselEyebrow}</p>
            </div>

            <div className="public-carousel-frame">
              <div className={`public-carousel-slide slide-${activeSlide}`}>
                <div className="public-carousel-slide-copy">
                  <span>{currentSlide.eyebrow}</span>
                  <h2>{currentSlide.title}</h2>
                  <p>{currentSlide.description}</p>
                </div>

                <div className={`public-carousel-media ${currentSlide.mediaFit}`}>
                  <img
                    src={currentSlide.image}
                    alt={`${currentSlide.eyebrow} - ${currentSlide.title}`}
                    loading={activeSlide === 0 ? "eager" : "lazy"}
                  />
                </div>
              </div>
            </div>

            <div className="public-carousel-dots" aria-label={text.carouselEyebrow}>
              {text.carouselSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  className={index === activeSlide ? "active" : ""}
                  aria-label={`${slide.eyebrow} ${index + 1}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                  onClick={() => setActiveSlide(index)}
                />
              ))}
            </div>
          </div>
        </section>

        {error && <div className="card error">{error}</div>}

        <section className="public-band" aria-labelledby="public-features-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{text.featuresEyebrow}</p>
              <h2 id="public-features-title">{text.featuresTitle}</h2>
            </div>
          </div>

          <div className="public-grid">
            {text.cards.map(([title, body, icon]) => (
              <article key={title} className="public-feature-card">
                <span className="public-card-icon" aria-hidden="true">{icon}</span>
                <h3>{title}</h3>
                <p>{body}</p>
                <span className="public-card-arrow" aria-hidden="true">→</span>
              </article>
            ))}
          </div>
        </section>

        <div className="public-commerce-grid">
          <section className="public-section public-section-soft" aria-labelledby="public-promotions-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{text.promotionsEyebrow}</p>
                <h2 id="public-promotions-title">{text.promotionsTitle}</h2>
              </div>
            </div>

            {loading ? (
              <div className="public-empty-panel">{text.promotionsLoading}</div>
            ) : promotions.length === 0 ? (
              <div className="public-empty-panel">
                <span className="public-empty-icon" aria-hidden="true">%</span>
                <strong>{text.promotionsTitle}</strong>
                <p>{text.promotionsEmpty}</p>
              </div>
            ) : (
              <div className="public-promo-list">
                {promotions.map((promotion) => (
                  <article key={promotion.id} className="public-promo-card">
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
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="public-section public-plans-section" aria-labelledby="public-plans-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{text.plansEyebrow}</p>
                <h2 id="public-plans-title">{text.plansTitle}</h2>
              </div>
            </div>

            {loading ? (
              <div className="public-empty-panel">{text.plansLoading}</div>
            ) : (
              <div className="public-plan-grid">
                {displayPlans.map((plan) => (
                  <article key={plan.code} className={`public-plan-card ${!plan.available ? "public-plan-card-unavailable" : ""}`}>
                    <div className="public-plan-topline">
                      <span>{plan.code}</span>
                    </div>
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>
                    <div className="public-price-stack">
                      <strong>{plan.monthlyPrice === null ? text.notAvailable : formatCurrency(plan.monthlyPrice)}</strong>
                      {plan.monthlyPrice !== null && <span>{text.perMonth}</span>}
                    </div>
                    {plan.yearlyPrice !== null && (
                      <p>
                        <strong>{text.yearly}</strong> {formatCurrency(plan.yearlyPrice)}
                      </p>
                    )}
                    <button type="button" onClick={onGoToSignup} disabled={!plan.available}>
                      {plan.available ? text.continuePlan : text.notAvailable}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="public-trust-strip" aria-label="CAMELEYON-ERP trust">
          {text.trustCards.map(([title, body, icon]) => (
            <article key={title} className="public-trust-item">
              <span aria-hidden="true">{icon}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer-brand">
          <img src={cameleyonDynamicsLogo} alt="CAMELEYON Dynamics" />
          <div>
            <strong>CAMELEYON-ERP</strong>
            <span>{text.poweredBy}</span>
          </div>
        </div>

        <div className="public-footer-contact">
          <a href="https://www.cameleyondynamics.com/" target="_blank" rel="noreferrer">
            www.cameleyondynamics.com
          </a>
          <a href="mailto:contact@cameleyondynamics.com">contact@cameleyondynamics.com</a>
        </div>

        <p>© 2024 CAMELEYON-ERP. {text.footerRights}</p>
      </footer>
    </div>
  )
}

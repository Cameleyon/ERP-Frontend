import type { Language } from "./messages"

type Pair = readonly [title: string, description: string]
type HomepageCopy = {
  navigation: string; features: string; plans: string; login: string; signup: string; explore: string;
  headline: string; lead: string; trial: string; offers: string; offerDays: (days: number) => string;
  dashboard: Pair; inventory: Pair; sale: Pair; benefits: string; featureItems: Pair[];
  journey: string; steps: Pair[]; planTitle: string; available: string; planned: string;
  versions: { tagline: string; description: string; features: string[] }[]; assistant: Pair;
  pricing: string; questions: string; support: string; faq: Pair[];
  final: string; powered: string; privacy: string; terms: string; rights: string;
}

export const homepageCopy = {
  en: {
    navigation: "Homepage navigation", features: "Features", plans: "Plans", login: "Log in",
    signup: "Start Your Free Trial", explore: "Explore Features",
    headline: "Manage your stock, sales, and profits in one place.",
    lead: "Simplify your business management with CAMELEYON-ERP. Organize products, monitor inventory, track sales, understand your profitability, and make better business decisions\u2014all from one easy-to-use platform.",
    trial: "90 days free. No credit card required.", offers: "Current offers", offerDays: days => `${days} days free`,
    dashboard: ["CAMELEYON-ERP dashboard · Demo data", "Dashboard showing sales, product costs, profit and a sales trend chart"],
    inventory: ["Inventory · Record incoming stock", "Inventory screen with product lookup and stock details"],
    sale: ["New Sale · Record a transaction", "New Sale screen with product selection and sale entry"],
    benefits: "Know what’s selling and what you’re earning.",
    featureItems: [
      ["Organize products", "Keep your product names, prices, and selling units together."],
      ["Monitor stock", "See what’s available and record stock as it arrives."],
      ["Track sales", "Record each sale and find it later in your sales history."],
      ["Understand acquisition costs", "Record what you paid for stock and the costs of getting it ready to sell."],
      ["See how your business is doing", "Compare sales, product costs, and recorded profit over time."],
      ["Plan the week ahead", "View seven-day sales and profit forecasts when enough eligible history is available."],
    ],
    journey: "Start with one product.",
    steps: [
      ["Create your account", "Register your business, confirm your email, and log in."],
      ["Set your currency and add a product", "Choose your business currency, then enter the first product you sell."],
      ["Add stock and record a sale", "Enter the stock you have on hand. Record a sale when a customer buys it."],
      ["Monitor performance", "See your sales, product costs, and profit on the dashboard."],
    ],
    planTitle: "Tools for every stage of your business.", available: "Available", planned: "Planned",
    versions: [
      { tagline: "Run your business with confidence.", description: "Know what you sell, what’s in stock, and what you earn.", features: ["Products, stock, receipts, and acquisition costs", "Sales recording and sales history", "Profitability dashboards and reports", "Seven-day sales and profit forecasts when eligible history is sufficient"] },
      { tagline: "Understand your costs. Grow your profits.", description: "See more of what it costs to run your business and plan ahead.", features: ["Everything in Basic", "Operating expenses such as rent, utilities, and salaries", "Simplified expense and financial management", "A fuller view of business costs and profitability", "Sales and profit forecasts targeting 30 days"] },
      { tagline: "Predict, optimize, and grow with AI.", description: "Use your business data to make better decisions.", features: ["Everything in Standard", "Advanced forecasting", "Machine-learning-based predictive insights"] },
    ],
    assistant: ["AI business assistant", "Planned to help you understand your data and support business decisions."],
    pricing: "Contact us for subscription pricing.",
    questions: "Questions before you start?", support: "Email CAMELEYON Dynamics",
    faq: [
      ["How do I get started?", "Create your account, verify your email, and log in. You can start with one product."],
      ["What can I do during the trial?", "Try Basic for 90 days with your own products, stock receipts, sales, and reports."],
      ["Do I need a credit card?", "No. You can register and start the trial without a credit card."],
      ["What happens when my free trial ends?", "When the trial ends, access to subscription features is restricted immediately. There is no grace period, and your business records are not deleted immediately. Contact support for help restoring access."],
      ["What happens if I miss a subscription payment?", "Paid subscriptions have a 10-day grace period after a missed renewal. If it ends before payment is resolved, subscription features are restricted. Contact support for help."],
      ["Can I use CAMELEYON-ERP on my phone?", "Yes. Open CAMELEYON-ERP in your phone’s web browser."],
      ["How do I contact support?", "Email technical support. We respond within 24 hours."],
    ],
    final: "Start with one product. See what your business earns.", powered: "Powered by CAMELEYON Dynamics",
    privacy: "Privacy", terms: "Terms of use", rights: "All rights reserved.",
  },
  fr: {
    navigation: "Navigation de l’accueil", features: "Fonctionnalités", plans: "Forfaits", login: "Se connecter",
    signup: "Commencer mon essai gratuit", explore: "Découvrir les fonctionnalités",
    headline: "Gérez vos stocks, vos ventes et vos bénéfices au même endroit.",
    lead: "Simplifiez la gestion de votre entreprise avec CAMELEYON-ERP. Organisez vos produits, suivez vos stocks et vos ventes, comprenez votre rentabilité et prenez de meilleures décisions, le tout sur une plateforme simple à utiliser.",
    trial: "90 jours gratuits. Aucune carte de crédit requise.", offers: "Offres en cours", offerDays: days => `${days} jours gratuits`,
    dashboard: ["Tableau de bord CAMELEYON-ERP · Données de démonstration", "Tableau de bord avec les ventes, les coûts des produits, le bénéfice et un graphique des ventes"],
    inventory: ["Inventaire · Enregistrer une réception de stock", "Écran d’inventaire avec recherche de produits et détails du stock"],
    sale: ["Nouvelle vente · Enregistrer une transaction", "Écran de sélection des produits et de saisie d’une vente"],
    benefits: "Voyez ce qui se vend et ce que vous gagnez.",
    featureItems: [
      ["Organisez vos produits", "Regroupez les noms, les prix et les unités de vente de vos produits."],
      ["Suivez vos stocks", "Consultez les quantités disponibles et enregistrez vos réceptions."],
      ["Suivez vos ventes", "Enregistrez chaque vente et retrouvez-la dans l’historique."],
      ["Comprenez vos coûts d’acquisition", "Consignez le prix d’achat et les frais nécessaires pour préparer vos produits à la vente."],
      ["Suivez les résultats de votre entreprise", "Comparez les ventes, les coûts des produits et le bénéfice enregistré au fil du temps."],
      ["Planifiez la semaine à venir", "Consultez les prévisions de ventes et de bénéfice sur sept jours lorsque l’historique admissible est suffisant."],
    ],
    journey: "Commencez avec un seul produit.",
    steps: [
      ["Créez votre compte", "Inscrivez votre entreprise, confirmez votre adresse courriel et connectez-vous."],
      ["Choisissez votre devise et ajoutez un produit", "Définissez la devise de votre entreprise, puis saisissez votre premier produit."],
      ["Ajoutez du stock et enregistrez une vente", "Saisissez le stock disponible, puis enregistrez une vente lorsqu’un client achète le produit."],
      ["Suivez vos résultats", "Consultez vos ventes, les coûts de vos produits et votre bénéfice dans le tableau de bord."],
    ],
    planTitle: "Des outils pour chaque étape de votre entreprise.", available: "Disponible", planned: "Prévu",
    versions: [
      { tagline: "Gérez votre entreprise en toute confiance.", description: "Voyez ce que vous vendez, ce que vous avez en stock et ce que vous gagnez.", features: ["Produits, stocks, réceptions et coûts d’acquisition", "Saisie des ventes et historique", "Tableaux de bord et rapports de rentabilité", "Prévisions de ventes et de bénéfice sur sept jours, si l’historique admissible est suffisant"] },
      { tagline: "Comprenez vos coûts. Augmentez vos bénéfices.", description: "Comprenez mieux combien coûte l’exploitation de votre entreprise et planifiez vos activités.", features: ["Toutes les fonctions de Basic", "Suivi des dépenses d’exploitation : loyer, services publics et salaires", "Gestion simplifiée des dépenses et des finances", "Vue élargie des coûts et de la rentabilité", "Prévisions de ventes et de bénéfice visant un horizon de 30 jours"] },
      { tagline: "Anticipez, optimisez et développez votre activité avec l’IA.", description: "Appuyez vos décisions sur les données de votre entreprise.", features: ["Toutes les fonctions de Standard", "Prévisions avancées", "Analyses prédictives par apprentissage automatique"] },
    ],
    assistant: ["Assistant d’entreprise avec IA", "Un outil prévu pour vous aider à comprendre vos données et éclairer vos décisions."],
    pricing: "Contactez-nous pour connaître le prix de l’abonnement.",
    questions: "Des questions avant de commencer ?", support: "Écrire à CAMELEYON Dynamics",
    faq: [
      ["Comment démarrer ?", "Créez votre compte, confirmez votre adresse courriel et connectez-vous. Vous pouvez commencer avec un seul produit."],
      ["Que puis-je faire pendant l’essai ?", "Essayez Basic pendant 90 jours avec vos propres produits, réceptions de stock, ventes et rapports."],
      ["Ai-je besoin d’une carte de crédit ?", "Non. Vous pouvez vous inscrire et commencer l’essai sans carte de crédit."],
      ["Que se passe-t-il à la fin de l’essai gratuit ?", "L’accès aux fonctionnalités sous abonnement est restreint dès la fin de l’essai. Il n’y a pas de délai de grâce et vos données d’entreprise ne sont pas supprimées immédiatement. Contactez l’assistance pour rétablir l’accès."],
      ["Que se passe-t-il si je manque un paiement ?", "Les abonnements payants bénéficient d’un délai de grâce de 10 jours après un renouvellement impayé. Si le paiement n’est pas réglé à la fin de ce délai, l’accès aux fonctionnalités sous abonnement est restreint. Contactez l’assistance."],
      ["Puis-je utiliser CAMELEYON-ERP sur mon téléphone ?", "Oui. Ouvrez CAMELEYON-ERP dans le navigateur de votre téléphone."],
      ["Comment joindre l’assistance ?", "Écrivez à l’assistance technique. Nous vous répondrons sous 24 heures."],
    ],
    final: "Commencez avec un produit. Voyez ce que votre entreprise gagne.", powered: "Propulsé par CAMELEYON Dynamics",
    privacy: "Confidentialité", terms: "Conditions d’utilisation", rights: "Tous droits réservés.",
  },
  es: {
    navigation: "Navegación de inicio", features: "Funciones", plans: "Planes", login: "Iniciar sesión",
    signup: "Comenzar mi prueba gratuita", explore: "Explorar funciones",
    headline: "Gestiona tu inventario, ventas y ganancias en un solo lugar.",
    lead: "Simplifica la gestión de tu negocio con CAMELEYON-ERP. Organiza tus productos, controla el inventario, da seguimiento a tus ventas, comprende tu rentabilidad y toma mejores decisiones desde una plataforma fácil de usar.",
    trial: "90 días gratis. No se requiere tarjeta de crédito.", offers: "Ofertas vigentes", offerDays: days => `${days} días gratis`,
    dashboard: ["Panel de CAMELEYON-ERP · Datos de demostración", "Panel con ventas, costos de productos, ganancias y un gráfico de ventas"],
    inventory: ["Inventario · Registrar una entrada de stock", "Pantalla de inventario con búsqueda de productos y detalles de existencias"],
    sale: ["Nueva venta · Registrar una transacción", "Pantalla para seleccionar productos y registrar una venta"],
    benefits: "Descubre qué se vende y cuánto ganas.",
    featureItems: [
      ["Organiza tus productos", "Reúne los nombres, precios y unidades de venta de tus productos."],
      ["Controla tu inventario", "Consulta las existencias y registra las entradas a medida que llegan."],
      ["Da seguimiento a tus ventas", "Registra cada venta y consúltala después en el historial."],
      ["Comprende los costos de adquisición", "Registra el precio de compra y los costos de preparar los productos para la venta."],
      ["Consulta el rendimiento del negocio", "Compara las ventas, los costos de productos y las ganancias registradas a lo largo del tiempo."],
      ["Planifica la semana", "Consulta previsiones de ventas y ganancias a siete días cuando haya suficiente historial elegible."],
    ],
    journey: "Empieza con un solo producto.",
    steps: [
      ["Crea tu cuenta", "Registra tu negocio, confirma tu correo electrónico e inicia sesión."],
      ["Elige tu moneda y agrega un producto", "Configura la moneda de tu negocio y registra el primer producto que vendes."],
      ["Agrega existencias y registra una venta", "Ingresa las existencias disponibles. Registra una venta cuando un cliente compre el producto."],
      ["Consulta tus resultados", "Revisa tus ventas, costos de productos y ganancias en el panel."],
    ],
    planTitle: "Herramientas para cada etapa de tu negocio.", available: "Disponible", planned: "Previsto",
    versions: [
      { tagline: "Gestiona tu negocio con confianza.", description: "Conoce lo que vendes, lo que tienes en inventario y lo que ganas.", features: ["Productos, existencias, entradas y costos de adquisición", "Registro e historial de ventas", "Paneles e informes de rentabilidad", "Previsiones de ventas y ganancias a siete días cuando haya suficiente historial elegible"] },
      { tagline: "Comprende tus costos. Aumenta tus ganancias.", description: "Entiende mejor cuánto cuesta operar tu negocio y planifica con antelación.", features: ["Todo lo incluido en Basic", "Gastos operativos como alquiler, servicios y sueldos", "Gestión simplificada de gastos y finanzas", "Una visión más completa de los costos y la rentabilidad", "Previsiones de ventas y ganancias con un objetivo de 30 días"] },
      { tagline: "Predice, optimiza y crece con IA.", description: "Usa los datos de tu negocio para tomar mejores decisiones.", features: ["Todo lo incluido en Standard", "Previsiones avanzadas", "Análisis predictivo mediante aprendizaje automático"] },
    ],
    assistant: ["Asistente empresarial con IA", "Una función prevista para ayudarte a entender tus datos y tomar decisiones."],
    pricing: "Contáctanos para conocer el precio de la suscripción.",
    questions: "¿Tienes preguntas antes de empezar?", support: "Escribir a CAMELEYON Dynamics",
    faq: [
      ["¿Cómo empiezo?", "Crea tu cuenta, confirma tu correo electrónico e inicia sesión. Puedes comenzar con un solo producto."],
      ["¿Qué puedo hacer durante la prueba?", "Prueba Basic durante 90 días con tus propios productos, entradas de inventario, ventas e informes."],
      ["¿Necesito una tarjeta de crédito?", "No. Puedes registrarte y comenzar la prueba sin tarjeta de crédito."],
      ["¿Qué sucede cuando termina mi prueba gratuita?", "El acceso a las funciones de suscripción se restringe en cuanto termina la prueba. No hay período de gracia y los datos de tu negocio no se eliminan de inmediato. Contacta con soporte para recuperar el acceso."],
      ["¿Qué pasa si no pago una renovación?", "Las suscripciones de pago tienen un período de gracia de 10 días tras una renovación impagada. Si el pago no se resuelve antes de que termine, se restringe el acceso a las funciones de suscripción. Contacta con soporte."],
      ["¿Puedo usar CAMELEYON-ERP en mi teléfono?", "Sí. Abre CAMELEYON-ERP en el navegador de tu teléfono."],
      ["¿Cómo contacto con soporte?", "Escribe a asistencia técnica. Te responderemos en un plazo de 24 horas."],
    ],
    final: "Empieza con un producto. Descubre cuánto gana tu negocio.", powered: "Desarrollado por CAMELEYON Dynamics",
    privacy: "Privacidad", terms: "Términos de uso", rights: "Todos los derechos reservados.",
  },
} satisfies Record<Language, HomepageCopy>

import type { Language } from "./messages"

export const publicTerms = {
  fr: {
    title: "Conditions d'utilisation CAMELEYON ERP",
    close: "Fermer",
    paragraphs: [
      "CAMELEYON ERP est fourni par CAMELEYON Dynamics pour aider l'entreprise à gérer ses ventes, son inventaire, ses produits, ses prix, ses clients, ses factures et ses opérations.",
      "L'entreprise confirme que les informations fournies lors de l'inscription sont exactes et que l'administrateur principal est responsable de la gestion des utilisateurs, des accès et des données de l'entreprise.",
      "L'utilisation de la solution peut dépendre d'un abonnement payant. Tout mois commencé est dû. CAMELEYON se réserve le droit de revoir le prix de l'abonnement au besoin, avec information préalable lorsque nécessaire.",
      "L'entreprise demeure responsable des données qu'elle saisit dans la solution. CAMELEYON met en place des mesures raisonnables pour protéger la plateforme, mais l'entreprise doit aussi protéger ses identifiants et l'accès à ses comptes.",
      "Certaines fonctionnalités, comme l'envoi d'e-mails, les paiements automatiques, les rapports ou les intégrations externes, peuvent dépendre de services tiers et de leur disponibilité.",
      "CAMELEYON peut limiter, suspendre ou bloquer l'accès en cas de non-paiement, d'utilisation abusive, de tentative de fraude, d'atteinte à la sécurité ou de violation des présentes conditions.",
      "En créant son compte, l'entreprise accepte ces conditions et comprend qu'elles peuvent être mises à jour au besoin pour tenir compte de l'évolution du service.",
    ],
  },
  es: {
    title: "Términos de uso de CAMELEYON ERP",
    close: "Cerrar",
    paragraphs: [
      "CAMELEYON ERP es proporcionado por CAMELEYON Dynamics para ayudar a la empresa a gestionar ventas, inventario, productos, precios, clientes, facturas y operaciones.",
      "La empresa confirma que la información enviada durante el registro es correcta y que el administrador principal es responsable de gestionar usuarios, accesos y datos de la empresa.",
      "El uso de la solución puede depender de una suscripción paga. Todo mes iniciado debe pagarse. CAMELEYON se reserva el derecho de revisar el precio de la suscripción cuando sea necesario, con aviso previo cuando corresponda.",
      "La empresa sigue siendo responsable de los datos que introduce en la solución. CAMELEYON aplica medidas razonables para proteger la plataforma, pero la empresa también debe proteger sus credenciales y el acceso a sus cuentas.",
      "Algunas funciones, como envío de correos, pagos automáticos, informes o integraciones externas, pueden depender de servicios de terceros y de su disponibilidad.",
      "CAMELEYON puede limitar, suspender o bloquear el acceso en caso de falta de pago, uso abusivo, intento de fraude, riesgo de seguridad o incumplimiento de estos términos.",
      "Al crear su cuenta, la empresa acepta estos términos y entiende que pueden actualizarse cuando sea necesario para reflejar la evolución del servicio.",
    ],
  },
  en: {
    title: "CAMELEYON ERP Terms of Use",
    close: "Close",
    paragraphs: [
      "CAMELEYON ERP is provided by CAMELEYON Dynamics to help the company manage sales, inventory, products, pricing, customers, invoices, and operations.",
      "The company confirms that the information submitted during signup is accurate and that the main administrator is responsible for managing users, access, and company data.",
      "Use of the solution may depend on a paid subscription. Any month that has started is due. CAMELEYON reserves the right to review subscription pricing when needed, with prior notice when required.",
      "The company remains responsible for the data it enters into the solution. CAMELEYON applies reasonable measures to protect the platform, but the company must also protect credentials and account access.",
      "Some features, such as email delivery, automatic payments, reports, or external integrations, may depend on third-party services and their availability.",
      "CAMELEYON may limit, suspend, or block access in case of non-payment, abusive use, attempted fraud, security risk, or breach of these terms.",
      "By creating an account, the company accepts these terms and understands that they may be updated when needed to reflect the evolution of the service.",
    ],
  },
} satisfies Record<Language, { title: string; close: string; paragraphs: string[] }>

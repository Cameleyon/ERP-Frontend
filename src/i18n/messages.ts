export type Language = "fr" | "en" | "es"

export const messages = {
  fr: {
    language: {
      fr: "FR",
      en: "EN",
      es: "ES",
    },
    app: {
      sessionLoading: "Chargement de la session...",
    },
    common: {
      loading: "Chargement...",
      cancel: "Annuler",
      save: "Enregistrer",
      close: "Fermer",
      menu: "Menu",
      logout: "Deconnexion",
      profile: "Profil",
      active: "Actif",
      inactive: "Inactif",
    },
    sidebar: {
      dashboard: "Tableau de bord",
      customers: "Clients",
      newSale: "Nouvelle vente",
      salesHistory: "Historique des ventes",
      inventory: "Inventaire",
      inventoryReceipt: "Reception d'inventaire",
      products: "Produits",
      units: "Unites",
      costRubrics: "Rubriques de cout",
    },
  },
  en: {
    language: {
      fr: "FR",
      en: "EN",
      es: "ES",
    },
    app: {
      sessionLoading: "Loading session...",
    },
    common: {
      loading: "Loading...",
      cancel: "Cancel",
      save: "Save",
      close: "Close",
      menu: "Menu",
      logout: "Logout",
      profile: "Profile",
      active: "Active",
      inactive: "Inactive",
    },
    sidebar: {
      dashboard: "Dashboard",
      customers: "Customers",
      newSale: "New Sale",
      salesHistory: "Sales History",
      inventory: "Inventory",
      inventoryReceipt: "Inventory Receipt",
      products: "Products",
      units: "Units",
      costRubrics: "Cost Rubrics",
    },
  },
  es: {
    language: {
      fr: "FR",
      en: "EN",
      es: "ES",
    },
    app: {
      sessionLoading: "Cargando la sesion...",
    },
    common: {
      loading: "Cargando...",
      cancel: "Cancelar",
      save: "Guardar",
      close: "Cerrar",
      menu: "Menu",
      logout: "Cerrar sesion",
      profile: "Perfil",
      active: "Activo",
      inactive: "Inactivo",
    },
    sidebar: {
      dashboard: "Panel",
      customers: "Clientes",
      newSale: "Nueva venta",
      salesHistory: "Historial de ventas",
      inventory: "Inventario",
      inventoryReceipt: "Recepcion de inventario",
      products: "Productos",
      units: "Unidades",
      costRubrics: "Rubricas de costo",
    },
  },
} as const

export type AppMessages = (typeof messages)[Language]

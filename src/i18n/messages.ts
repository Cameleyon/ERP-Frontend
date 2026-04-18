export type Language = "fr" | "en"

export const messages = {
  fr: {
    language: {
      fr: "FR",
      en: "EN",
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
      logout: "Déconnexion",
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
      inventoryReceipt: "Réception d'inventaire",
      products: "Produits",
      units: "Unités",
      costRubrics: "Rubriques de coût",
    },
  },
  en: {
    language: {
      fr: "FR",
      en: "EN",
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
} as const

export type AppMessages = (typeof messages)[Language]

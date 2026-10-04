// ==============================================================================
// FASTSporty AI — Formateur de Prix & Devises Universel (Master Specification)
// Règle: Stockage strict en XAF (entiers), Affichage en EUR (parité 1 EUR = 655.957 XAF)
// ==============================================================================

export const XAF_PER_EUR = 655.957;

/**
 * Formate un montant stocké en XAF en devise d'affichage (EUR par défaut)
 * @param {number} amountXaf - Montant en Franc CFA (entier)
 * @param {string} lang - 'fr' ou 'en'
 * @param {object} options - { showXafHint: boolean, currency: 'EUR' | 'XAF' }
 * @returns {string} - Ex: "6,10 €" ou "€6.10" ou "6,10 € (3 999 FCFA)"
 */
export function formatPrice(amountXaf, lang = "fr", options = {}) {
  const { showXafHint = false, currency = "EUR" } = options;
  const numXaf = Math.round(Number(amountXaf) || 0);

  if (currency === "XAF") {
    const formattedXaf = numXaf.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
    return `${formattedXaf} FCFA`;
  }

  // Conversion en EUR avec arrondi à 2 décimales
  const amountEur = (numXaf / XAF_PER_EUR).toFixed(2);
  let formattedEur = "";

  if (lang === "fr") {
    formattedEur = `${amountEur.replace(".", ",")} €`;
  } else {
    formattedEur = `€${amountEur}`;
  }

  if (showXafHint) {
    const formattedXaf = numXaf.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
    return `${formattedEur} (${formattedXaf} FCFA)`;
  }

  return formattedEur;
}

/**
 * Convertit un montant EUR vers son équivalent XAF entier
 */
export function eurToXaf(amountEur) {
  return Math.round((Number(amountEur) || 0) * XAF_PER_EUR);
}

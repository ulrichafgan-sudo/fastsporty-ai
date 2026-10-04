// ==============================================================================
// FASTSporty AI — Service de Paiement MakeTou & Passerelle Universelle
// Basé sur la documentation et l'audit de production MakeTou (api marketo)
// ==============================================================================
import { supabase } from "./supabase.js";
import { formatPrice } from "./pricing.js";

const STORAGE_KEY = "fastsporty_maketou_config";

/**
 * Plans officiels conformes au Master Specification
 */
export const MAKETOU_PLANS = {
  rookie: {
    id: "rookie",
    name: "Fast Rookie",
    badge: "14 JOURS",
    durationDays: 14,
    priceXAF: 3999,
    includedTypes: ["SAFE", "FUN"],
    featuresFr: [
      "Coupons SAFE & FUN quotidiens",
      "Analyses algorithmiques complètes",
      "Accès 14 jours"
    ],
    featuresEn: [
      "Daily SAFE & FUN coupons",
      "Full algorithmic analysis",
      "14 days access"
    ]
  },
  standard: {
    id: "standard",
    name: "Fast Standard",
    badge: "1 MOIS",
    durationDays: 30,
    priceXAF: 5999,
    includedTypes: ["SAFE", "FUN"],
    isPopular: true,
    featuresFr: [
      "Tout Fast Rookie pour 1 mois complet",
      "Historique complet vérifié",
      "Accès prioritaire 30 jours"
    ],
    featuresEn: [
      "All Fast Rookie for 1 full month",
      "Full verified history",
      "Priority access 30 days"
    ]
  },
  premium: {
    id: "premium",
    name: "Fast Premium",
    badge: "ACCÈS TOTAL",
    durationDays: 30,
    priceXAF: 8999,
    includedTypes: ["SAFE", "FUN", "MONTANTE", "PREMIUM"],
    featuresFr: [
      "Accès illimité à TOUS les coupons (SAFE, FUN, Montante, Premium)",
      "Scores exacts & Paliers de Montante inclus",
      "Tous les coupons Extras inclus sans supplément"
    ],
    featuresEn: [
      "Unlimited access to ALL coupons (SAFE, FUN, Montante, Premium)",
      "Exact scores & Montante steps included",
      "All Extra coupons included at no extra cost"
    ]
  }
};

/**
 * Tarifs de déblocage à l'unité (Section 4 de la spécification)
 */
export const UNLOCK_PRICES = {
  MONTANTE: 500,  // XAF (~0,76 €)
  PREMIUM: 700,   // XAF (~1,07 €)
  PACK: 1000      // XAF (~1,52 €) - Montante + Premium
};

/**
 * Nettoyage et assainissement des chaînes (Règle MakeTou : lettres ASCII uniquement, >= 2 caractères)
 */
export function sanitizeNameForMaketou(rawName, fallback = "Abonne") {
  if (!rawName) return fallback;
  // Enlever accents et caractères spéciaux
  const cleaned = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();
  return cleaned.length >= 2 ? cleaned : fallback;
}

/**
 * Normalisation de téléphone au format E.164 (+237...) ou null si invalide
 */
export function sanitizePhoneForMaketou(rawPhone) {
  if (!rawPhone) return undefined;
  const digits = rawPhone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length >= 9 && digits.length <= 16) {
    return digits;
  }
  if (!digits.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+237${digits}`; // Indicatif par défaut Afrique Centrale
  }
  return undefined; // Omettre si invalide pour éviter le 422 de MakeTou
}

/**
 * Configuration MakeTou
 */
export function getMaketouConfig() {
  let saved = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}

  return {
    mode: saved.mode || import.meta.env.VITE_MAKETOU_MODE || "mock", // 'mock' sur localhost, 'live' en prod
    apiUrl: import.meta.env.VITE_MAKETOU_API_URL || "https://api.maketou.net",
    apiKey: saved.apiKey || import.meta.env.VITE_MAKETOU_API_KEY || "",
    redirectBaseUrl: saved.redirectBaseUrl || import.meta.env.VITE_MAKETOU_REDIRECT_BASE_URL || window.location.origin,
    productDocumentId: saved.productDocumentId || import.meta.env.VITE_MAKETOU_PRODUCT_DOCUMENT_ID || "",
    products: {
      rookie: saved.products?.rookie || import.meta.env.VITE_MAKETOU_PRODUCT_ROOKIE || "",
      standard: saved.products?.standard || import.meta.env.VITE_MAKETOU_PRODUCT_STANDARD || "",
      premium: saved.products?.premium || import.meta.env.VITE_MAKETOU_PRODUCT_PREMIUM || ""
    }
  };
}

export function saveMaketouConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return true;
  } catch (e) {
    return false;
  }
}

export async function testMaketouApiKey(apiKey) {
  try {
    const config = getMaketouConfig();
    const key = apiKey || config.apiKey;
    if (!key) return { success: false, message: "Aucune clé fournie." };
    const res = await fetch(`${config.apiUrl}/api/v1/stores/products`, {
      headers: { Authorization: `Bearer ${key.trim()}` }
    });
    return { success: res.ok, status: res.status };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Initialise le paiement MakeTou (conformément à l'audit MakeTou / Section 6)
 */
export async function createPaymentCheckout({ kind = "plan", planKey, couponId, user, profile, phone }) {
  if (!user?.id) {
    throw new Error("Authentification requise pour effectuer un paiement.");
  }

  const config = getMaketouConfig();
  let amountXaf = 0;
  let planId = null;
  let planName = "";

  if (kind === "plan") {
    const plan = MAKETOU_PLANS[planKey] || MAKETOU_PLANS.standard;
    amountXaf = plan.priceXAF;
    planId = plan.id;
    planName = plan.name;
  } else if (kind === "unlock") {
    amountXaf = UNLOCK_PRICES[planKey] || 500;
  } else if (kind === "pack") {
    amountXaf = UNLOCK_PRICES.PACK;
  }

  // 1. Enregistrement transaction en base dans public.payments (status: pending)
  const txRef = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const { data: paymentRow, error: txError } = await supabase
    .from("payments")
    .insert([
      {
        user_id: user.id,
        kind,
        plan_id: planId,
        coupon_id: couponId || null,
        amount_xaf: amountXaf,
        provider: "maketou",
        provider_reference: txRef,
        status: "pending"
      }
    ])
    .select()
    .single();

  if (txError) {
    console.warn("Erreur insertion payments, continuation avec ref locale:", txError);
  }

  // 2. Mode Simulation / Mock (pour localhost ou avant saisie de clé en production)
  if (config.mode === "mock" || !config.apiKey) {
    return {
      mode: "mock",
      transactionRef: txRef,
      amountXaf,
      planKey,
      planName
    };
  }

  // 3. Mode Live MakeTou
  const productId = config.productDocumentId || config.products?.[planKey] || config.products?.premium;
  if (!productId) {
    // Si pas de produit configuré, bascule automatique et propre en mode mock
    return {
      mode: "mock",
      transactionRef: txRef,
      amountXaf,
      planKey,
      planName
    };
  }

  const cleanFirstName = sanitizeNameForMaketou(profile?.username || user.email?.split("@")[0], "Membre");
  const cleanLastName = "FASTSporty";
  const validPhone = sanitizePhoneForMaketou(phone);

  // L'URL de retour MakeTou ne doit comporter AUCUN paramètre de requête (Section 6.1)
  const returnUrl = `${config.redirectBaseUrl}/pay/return/${txRef}`;

  const payload = {
    productDocumentId: productId,
    email: user.email.trim().toLowerCase(),
    firstName: cleanFirstName,
    lastName: cleanLastName,
    redirectURL: returnUrl,
    customerPrice: amountXaf,
    meta: {
      userId: user.id,
      source: "fast_sporty_ai",
      txRef: txRef,
      kind: kind,
      planId: planId || ""
    }
  };

  if (validPhone) {
    payload.phone = validPhone;
  }

  try {
    const res = await fetch(`${config.apiUrl}/api/v1/stores/cart/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.redirectUrl) {
      throw new Error(data.message || data.error || "Impossible d'initialiser le paiement MakeTou.");
    }

    // Mettre à jour la référence avec le vrai cart.id de MakeTou
    if (data.cart?.id) {
      await supabase
        .from("payments")
        .update({ provider_reference: data.cart.id })
        .eq("provider_reference", txRef);
    }

    return {
      mode: "live",
      redirectUrl: data.redirectUrl,
      cartId: data.cart?.id,
      transactionRef: txRef
    };
  } catch (err) {
    console.error("MakeTou Checkout error:", err);
    throw err;
  }
}

/**
 * Validation et activation de l'abonnement ou du déblocage en base
 */
export async function confirmAndActivatePayment({ userId, kind = "plan", planKey, couponId, transactionRef }) {
  if (!userId) throw new Error("ID utilisateur manquant.");

  // 1. Essayer d'abord via la procédure stockée sécurisée Supabase RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("process_payment_activation", {
      p_kind: kind,
      p_plan_key: planKey || "standard",
      p_coupon_id: couponId || null,
      p_transaction_ref: transactionRef || null
    });

    if (!rpcError && rpcData?.success) {
      return { success: true, data: rpcData };
    }
    if (rpcError) {
      console.warn("process_payment_activation RPC failed, falling back to direct tables:", rpcError);
    }
  } catch (rpcErr) {
    console.warn("RPC call error, falling back:", rpcErr);
  }

  // 2. Fallback manuel en cas de non disponibilité du RPC
  const now = new Date();

  if (kind === "plan") {
    const plan = MAKETOU_PLANS[planKey] || MAKETOU_PLANS.standard;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    await supabase.from("subscriptions").insert([
      {
        user_id: userId,
        plan_tier: plan.id,
        plan_name: plan.name,
        duration_days: plan.durationDays,
        amount_paid: plan.priceXAF,
        currency: "XAF",
        payment_method: "maketou",
        provider: "maketou",
        payment_reference: transactionRef || `REF-${Date.now()}`,
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }
    ]);

    await supabase.from("profiles").update({
      subscription_tier: plan.id,
      subscription_name: plan.name,
      subscription_days_remaining: plan.durationDays,
      subscription_expires_at: expiresAt.toISOString(),
      special_coupon_unlocked: true,
      daily_unlocked_types: plan.includedTypes
    }).eq("id", userId);

  } else if (kind === "unlock" && couponId) {
    await supabase.from("coupon_unlocks").upsert(
      [
        {
          user_id: userId,
          coupon_id: couponId,
          method: "paid"
        }
      ],
      { onConflict: "user_id, coupon_id" }
    );
  } else if (kind === "pack") {
    const today = now.toISOString().split("T")[0];
    const { data: todayCoupons } = await supabase
      .from("coupons")
      .select("id, type")
      .eq("date", today);

    if (todayCoupons) {
      for (const c of todayCoupons) {
        if (c.type === "MONTANTE" || c.type === "PREMIUM") {
          await supabase.from("coupon_unlocks").upsert([
            {
              user_id: userId,
              coupon_id: c.id,
              method: "paid"
            }
          ], { onConflict: "user_id, coupon_id" });
        }
      }
    }
  }

  if (transactionRef) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: now.toISOString() })
      .or(`provider_reference.eq.${transactionRef},id.eq.${transactionRef}`);
  }

  return { success: true };
}

export const activateUserSubscriptionInDatabase = confirmAndActivatePayment;

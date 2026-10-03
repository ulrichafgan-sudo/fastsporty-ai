// Client Supabase pour la synchronisation des coupons et utilisateurs
import { createClient } from "@supabase/supabase-js";

// Configuration Supabase par défaut ou personnalisable via l'interface
const SUPABASE_URL = localStorage.getItem("fastsporty_supabase_url") || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = localStorage.getItem("fastsporty_supabase_key") || "your-anon-key";

let supabaseClient = null;

try {
  if (SUPABASE_URL && SUPABASE_URL !== "https://your-project.supabase.co") {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Supabase initialisé en mode fallback local:", e);
}

export const supabase = supabaseClient;

/**
 * Récupère les coupons persistés
 */
export async function fetchCouponsFromDb() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (err) {
      console.warn("Erreur Supabase fetch:", err);
    }
  }

  // Fallback localStorage
  const local = localStorage.getItem("fastsporty_custom_coupons");
  return local ? JSON.parse(local) : null;
}

/**
 * Sauvegarde un nouveau coupon dans la base
 */
export async function saveCouponToDb(coupon) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("coupons").insert([coupon]);
      if (!error) return { success: true, data };
    } catch (err) {
      console.warn("Erreur Supabase insert:", err);
    }
  }

  // Sauvegarde locale
  const existing = JSON.parse(localStorage.getItem("fastsporty_custom_coupons") || "[]");
  existing.unshift(coupon);
  localStorage.setItem("fastsporty_custom_coupons", JSON.stringify(existing));
  return { success: true, local: true };
}

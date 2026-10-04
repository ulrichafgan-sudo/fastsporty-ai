// =====================================================================
// FAST SPORTY AI — Edge Function MakeTou (checkout + vérification)
// La clé API MakeTou ne quitte JAMAIS le serveur.
//   POST { action: "create", kind: "plan"|"unlock"|"pack", planId?, couponId? }
//   POST { action: "verify", paymentId }
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAKETOU_API = "https://api.maketou.net";
const PACK_PRICE_XAF = 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// MakeTou refuse chiffres/accents dans les noms (HTTP 422)
function cleanName(raw: string | null | undefined, fallback: string) {
  const s = (raw ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "");
  return s.length >= 2 ? s.slice(0, 40) : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // 1. Authentification obligatoire (JWT Supabase)
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  const user = authData?.user;
  if (authErr || !user) return json({ error: "Veuillez vous connecter." }, 401);

  // 2. Secrets serveur
  const { data: secretRows } = await admin.from("app_secrets").select("key,value");
  const secrets = Object.fromEntries((secretRows ?? []).map((r) => [r.key, r.value]));
  const apiKey = Deno.env.get("MAKETOU_API_KEY") || secrets.MAKETOU_API_KEY;
  const productId = Deno.env.get("MAKETOU_PRODUCT_DOCUMENT_ID") || secrets.MAKETOU_PRODUCT_DOCUMENT_ID;
  const baseUrl = (Deno.env.get("APP_BASE_URL") || secrets.APP_BASE_URL || "").replace(/\/$/, "");
  if (!apiKey || !productId) {
    return json({ error: "Paiement indisponible : MakeTou n'est pas encore configuré par l'administrateur." }, 503);
  }

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  // ------------------------------------------------------------------ CREATE
  if (body.action === "create") {
    const kind = body.kind;
    let amount = 0, planId: string | null = null, couponId: string | null = null, label = "";

    // Le prix vient TOUJOURS de la base, jamais du navigateur
    if (kind === "plan") {
      const { data: plan } = await admin.from("plans").select("id,name_fr,price_xaf").eq("id", body.planId).single();
      if (!plan) return json({ error: "Forfait inconnu." }, 400);
      amount = plan.price_xaf; planId = plan.id; label = plan.name_fr;
    } else if (kind === "unlock") {
      const { data: coupon } = await admin.from("coupons").select("id,type").eq("id", body.couponId).single();
      if (!coupon) return json({ error: "Coupon introuvable." }, 400);
      const t = String(coupon.type).toUpperCase();
      const code = t === "SCORE EXACT" ? "PREMIUM" : t;
      const { data: ct } = await admin.from("coupon_types").select("unlock_price_xaf").eq("code", code).single();
      if (!ct?.unlock_price_xaf) return json({ error: "Ce coupon n'est pas déblocable à l'unité." }, 400);
      const { data: canAccess } = await admin.rpc("can_access_coupon", { p_uid: user.id, p_coupon_id: coupon.id });
      if (canAccess) return json({ error: "Vous avez déjà accès à ce coupon." }, 400);
      amount = ct.unlock_price_xaf; couponId = coupon.id; label = `Coupon ${code}`;
    } else if (kind === "pack") {
      amount = PACK_PRICE_XAF; label = "Pack Montante + Premium";
    } else {
      return json({ error: "Type de paiement invalide." }, 400);
    }

    // Une seule transaction en attente par utilisateur
    await admin.from("payments").delete().eq("user_id", user.id).eq("status", "pending");

    const { data: payment, error: payErr } = await admin.from("payments").insert({
      user_id: user.id, kind, plan_id: planId, coupon_id: couponId,
      amount_xaf: amount, provider: "maketou", status: "pending",
    }).select().single();
    if (payErr || !payment) return json({ error: "Impossible d'enregistrer la transaction." }, 500);

    const { data: profile } = await admin.from("profiles").select("username").eq("id", user.id).single();
    const payload: Record<string, unknown> = {
      productDocumentId: productId,
      email: (user.email ?? "").trim().toLowerCase(),
      firstName: cleanName(profile?.username || user.email?.split("@")[0], "Membre"),
      lastName: "FastSporty",
      customerPrice: amount,
      meta: { userId: user.id, paymentId: payment.id, kind, source: "fast_sporty_ai" },
    };
    // MakeTou refuse http://localhost et les query strings
    if (baseUrl.startsWith("https://")) payload.redirectURL = `${baseUrl}/pay/return/${payment.id}`;

    const res = await fetch(`${MAKETOU_API}/api/v1/stores/cart/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.redirectUrl) {
      console.error("MakeTou checkout failed", res.status, JSON.stringify(data).slice(0, 300));
      await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      const msg = res.status === 401 ? "Clé API MakeTou invalide."
        : res.status === 400 ? "Produit MakeTou invalide ou non publié."
        : res.status === 429 ? "Trop de tentatives, réessayez dans une minute."
        : "MakeTou a refusé la création du paiement.";
      return json({ error: msg }, 502);
    }

    await admin.from("payments").update({ provider_reference: data.cart?.id ?? null }).eq("id", payment.id);
    if (data.cart?.status === "completed") {
      await admin.rpc("apply_paid_payment", { p_payment_id: payment.id, p_cart_id: data.cart.id });
    }
    return json({ paymentId: payment.id, checkoutUrl: data.redirectUrl, amount, label, sameTab: Boolean(payload.redirectURL) });
  }

  // ------------------------------------------------------------------ VERIFY
  if (body.action === "verify") {
    const { data: payment } = await admin.from("payments").select("*").eq("id", body.paymentId).single();
    if (!payment || payment.user_id !== user.id) return json({ error: "Transaction introuvable." }, 404);
    if (payment.status === "paid") return json({ status: "paid", kind: payment.kind });
    if (payment.status === "failed") return json({ status: "failed" });
    if (!payment.provider_reference) return json({ status: "pending" });

    const res = await fetch(`${MAKETOU_API}/api/v1/stores/cart/${payment.provider_reference}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json().catch(() => ({}));
    const cartStatus = data?.cart?.status ?? data?.status;

    if (cartStatus === "completed") {
      const { data: r } = await admin.rpc("apply_paid_payment", { p_payment_id: payment.id, p_cart_id: payment.provider_reference });
      return json({ status: r?.success ? "paid" : "error", kind: payment.kind });
    }
    if (cartStatus === "abandoned" || cartStatus === "payment_failed") {
      await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return json({ status: "failed" });
    }
    return json({ status: "pending" });
  }

  return json({ error: "Action inconnue." }, 400);
});

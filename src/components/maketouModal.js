// ==============================================================================
// FASTSporty AI — Modal de Paiement & Souscription Sécurisée MakeTou
// ==============================================================================
import confetti from "canvas-confetti";
import {
  MAKETOU_PLANS,
  UNLOCK_PRICES,
  createPaymentCheckout,
  confirmAndActivatePayment
} from "../services/maketouPayment.js";
import { formatPrice } from "../services/pricing.js";
import { getCurrentLanguage } from "../services/i18n.js";

export function initMaketouUI({ getCurrentUser, getCurrentProfile, authModal, showToast, onSubscriptionActivated }) {

  // 1. Injecter le modal de checkout dans le DOM
  let checkoutModal = document.getElementById("fastsporty-checkout-modal");
  if (!checkoutModal) {
    checkoutModal = document.createElement("div");
    checkoutModal.id = "fastsporty-checkout-modal";
    checkoutModal.className = "admin-modal-backdrop";
    checkoutModal.innerHTML = `
      <div class="admin-modal-card" style="max-width: 520px; border-radius: 20px;">
        <!-- Header -->
        <div class="admin-modal-header" style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <div class="admin-header-left">
            <div class="admin-badge-crown" style="background: rgba(34,229,160,0.15); border-color: #22e5a0; color: #22e5a0; font-size: 11px;">
              <i class="ph-bold ph-shield-check"></i> PAIEMENT SÉCURISÉ MAKETOU
            </div>
            <h2 class="admin-title" id="checkout-modal-title" style="font-size: 19px; margin-top: 4px;">Souscrire à FASTSporty</h2>
          </div>
          <div class="admin-header-right">
            <button class="admin-close-btn" id="checkout-modal-close-btn" aria-label="Fermer"><i class="ph-bold ph-x"></i></button>
          </div>
        </div>

        <!-- Body -->
        <div class="admin-modal-body" style="padding: 22px 24px; max-height: 75vh; overflow-y: auto;">
          <!-- Récapitulatif Formule -->
          <div id="checkout-plan-card" style="background: linear-gradient(135deg, rgba(124,77,255,0.12), rgba(34,229,160,0.08)); border: 1px solid rgba(124,77,255,0.3); border-radius: 14px; padding: 16px 18px; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
              <span id="checkout-plan-badge" style="background: rgba(124,77,255,0.25); color: #b18cff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">1 MOIS</span>
              <span id="checkout-plan-price" style="font-size: 18px; font-weight: 800; color: #fff;">9,15 € (5 999 FCFA)</span>
            </div>
            <h3 id="checkout-plan-name" style="font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 6px;">Fast Standard</h3>
            <p id="checkout-plan-desc" style="font-size: 13px; color: var(--c-text-muted); line-height: 1.4; margin: 0;">Tout Fast Rookie pour 1 mois complet avec historique vérifié.</p>
          </div>

          <form id="checkout-payment-form">
            <!-- Choix du moyen de paiement -->
            <label style="display:block; font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px;">
              Choisissez votre mode de paiement :
            </label>
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px;" id="checkout-methods-grid">
              
              <!-- Orange Money -->
              <label class="checkout-method-option active" style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:rgba(255,102,0,0.12); border:1px solid rgba(255,102,0,0.4); border-radius:10px; cursor:pointer;">
                <input type="radio" name="payment_method" value="orange_money" checked style="accent-color:#FF6600;" />
                <div>
                  <div style="font-size:12px; font-weight:700; color:#fff;">Orange Money</div>
                  <div style="font-size:10px; color:#FF6600;">Mobile Money</div>
                </div>
              </label>

              <!-- MTN MoMo -->
              <label class="checkout-method-option" style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:rgba(255,204,0,0.08); border:1px solid rgba(255,204,0,0.25); border-radius:10px; cursor:pointer;">
                <input type="radio" name="payment_method" value="mtn_momo" style="accent-color:#FFCC00;" />
                <div>
                  <div style="font-size:12px; font-weight:700; color:#fff;">MTN MoMo</div>
                  <div style="font-size:10px; color:#FFCC00;">Mobile Money</div>
                </div>
              </label>

              <!-- Wave -->
              <label class="checkout-method-option" style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:rgba(27,169,225,0.08); border:1px solid rgba(27,169,225,0.25); border-radius:10px; cursor:pointer;">
                <input type="radio" name="payment_method" value="wave" style="accent-color:#1BA9E1;" />
                <div>
                  <div style="font-size:12px; font-weight:700; color:#fff;">Wave</div>
                  <div style="font-size:10px; color:#1BA9E1;">Sénégal / CI</div>
                </div>
              </label>

              <!-- Carte Bancaire -->
              <label class="checkout-method-option" style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:rgba(124,77,255,0.08); border:1px solid rgba(124,77,255,0.25); border-radius:10px; cursor:pointer;">
                <input type="radio" name="payment_method" value="card" style="accent-color:#7C4DFF;" />
                <div>
                  <div style="font-size:12px; font-weight:700; color:#fff;">Carte Bancaire</div>
                  <div style="font-size:10px; color:#7C4DFF;">Visa / Mastercard</div>
                </div>
              </label>

            </div>

            <!-- Numéro de Téléphone Mobile Money -->
            <div class="admin-input-group" style="margin-bottom: 14px;">
              <label style="font-size: 12px; color: var(--c-text-muted); margin-bottom: 4px; display: block;">
                Numéro Mobile Money (ou contact) :
              </label>
              <div style="position:relative;">
                <i class="ph-bold ph-phone" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--c-text-muted); font-size:16px;"></i>
                <input type="tel" id="checkout-phone-input" class="admin-input" placeholder="ex: +237 6XXXXXXXX ou 07XXXXXXXX" style="padding-left: 36px;" />
              </div>
            </div>

            <!-- Email du compte -->
            <div class="admin-input-group" style="margin-bottom: 20px;">
              <label style="font-size: 12px; color: var(--c-text-muted); margin-bottom: 4px; display: block;">
                Email associé à votre compte :
              </label>
              <div style="position:relative;">
                <i class="ph-bold ph-envelope" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--c-text-muted); font-size:16px;"></i>
                <input type="email" id="checkout-email-input" class="admin-input" style="padding-left: 36px;" required />
              </div>
            </div>

            <!-- Réassurance Sécurité -->
            <div style="display:flex; align-items:center; gap:8px; margin-bottom: 20px; font-size: 12px; color: var(--c-text-muted);">
              <i class="ph-bold ph-lock-key" style="color:#22E5A0; font-size:16px;"></i>
              <span>Paiement chiffré SSL 256 bits via la passerelle MakeTou.</span>
            </div>

            <!-- Bouton de confirmation -->
            <button type="submit" id="checkout-submit-btn" class="btn-neon-primary" style="width:100%; padding:13px; font-size:15px; font-weight:800; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
              <i class="ph-bold ph-lightning"></i>
              <span id="checkout-submit-text">Activer mon Forfait Immédiatement</span>
            </button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(checkoutModal);

    // Style de sélection des méthodes
    const methodLabels = checkoutModal.querySelectorAll(".checkout-method-option");
    methodLabels.forEach(label => {
      label.addEventListener("click", () => {
        methodLabels.forEach(l => {
          l.style.borderColor = "rgba(255,255,255,0.1)";
          l.style.background = "rgba(255,255,255,0.03)";
        });
        const radio = label.querySelector("input[type='radio']");
        if (radio) {
          radio.checked = true;
          if (radio.value === "orange_money") {
            label.style.borderColor = "rgba(255,102,0,0.5)";
            label.style.background = "rgba(255,102,0,0.12)";
          } else if (radio.value === "mtn_momo") {
            label.style.borderColor = "rgba(255,204,0,0.5)";
            label.style.background = "rgba(255,204,0,0.12)";
          } else if (radio.value === "wave") {
            label.style.borderColor = "rgba(27,169,225,0.5)";
            label.style.background = "rgba(27,169,225,0.12)";
          } else {
            label.style.borderColor = "rgba(124,77,255,0.5)";
            label.style.background = "rgba(124,77,255,0.12)";
          }
        }
      });
    });

    // Fermeture du modal
    const closeBtn = document.getElementById("checkout-modal-close-btn");
    closeBtn?.addEventListener("click", () => closeCheckoutModal());
    checkoutModal.addEventListener("click", (e) => {
      if (e.target === checkoutModal) closeCheckoutModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && checkoutModal.classList.contains("open")) {
        closeCheckoutModal();
      }
    });

    // Soumission du formulaire de paiement
    const form = document.getElementById("checkout-payment-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = getCurrentUser?.();
      const profile = getCurrentProfile?.();
      const kind = checkoutModal.getAttribute("data-kind") || "plan";
      const targetPlanKey = checkoutModal.getAttribute("data-target-plan") || "standard";
      const couponId = checkoutModal.getAttribute("data-coupon-id") || null;
      const plan = MAKETOU_PLANS[targetPlanKey] || MAKETOU_PLANS.standard;
      const phone = document.getElementById("checkout-phone-input")?.value?.trim() || "";

      if (!user) {
        showToast("Veuillez vous connecter pour valider l'abonnement.", "warning");
        closeCheckoutModal();
        authModal?.openModal("login");
        return;
      }

      const submitBtn = document.getElementById("checkout-submit-btn");
      const submitText = document.getElementById("checkout-submit-text");
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> Traitement du paiement...`;

      try {
        const checkoutResult = await createPaymentCheckout({
          kind,
          planKey: targetPlanKey,
          couponId,
          user,
          profile,
          phone
        });

        if (checkoutResult.mode === "live" && checkoutResult.redirectUrl) {
          window.location.href = checkoutResult.redirectUrl;
          return;
        }

        // Mode Mock / Simulation : activation instantanée en base
        await confirmAndActivatePayment({
          userId: user.id,
          kind,
          planKey: targetPlanKey,
          couponId,
          transactionRef: checkoutResult.transactionRef
        });

        closeCheckoutModal();
        triggerCelebrationConfetti();
        const successMsg = kind === "plan" 
          ? `🎉 Félicitations ! Votre forfait "${plan.name}" est maintenant actif !`
          : `🎉 Félicitations ! Coupon débloqué avec succès !`;
        showToast?.(successMsg, 6000);
        
        await onSubscriptionActivated?.();
        document.getElementById("coupons-section")?.scrollIntoView({ behavior: "smooth" });

      } catch (err) {
        console.error("Erreur lors de la souscription:", err);
        showToast?.("Erreur : " + err.message, "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = "Activer mon Forfait Immédiatement";
      }
    });
  }

  function openCheckoutModal(targetPlan = "standard", kind = "plan", couponId = null) {
    const modal = document.getElementById("fastsporty-checkout-modal");
    if (!modal) return;

    modal.setAttribute("data-kind", kind);
    modal.setAttribute("data-target-plan", targetPlan);
    if (couponId) modal.setAttribute("data-coupon-id", couponId);

    const lang = getCurrentLanguage();
    const plan = MAKETOU_PLANS[targetPlan] || MAKETOU_PLANS.standard;
    const titleEl = document.getElementById("checkout-modal-title");
    const nameEl = document.getElementById("checkout-plan-name");
    const priceEl = document.getElementById("checkout-plan-price");
    const badgeEl = document.getElementById("checkout-plan-badge");
    const descEl = document.getElementById("checkout-plan-desc");
    const emailInput = document.getElementById("checkout-email-input");

    if (kind === "plan") {
      if (titleEl) titleEl.textContent = `Souscrire à ${plan.name}`;
      if (nameEl) nameEl.textContent = plan.name;
      if (priceEl) priceEl.textContent = formatPrice(plan.priceXAF, lang, { showXafHint: true });
      if (badgeEl) badgeEl.textContent = plan.badge;
      if (descEl) descEl.textContent = (lang === "en" ? plan.featuresEn : plan.featuresFr)?.join(" • ") || "";
    } else if (kind === "unlock") {
      const unlockPrice = UNLOCK_PRICES[targetPlan] || 500;
      if (titleEl) titleEl.textContent = `Débloquer Coupon ${targetPlan}`;
      if (nameEl) nameEl.textContent = `Déblocage Coupon ${targetPlan} du Jour`;
      if (priceEl) priceEl.textContent = formatPrice(unlockPrice, lang, { showXafHint: true });
      if (badgeEl) badgeEl.textContent = "24 HEURES";
      if (descEl) descEl.textContent = "Accès complet aux sélections, analyses et cotes pour ce coupon aujourd'hui.";
    } else if (kind === "pack") {
      if (titleEl) titleEl.textContent = `Pack Montante + Premium`;
      if (nameEl) nameEl.textContent = `Pack Duo Montante & Premium`;
      if (priceEl) priceEl.textContent = formatPrice(UNLOCK_PRICES.PACK, lang, { showXafHint: true });
      if (badgeEl) badgeEl.textContent = "OFFRE PACK";
      if (descEl) descEl.textContent = "Débloquez les 2 coupons exclusifs du jour au meilleur tarif.";
    }

    const user = getCurrentUser?.();
    const profile = getCurrentProfile?.();
    if (emailInput) emailInput.value = user?.email || profile?.email || "";

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeCheckoutModal() {
    const modal = document.getElementById("fastsporty-checkout-modal");
    if (modal) {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  function handlePlanSelect(planKey) {
    const user = getCurrentUser?.();
    if (!user) {
      sessionStorage.setItem("fastsporty_pending_plan", planKey);
      showToast?.("Veuillez vous connecter pour activer votre forfait.", "info");
      authModal?.openModal("register");
      return;
    }
    openCheckoutModal(planKey, "plan");
  }

  function handleUnlockSelect(couponType, couponId) {
    const user = getCurrentUser?.();
    if (!user) {
      showToast?.("Veuillez vous connecter pour débloquer ce coupon.", "info");
      authModal?.openModal("register");
      return;
    }
    openCheckoutModal(couponType, "unlock", couponId);
  }

  return {
    openCheckoutModal,
    closeCheckoutModal,
    handlePlanSelect,
    handleUnlockSelect
  };
}

export function triggerCelebrationConfetti() {
  try {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ["#22E5A0", "#7C4DFF", "#F7C948"]
    });
    fire(0.2, {
      spread: 60,
      colors: ["#22E5A0", "#FF4B6E", "#00F0FF"]
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45
    });
  } catch (e) {}
}

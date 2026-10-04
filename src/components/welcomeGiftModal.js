import confetti from "canvas-confetti";
import { claimWelcomeGift, getAuthSession, getUserProfile } from "../services/supabase.js";
import { t } from "../services/i18n.js";

let isModalOpen = false;

export function initWelcomeGiftModal({ showToast, onGiftClaimed, openAuthModal }) {
  const modal = document.getElementById("welcome-gift-modal");
  const closeBtn = document.getElementById("gift-modal-close");
  const claimBtn = document.getElementById("gift-claim-action-btn");
  const giftTriggerBtn = document.getElementById("nav-gift-btn");

  if (!modal) return;

  const openGiftModal = async () => {
    const session = await getAuthSession();
    if (!session) {
      showToast(t("gift_modal.redirect_signup"));
      openAuthModal("register");
      return;
    }

    const profile = await getUserProfile(session.user.id);
    if (profile?.welcome_gift_claimed) {
      showToast(t("gift_modal.toast_already"));
      updateGiftIconState(true);
      return;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    isModalOpen = true;
  };
  window.openWelcomeGiftModal = openGiftModal;

  const closeGiftModal = () => {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    isModalOpen = false;
  };

  giftTriggerBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    openGiftModal();
  });

  closeBtn?.addEventListener("click", closeGiftModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeGiftModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isModalOpen) {
      closeGiftModal();
    }
  });

  claimBtn?.addEventListener("click", async () => {
    const session = await getAuthSession();
    if (!session) {
      closeGiftModal();
      showToast(t("gift_modal.redirect_signup"));
      openAuthModal("register");
      return;
    }

    claimBtn.disabled = true;
    claimBtn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> <span>${t("auth.loading")}</span>`;

    const res = await claimWelcomeGift();

    if (res?.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7C4DFF", "#22E5A0", "#FFC21A", "#FFFFFF"]
      });

      showToast(t("gift_modal.toast_success"));
      updateGiftIconState(true);
      if (onGiftClaimed) onGiftClaimed();

      setTimeout(() => {
        closeGiftModal();
      }, 900);
    } else {
      showToast(res?.message || t("gift_modal.toast_already"));
      if (res?.message?.includes("already")) {
        updateGiftIconState(true);
      }
      claimBtn.disabled = false;
      claimBtn.innerHTML = `<span>${t("gift_modal.btn_claim")}</span>`;
    }
  });

  return {
    open: openGiftModal,
    close: closeGiftModal,
    updateState: updateGiftIconState
  };
}

/**
 * Updates the navbar gift icon based on whether the gift has been claimed
 */
export function updateGiftIconState(isClaimed) {
  const giftTriggerBtn = document.getElementById("nav-gift-btn");
  const giftPulseDot = document.getElementById("nav-gift-pulse-dot");

  if (!giftTriggerBtn) return;

  if (isClaimed) {
    giftTriggerBtn.classList.add("is-claimed");
    giftTriggerBtn.setAttribute("disabled", "true");
    giftTriggerBtn.setAttribute("title", t("nav.gift_claimed"));
    if (giftPulseDot) giftPulseDot.style.display = "none";
  } else {
    giftTriggerBtn.classList.remove("is-claimed");
    giftTriggerBtn.removeAttribute("disabled");
    giftTriggerBtn.setAttribute("title", t("nav.gift_tooltip"));
    if (giftPulseDot) giftPulseDot.style.display = "block";
  }
}

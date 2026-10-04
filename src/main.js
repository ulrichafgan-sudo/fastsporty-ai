import { INITIAL_COUPONS, LIVE_HOT_MATCHES } from "./data/coupons.js";
import { initPreloader } from "./components/loader.js";
import { initHeroCarousel } from "./components/heroCarousel.js";
import { initAuthModal } from "./components/authModal.js";
import { initMatchCarousel } from "./components/carousel.js";
import { initScrollExpand } from "./components/scrollExpand.js";
import { initLiveCenter } from "./components/liveCenter.js";
import { initSidebarNav } from "./components/sidebarNav.js";
import { initMetricCounters } from "./components/metricCounters.js";
import { initSideDrawer } from "./components/sideDrawer.js";
import { initWelcomeGiftModal, updateGiftIconState } from "./components/welcomeGiftModal.js";
import {
  setLanguage,
  getCurrentLanguage,
  onLanguageChange,
  applyTranslations,
  t
} from "./services/i18n.js";
import {
  supabase,
  onAuthStateChange,
  getAuthSession,
  getUserProfile,
  authSignOut,
  unlockRookieSpecialCoupon,
  fetchCouponsFromDb,
  checkIfUserIsAdmin
} from "./services/supabase.js";
import { formatPrice } from "./services/pricing.js";
import { initAdminPortal } from "./components/adminPortal.js";
import { initPerformanceChart } from "./components/performanceChart.js";
import { initMaketouUI, triggerCelebrationConfetti } from "./components/maketouModal.js";
import { activateUserSubscriptionInDatabase } from "./services/maketouPayment.js";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/bold";
import "@phosphor-icons/web/fill";
import "@phosphor-icons/web/duotone";

// Global state
let couponsData = [...INITIAL_COUPONS];
let currentFilter = "all"; // "all" | "vip" | "free" | "won"
let isVipSimulated = false; // When true, bypasses blur so user can preview full unlock
let currentUserProfile = null; // Currently authenticated or demo user profile
let currentAuthUser = null; // Currently authenticated user

// Toast Notification system
export function showToast(message, duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <i class="ph-bold ph-lightning" style="font-size: 18px; color: #facc15;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// Render Coupons into Home Page Grid
function renderCouponsGrid() {
  const grid = document.getElementById("coupons-grid-container");
  if (!grid) return;

  const filtered = couponsData.filter((coupon) => {
    if (currentFilter === "safe") return coupon.category === "safe" || coupon.type === "SAFE";
    if (currentFilter === "fun") return coupon.category === "fun" || coupon.type === "FUN" || coupon.type === "FAN";
    if (currentFilter === "montante") return coupon.category === "montante" || coupon.type === "MONTANTE";
    if (currentFilter === "premium") return coupon.category === "premium" || coupon.type === "PREMIUM" || coupon.type === "SCORE EXACT";
    if (currentFilter === "vip") return coupon.isLocked;
    if (currentFilter === "free") return !coupon.isLocked && coupon.status !== "won";
    if (currentFilter === "won") return coupon.status === "won";
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--c-text-secondary);">
        <p style="font-size: 18px; font-weight: 700;">Aucun coupon dans cette catégorie.</p>
        <p style="font-size: 13px; margin-top: 6px;">Consultez les autres onglets pour voir nos sélections algorithmiques du jour !</p>
      </div>
    `;
    return;
  }

  const isRookieUser = currentUserProfile?.subscription_tier === "rookie";
  const isVipUser = currentUserProfile?.subscription_tier === "premium" || currentUserProfile?.subscription_tier === "vip" || currentUserProfile?.role === "admin" || currentUserProfile?.isAdmin === true || Boolean(isVipSimulated);
  const isStandardUser = currentUserProfile?.subscription_tier === "standard";
  const hasGift = Boolean(currentUserProfile?.welcome_gift_claimed);
  const hasSpecialUnlocked = Boolean(currentUserProfile?.special_coupon_unlocked);

  grid.innerHTML = filtered
    .map((coupon) => {
      let isUnlockedByRookie = false;
      let isRookieSpecialCandidate = false;

      if (isRookieUser) {
        if (coupon.type === "SAFE" || coupon.type === "FUN" || coupon.type === "FAN") {
          isUnlockedByRookie = true;
        } else if (coupon.type === "MONTANTE" || coupon.type === "PREMIUM" || coupon.type === "SCORE EXACT") {
          if (hasSpecialUnlocked) {
            isUnlockedByRookie = true;
          } else {
            isRookieSpecialCandidate = true;
          }
        }
      }

      const isUnlockedByStandard = isStandardUser && (coupon.type === "SAFE" || coupon.type === "FUN" || coupon.type === "FAN");
      const isUnlockedByGift = hasGift && (coupon.type === "SAFE" || coupon.category === "safe");
      const effectivelyLocked = coupon.isLocked && !isVipUser && !isUnlockedByRookie && !isUnlockedByStandard && !isUnlockedByGift;

      let badgeClass = coupon.status === "won" ? "badge-won" : coupon.isLocked ? "badge-vip" : "badge-free";
      let badgeLabel =
        coupon.status === "won"
          ? '<i class="ph-bold ph-trophy"></i> PRONOSTIC VALIDÉ'
          : coupon.isLocked
          ? '<i class="ph-fill ph-crown"></i> VIP EXCLUSIF'
          : '<i class="ph-bold ph-sparkle"></i> ACCÈS LIBRE';

      if (isVipUser && coupon.isLocked) {
        badgeClass = "badge-vip-unlocked";
        badgeLabel = '<i class="ph-bold ph-crown"></i> ACCÈS TOTAL ACTIF';
      } else if (isUnlockedByRookie) {
        badgeClass = "badge-rookie-safe";
        badgeLabel = `<i class="ph-bold ph-shield-check"></i> ROOKIE • ${coupon.type}`;
      } else if (isUnlockedByStandard && coupon.isLocked) {
        badgeClass = "badge-rookie-safe";
        badgeLabel = '<i class="ph-bold ph-sparkle"></i> STANDARD ACTIF';
      } else if (isUnlockedByGift && coupon.isLocked) {
        badgeClass = "badge-gift-unlocked";
        badgeLabel = '<i class="ph-bold ph-gift"></i> CADEAU ACTIF : COUPON SAFE OFFERT';
      }

      const bookingCode = coupon.bookingCode || "FS-" + Math.floor(1000 + Math.random() * 9000);
      const ref = coupon.ticketRef || "#TK-" + Math.floor(100000 + Math.random() * 900000);
      const displayTotalOdds = (parseFloat(coupon.totalOdds) || 1.00).toFixed(2);

      let contentHtml = "";
      if (effectivelyLocked) {
        let lockTitle = "Sélection Algorithmique Verrouillée";
        let lockDesc = "Abonnez-vous ou débloquez ce coupon pour accéder à l'intégralité des matchs et analyses.";
        let unlockButtonsHtml = "";

        const isMontanteOrPremium = coupon.type === "MONTANTE" || coupon.type === "PREMIUM" || coupon.type === "SCORE EXACT";
        const unlockPrice = (coupon.type === "PREMIUM" || coupon.type === "SCORE EXACT") ? 700 : 500;

        if (!currentAuthUser) {
          unlockButtonsHtml = `
            <button class="btn-neon-primary" data-action="open-auth" data-mode="login" style="width: 100%; justify-content: center;">
              <i class="ph-bold ph-key"></i>
              <span>Se connecter pour débloquer</span>
            </button>
            <a href="#pricing-section" class="btn-glass" style="width: 100%; justify-content: center; font-size: 12px;">
              <i class="ph-bold ph-crown"></i>
              <span>Découvrir nos Forfaits (dès ${formatPrice(3999)})</span>
            </a>
          `;
        } else if (isRookieSpecialCandidate) {
          lockTitle = "Bonus Forfait Rookie Disponible";
          lockDesc = "Votre abonnement Fast Rookie inclut 1 déblocage spécial : Montante ou Premium.";
          unlockButtonsHtml = `
            <button class="btn-neon-primary btn-unlock-rookie-bonus" data-unlock-bonus="${coupon.id}" style="width: 100%; justify-content: center;">
              <i class="ph-bold ph-lightning"></i>
              <span>Débloquer avec mon Bonus Rookie</span>
            </button>
          `;
        } else if (isMontanteOrPremium) {
          unlockButtonsHtml = `
            <button class="btn-neon-primary" data-action="unlock-coupon" data-coupon-id="${coupon.id}" data-coupon-type="${coupon.type}" style="width: 100%; justify-content: center;">
              <i class="ph-bold ph-key"></i>
              <span>Débloquer ce coupon (${formatPrice(unlockPrice)})</span>
            </button>
            <button class="btn-glass" data-action="unlock-pack" style="width: 100%; justify-content: center; border-color: rgba(212,160,23,0.4); color: #f7c948; font-size: 12px;">
              <i class="ph-bold ph-sparkle"></i>
              <span>Pack Journée Montante + Premium (${formatPrice(1000)})</span>
            </button>
            <a href="#pricing-section" class="btn-glass" style="width: 100%; justify-content: center; font-size: 11px;">
              <i class="ph-bold ph-crown"></i>
              <span>Passer au Forfait Premium</span>
            </a>
          `;
        } else {
          unlockButtonsHtml = `
            <a href="#pricing-section" class="btn-neon-primary" style="width: 100%; justify-content: center;">
              <i class="ph-bold ph-crown"></i>
              <span>S'abonner pour accéder (dès ${formatPrice(3999)})</span>
            </a>
            ${!hasGift ? `
              <button class="btn-glass" data-action="open-gift" style="width: 100%; justify-content: center; color: #22E5A0; border-color: rgba(34,229,160,0.4); font-size: 12px;">
                <i class="ph-bold ph-gift"></i>
                <span>Réclamer mon coupon SAFE offert</span>
              </button>
            ` : ''}
          `;
        }

        contentHtml = `
          <div class="coupon-locked-state-box" style="padding: 24px 16px; text-align: center; background: rgba(0,0,0,0.22); border-radius: 14px; margin: 12px 0 8px;">
            <div style="width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 50%; background: rgba(124,77,255,0.15); border: 1px solid rgba(124,77,255,0.35); display: flex; align-items: center; justify-content: center; font-size: 22px; color: #b18cff;">
              <i class="ph-fill ph-lock-key"></i>
            </div>
            <h4 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">${lockTitle}</h4>
            <p style="font-size: 12px; color: var(--c-text-muted); margin-bottom: 16px; line-height: 1.4;">${lockDesc}</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${unlockButtonsHtml}
            </div>
          </div>
        `;
      } else {
        contentHtml = `
          <div class="coupon-matches-list">
            ${(coupon.matches || [])
              .map((m) => {
                const matchOdd = (parseFloat(m.odds ?? m.odd ?? 1.50) || 1.50).toFixed(2);
                return `
                  <div class="match-item-row">
                    <div class="match-teams-col">
                      <div class="match-team-unit">
                        <img src="${m.homeLogo || '/logo.png'}" alt="${m.homeTeam}" class="team-mini-logo" onerror="this.src='/logo.png'" />
                        <span class="team-name-text">${m.homeTeam}</span>
                      </div>
                      <span class="match-vs-divider">vs</span>
                      <div class="match-team-unit">
                        <img src="${m.awayLogo || '/logo.png'}" alt="${m.awayTeam}" class="team-mini-logo" onerror="this.src='/logo.png'" />
                        <span class="team-name-text">${m.awayTeam}</span>
                      </div>
                    </div>
                    <div class="match-prediction-col">
                      <span class="pred-label"><i class="ph-bold ph-shield-check"></i> ${m.prediction}</span>
                      <span class="pred-odd">@${matchOdd}</span>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>

          <p class="coupon-analysis-text">
            <i class="ph-bold ph-sparkle" style="color:var(--c-violet-light);"></i>
            ${coupon.analysis || "Analyse statistique algorithmique basée sur les données d'expected goals (xG)."}
          </p>

          <div class="booking-code-bar">
            <div>
              <span class="booking-code-label">Code de référence :</span>
              <span class="booking-code-val" id="code-val-${coupon.id}">${bookingCode}</span>
            </div>
            <button class="btn-copy-code" data-copy-code="${bookingCode}" title="Copier le code de référence">
              <i class="ph-bold ph-copy"></i>
              <span>Copier</span>
            </button>
          </div>
        `;
      }

      return `
      <div class="coupon-card ${coupon.isLocked ? "is-vip" : ""} ${effectivelyLocked ? "is-locked" : ""}" data-coupon-id="${coupon.id}">
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 18px 0; font-size:11px; color:var(--c-text-muted);">
          <span>${ref}</span>
          <span style="font-weight:700; color:var(--c-violet-light);">${coupon.type || "PRONOSTIC"}</span>
        </div>

        <div class="coupon-header-banner">
          <span class="coupon-badge-tag ${badgeClass}">
            ${badgeLabel}
          </span>
          <div class="coupon-odds-badge">
            Cote ${displayTotalOdds}
          </div>
        </div>

        <div class="coupon-body">
          <h3 class="coupon-title">${coupon.title}</h3>
          <div class="coupon-meta-row">
            <span><i class="ph-bold ph-trophy"></i> ${coupon.league || "Europe"}</span>
            <span><i class="ph-bold ph-clock"></i> ${coupon.matchTime || coupon.date || "Aujourd'hui"}</span>
            <span style="color:#22E5A0;"><i class="ph-bold ph-shield-check"></i> Confiance ${coupon.confidence}%</span>
          </div>

          ${contentHtml}
        </div>
      </div>
    `;
    })
    .join("");

  // Attach copy listeners
  grid.querySelectorAll(".btn-copy-code").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.getAttribute("data-copy-code");
      navigator.clipboard?.writeText(code).then(() => {
        showToast(`Code coupon ${code} copié !`);
      });
    });
  });

  // Attach Rookie Special Bonus Unlock Listener
  grid.querySelectorAll(".btn-unlock-rookie-bonus").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unlockRookieSpecialCoupon();
      if (currentUserProfile) {
        currentUserProfile.special_coupon_unlocked = true;
      }
      showToast("🎉 Bordereau Spécial débloqué avec succès grâce à votre forfait Fast Rookie !");
      renderCouponsGrid();
    });
  });
}

// Coupons Filter Tabs
function setupFilterTabs() {
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.getAttribute("data-filter") || "all";
      renderCouponsGrid();
    });
  });

  // VIP Preview Simulation Switch
  const vipToggle = document.getElementById("vip-simulation-toggle-input");
  vipToggle?.addEventListener("change", (e) => {
    isVipSimulated = e.target.checked;
    renderCouponsGrid();
    if (isVipSimulated) {
      showToast("Mode Démo VIP activé : Tous les coupons sont révélés sans flou !");
    } else {
      showToast("Mode Visiteur standard : Le flou protecteur est actif sur les coupons VIP.");
    }
  });
}

// Setup Language Switcher (FR | EN)
function setupLanguageSwitcher() {
  const langBtn = document.getElementById("nav-lang-toggle-btn");
  const langLabel = document.getElementById("lang-current-label");

  const updateLabel = (lang) => {
    if (langLabel) {
      langLabel.textContent = lang.toUpperCase();
    }
  };

  updateLabel(getCurrentLanguage());

  langBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const nextLang = getCurrentLanguage() === "fr" ? "en" : "fr";
    setLanguage(nextLang);
    updateLabel(nextLang);
    showToast(nextLang === "fr" ? "Langue : Français 🇫🇷" : "Language: English 🇬🇧");
  });

  onLanguageChange((lang) => {
    updateLabel(lang);
  });
}

// Initialize on DOM Loaded
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Preloader with bouncing soccer ball
  initPreloader(() => {
    console.log("FASTSporty AI loaded and ready.");
  });

  // 2. Central Hero Banner Carousel
  initHeroCarousel();

  // 2b. Key Metrics Counters Animation
  initMetricCounters();

  // 3. Side Drawer (Motion Design, Dynamic Profile & Navigation)
  const sideDrawer = initSideDrawer({ showToast });

  // MakeTou UI Controller Reference
  let maketouUI = null;

  // Sync Auth State between Supabase, Navbar, Gift Modal & Side Drawer
  async function syncUserState(user, profile) {
    currentAuthUser = user;
    const isAdmin = user ? await checkIfUserIsAdmin(user.id) : false;
    currentUserProfile = profile ? { ...profile, isAdmin } : null;

    const authGroup = document.getElementById("nav-auth-group");
    const navUserLogged = document.getElementById("nav-user-logged");
    const hdrUserInitials = document.getElementById("hdr-user-initials");
    const hdrUserName = document.getElementById("hdr-user-name");
    const hdrUserPlan = document.getElementById("hdr-user-plan");
    const hdrUserLogout = document.getElementById("hdr-user-logout-btn");
    const hdrUserChipBtn = document.getElementById("hdr-user-chip-btn");

    const statusDot = document.getElementById("header-user-status-dot");
    const sideProfName = document.getElementById("sidebar-profile-name");
    const sideProfPlan = document.getElementById("sidebar-profile-plan");
    const sideAvatarInitials = document.getElementById("sidebar-avatar-initials");
    const sideStatusOnline = document.getElementById("sidebar-status-online");

    if (user) {
      const displayName = profile?.username || user.user_metadata?.username || user.email?.split("@")[0] || "Membre";
      const publicId = profile?.public_id || ("FS-" + user.id.slice(0, 6).toUpperCase());
      const initials = (displayName.length >= 2 ? displayName.slice(0, 2) : displayName.slice(0, 1) + "S").toUpperCase();
      
      const tier = profile?.subscription_tier || "free";
      const isRookie = tier === "rookie";
      const isStandard = tier === "standard";
      const isPremium = tier === "premium" || tier === "vip";
      const hasActivePlan = isRookie || isStandard || isPremium;
      
      const planName = profile?.subscription_name || (
        isAdmin ? "Super Administrateur" :
        isRookie ? "Fast Rookie (14 Jours)" :
        isStandard ? "Fast Standard (30 Jours)" :
        isPremium ? "Fast Premium (Accès Total)" : "Compte Gratuit"
      );
      const daysLeft = profile?.subscription_days_remaining || (isRookie ? 14 : isStandard ? 30 : 0);

      // Top Navbar User State
      if (authGroup) authGroup.style.display = "none";
      if (navUserLogged) navUserLogged.style.display = "inline-flex";
      if (hdrUserInitials) hdrUserInitials.textContent = initials;
      if (hdrUserName) hdrUserName.textContent = displayName;
      if (hdrUserPlan) hdrUserPlan.textContent = (hasActivePlan || isAdmin) ? planName : "Gratuit";
      if (statusDot) statusDot.style.background = "#22E5A0";

      // Left Sidebar User Card
      if (sideProfName) sideProfName.textContent = displayName;
      if (sideProfPlan) sideProfPlan.textContent = planName;
      if (sideAvatarInitials) sideAvatarInitials.textContent = initials;
      if (sideStatusOnline) sideStatusOnline.style.background = "#22E5A0";

      // Side Drawer User State
      if (sideDrawer) {
        sideDrawer.updateUser({
          isLoggedIn: true,
          name: displayName,
          id: publicId,
          avatarUrl: profile?.avatar_url || "",
          initials,
          isVip: hasActivePlan || isAdmin,
          isAdmin: isAdmin,
          vipStatus: planName,
          vipExpiryDays: daysLeft
        });
      }

      // Update gift state
      updateGiftIconState(Boolean(profile?.welcome_gift_claimed));

      // Sync language preference if set
      if (profile?.language && profile.language !== getCurrentLanguage()) {
        setLanguage(profile.language);
      }

      // Activation différée si l'utilisateur s'est connecté après un retour MakeTou
      const pendingAct = sessionStorage.getItem("fastsporty_pending_activation");
      if (pendingAct) {
        sessionStorage.removeItem("fastsporty_pending_activation");
        try {
          const { planKey, cartId, kind, couponId } = JSON.parse(pendingAct);
          activateUserSubscriptionInDatabase({
            userId: user.id,
            planKey,
            kind,
            couponId,
            transactionRef: cartId
          }).then(async () => {
            const updated = await getUserProfile(user.id);
            syncUserState(user, updated);
            triggerCelebrationConfetti();
            showToast(`🎉 Abonnement ${planKey.toUpperCase()} activé avec succès !`, 5000);
          });
        } catch (e) {}
      }

      // Checkout différé si l'utilisateur a cliqué sur une formule avant de se connecter
      const pendingPlan = sessionStorage.getItem("fastsporty_pending_plan");
      if (pendingPlan) {
        sessionStorage.removeItem("fastsporty_pending_plan");
        setTimeout(() => {
          maketouUI?.handlePlanSelect(pendingPlan);
        }, 600);
      }
    } else {
      // Top Navbar Logged Out State
      if (authGroup) authGroup.style.display = "inline-flex";
      if (navUserLogged) navUserLogged.style.display = "none";
      if (statusDot) statusDot.style.background = "rgba(255,255,255,0.4)";

      // Left Sidebar Logged Out State
      if (sideProfName) sideProfName.textContent = "Non connecté";
      if (sideProfPlan) sideProfPlan.textContent = "Connexion / Inscription";
      if (sideAvatarInitials) sideAvatarInitials.innerHTML = '<i class="ph-bold ph-user"></i>';
      if (sideStatusOnline) sideStatusOnline.style.background = "rgba(255,255,255,0.3)";

      // Side Drawer Logged Out State
      if (sideDrawer) {
        sideDrawer.updateUser({
          isLoggedIn: false,
          name: "Invité",
          id: "FS-000000",
          avatarUrl: "",
          initials: "FS",
          isVip: false,
          isAdmin: false
        });
      }

      updateGiftIconState(false);
    }

    // Re-render coupons to reflect unlocked states
    renderCouponsGrid();
  }

  // 4. Auth Modal
  const authModal = initAuthModal(showToast, async () => {
    // When authentication succeeds, update auth state
    const session = await getAuthSession();
    if (session?.user) {
      const profile = await getUserProfile(session.user.id);
      syncUserState(session.user, profile);
    }
  });

  // 5. Welcome Gift Modal
  const giftModal = initWelcomeGiftModal({
    showToast,
    onGiftClaimed: () => {
      updateGiftIconState(true);
      if (currentUserProfile) {
        currentUserProfile.welcome_gift_claimed = true;
      }
      renderCouponsGrid();
    },
    openAuthModal: (mode) => authModal.openModal(mode)
  });

  // 6. Live Matches Carousel
  initMatchCarousel(LIVE_HOT_MATCHES);

  // 7. Scroll Expand Section
  initScrollExpand();

  // 8. Analyses Prédictives IA & Live Center (avec Avis Communauté & Supabase)
  initLiveCenter({
    showToast,
    openAuthModal: (mode) => authModal.openModal(mode)
  });

  // 10. Courbe de Croissance du Capital & Graphique de Performance Chart.js
  initPerformanceChart();

  // 11. Coupons Render & Filter
  renderCouponsGrid();
  setupFilterTabs();

  // 11b. Initialisation Espace Administration & Synchronisation Supabase
  initAdminPortal(couponsData, () => renderCouponsGrid(), showToast);

  // Synchronisation initiale des coupons depuis la base Supabase
  fetchCouponsFromDb().then((dbCoupons) => {
    if (dbCoupons && dbCoupons.length > 0) {
      couponsData.length = 0;
      couponsData.push(...dbCoupons);
      renderCouponsGrid();
    }
  });

  // 12. Sidebar / Slide Bar Navigation (ScrollSpy, Search, Filters)
  initSidebarNav(showToast);

  // 13. Language Switcher (Instant without reload)
  setupLanguageSwitcher();
  applyTranslations();


  // Wire Header User Chip & Logout Buttons
  document.getElementById("hdr-user-chip-btn")?.addEventListener("click", () => {
    sideDrawer.open();
  });

  document.getElementById("hdr-user-logout-btn")?.addEventListener("click", async () => {
    await authSignOut();
    syncUserState(null, null);
    showToast("Vous avez été déconnecté avec succès.");
  });

  // Wire Sidebar Profile Card Button
  const sidebarProfileBtn = document.getElementById("sidebar-profile-card-btn");
  sidebarProfileBtn?.addEventListener("click", () => {
    if (currentUserProfile) {
      sideDrawer.open();
    } else {
      authModal.openModal("login");
    }
  });

  // Check initial session from Supabase
  try {
    const initialSession = await getAuthSession();
    if (initialSession?.user) {
      const profile = await getUserProfile(initialSession.user.id);
      await syncUserState(initialSession.user, profile);
    } else {
      await syncUserState(null, null);
    }
  } catch (err) {
    console.warn("Session check error:", err);
    await syncUserState(null, null);
  }

  // Subscribe to real auth state changes from Supabase
  onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getUserProfile(session.user.id);
      await syncUserState(session.user, profile);
    } else {
      await syncUserState(null, null);
    }
  });

  // Re-attach data-action="open-auth" buttons
  document.querySelectorAll("[data-action='open-auth']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const mode = btn.getAttribute("data-mode") || "login";
      authModal.openModal(mode);
    });
  });

  // 15. Initialisation MakeTou UI & Gestion des Abonnements
  maketouUI = initMaketouUI({
    getCurrentUser: () => currentAuthUser,
    getCurrentProfile: () => currentUserProfile,
    authModal,
    showToast,
    onSubscriptionActivated: async () => {
      if (currentAuthUser?.id) {
        const profile = await getUserProfile(currentAuthUser.id);
        await syncUserState(currentAuthUser, profile);
      }
    }
  });
  window.openMaketouSetupModal = maketouUI.openMaketouSetupModal;
  window.openCheckoutModal = (planKey, kind, couponId) => maketouUI.openCheckoutModal(planKey, kind, couponId);

  // Délégation globale des clics pour souscriptions, déblocages unitaires, packs et cadeaux
  document.addEventListener("click", (e) => {
    // 1. Bouton de souscription à un forfait (cartes de tarifs ou sidebar)
    const planBtn = e.target.closest("[data-action='subscribe-plan']");
    if (planBtn) {
      e.preventDefault();
      const planKey = planBtn.getAttribute("data-plan") || "standard";
      maketouUI?.handlePlanSelect(planKey);
      return;
    }

    // 2. Déblocage unitaire d'un coupon
    const unlockBtn = e.target.closest("[data-action='unlock-coupon']");
    if (unlockBtn) {
      e.preventDefault();
      const couponId = unlockBtn.getAttribute("data-coupon-id");
      const couponType = unlockBtn.getAttribute("data-coupon-type") || "MONTANTE";
      maketouUI?.handleUnlockSelect(couponType, couponId);
      return;
    }

    // 3. Déblocage du pack journée (Montante + Premium)
    const packBtn = e.target.closest("[data-action='unlock-pack']");
    if (packBtn) {
      e.preventDefault();
      if (!currentAuthUser) {
        showToast("Veuillez vous connecter pour débloquer le pack journée.", "info");
        authModal.openModal("register");
        return;
      }
      maketouUI?.openCheckoutModal("PACK", "pack");
      return;
    }

    // 4. Cadeau de bienvenue
    const giftBtn = e.target.closest("[data-action='open-gift']");
    if (giftBtn) {
      e.preventDefault();
      if (window.openWelcomeGiftModal) {
        window.openWelcomeGiftModal();
      }
      return;
    }
  });

  // Clics sur les raccourcis d'abonnement dans la sidebar
  document.querySelectorAll(".sidebar-plan-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const plan = card.classList.contains("rookie-shortcut") ? "rookie" :
                   card.classList.contains("standard-shortcut") ? "standard" : "premium";
      maketouUI.handlePlanSelect(plan);
    });
  });

  // Bouton CTA VIP Promo dans la sidebar
  document.querySelector(".promo-gold-cta-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    maketouUI.handlePlanSelect("premium");
  });

  // Détection et traitement automatique du retour de paiement MakeTou (Audit spec Section 4.3 & 6.1)
  const urlParams = new URLSearchParams(window.location.search);
  const pathMatch = window.location.pathname.match(/\/(pay\/return|abonnement\/retour)\/([^/?#]+)/i);
  const pathTxRef = pathMatch ? pathMatch[2] : null;
  const isMaketouReturn = Boolean(
    pathTxRef ||
    urlParams.get("payment_provider") === "maketou" ||
    urlParams.has("cartId") ||
    urlParams.get("status") === "completed"
  );

  if (isMaketouReturn) {
    let planKey = urlParams.get("plan") || "standard";
    let cartId = urlParams.get("cartId") || pathTxRef;
    let kind = "plan";
    let couponId = null;

    // Nettoyer l'URL du navigateur sans recharger
    window.history.replaceState({}, document.title, "/");

    getAuthSession().then(async (session) => {
      // Si une référence de transaction existe, vérifier la transaction en base
      if (pathTxRef) {
        try {
          const { data: pRow } = await supabase
            .from("payments")
            .select("*")
            .or(`provider_reference.eq.${pathTxRef},id.eq.${pathTxRef}`)
            .maybeSingle();
          if (pRow) {
            kind = pRow.kind || "plan";
            planKey = pRow.plan_id || "standard";
            couponId = pRow.coupon_id;
          }
        } catch (e) {
          console.warn("Vérification transaction:", e);
        }
      }

      if (session?.user) {
        showToast("Paiement MakeTou confirmé ! Activation en cours...", 4000);
        try {
          await activateUserSubscriptionInDatabase({
            userId: session.user.id,
            kind,
            planKey,
            couponId,
            transactionRef: pathTxRef || cartId
          });
          const profile = await getUserProfile(session.user.id);
          syncUserState(session.user, profile);
          triggerCelebrationConfetti();
          const confirmMsg = kind === "plan"
            ? `🎉 Félicitations ! Votre abonnement "${planKey.toUpperCase()}" est maintenant actif !`
            : `🎉 Félicitations ! Votre coupon est débloqué avec succès !`;
          showToast(confirmMsg, 6000);
        } catch (e) {
          console.error("Erreur activation retour paiement:", e);
          showToast("Erreur d'activation : " + e.message, 5000);
        }
      } else {
        sessionStorage.setItem("fastsporty_pending_activation", JSON.stringify({ kind, planKey, couponId, cartId: pathTxRef || cartId }));
        showToast("Paiement MakeTou validé ! Veuillez vous connecter pour finaliser l'activation.", 6000);
        authModal.openModal("login");
      }
    });
  }

  // Header scroll shadow
  window.addEventListener(
    "scroll",
    () => {
      const header = document.querySelector(".site-header");
      if (window.scrollY > 20) {
        header?.classList.add("scrolled");
      } else {
        header?.classList.remove("scrolled");
      }
    },
    { passive: true }
  );
});

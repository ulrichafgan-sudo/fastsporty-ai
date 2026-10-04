/**
 * ==============================================================================
 * FASTSporty AI - SideDrawer (Menu Latéral Mobile & Motion Design)
 * ==============================================================================
 * Connecté à Supabase & Système i18n
 */

import { t } from "../services/i18n.js";
import { authSignOut } from "../services/supabase.js";

// Configuration par défaut de l'utilisateur
export const DRAWER_USER_CONFIG = {
  isLoggedIn: false,
  name: "Invité",
  id: "FS-000000",
  avatarUrl: "",
  initials: "FS",
  isVip: false,
  vipStatus: "",
  vipExpiryDays: 0,
  notificationsCount: 0,
  appVersion: "v2.5.0 • FASTSporty AI"
};

// Configuration des liens du menu latéral
// Configuration des liens du menu latéral
export function getDrawerMenuSections(user = {}) {
  const sections = [
    {
      id: "analysis-coupons-section",
      title: "ESPACE ANALYSE & COUPONS IA",
      items: [
        { id: "nav-home", i18nKey: "drawer.nav_home", label: "Accueil", icon: "ph-house", route: "#accueil", active: true },
        { id: "nav-analysis", label: "Analyses Prédictives IA", icon: "ph-brain", route: "#live-matches-section", badge: "LIVE", badgeType: "vip" },
        { id: "nav-coupons", i18nKey: "drawer.nav_coupons", label: "Coupons VIP & IA", icon: "ph-ticket", route: "#coupons-section" },
        { id: "nav-results", i18nKey: "drawer.nav_results", label: "Bilan Certifié (+28.7%)", icon: "ph-chart-bar", route: "#transparency-section" },
        { id: "nav-h2h", label: "Choc H2H Européen", icon: "ph-target", route: "#match-analysis-section" },
        { id: "nav-subs", i18nKey: "drawer.nav_subs", label: "Forfaits & Abonnements", icon: "ph-crown", route: "#pricing-section", badge: "VIP", badgeType: "vip" }
      ]
    },
    {
      id: "account-section",
      title: t("drawer.sec_account", "MON PROFIL & AVANTAGES"),
      items: [
        { id: "acc-profile", i18nKey: "drawer.acc_profile", label: "Mon profil & Forfait Rookie 14j", icon: "ph-user", route: "#pricing-section", action: "open-profile" },
        { id: "acc-gift", label: "Cadeau de bienvenue (1 coupon gratuit/j)", icon: "ph-gift", route: "#welcome-gift-modal", action: "open-gift" },
        { id: "acc-billing", i18nKey: "drawer.acc_billing", label: "Gestion de l'abonnement", icon: "ph-credit-card", route: "#pricing-section" },
        { id: "acc-referral", i18nKey: "drawer.acc_referral", label: "Parrainage", icon: "ph-users-three", route: "#pricing-section", action: "open-referral" }
      ]
    },
    {
      id: "admin-section",
      title: "ESPACE ADMINISTRATEUR",
      items: [
        { id: "nav-admin", label: "Panneau d'Administration (Supabase)", icon: "ph-crown", route: "#admin", badge: "ADMIN", badgeType: "vip", action: "open-admin" }
      ]
    },
    {
      id: "help-section",
      title: t("drawer.sec_help", "AIDE & SUPPORT"),
      items: [
        { id: "help-support", i18nKey: "drawer.help_support", label: "Support client 24/7", icon: "ph-headset", route: "#reviews-section", action: "open-support" },
        { id: "help-guide", i18nKey: "drawer.help_guide", label: "Comment ça marche", icon: "ph-info", route: "#faq-section" },
        { id: "help-responsible", i18nKey: "drawer.help_responsible", label: "Jeu responsable (18+)", icon: "ph-shield-warning", route: "#responsible-gaming", action: "open-responsible" }
      ]
    }
  ];

  if (!user?.isAdmin) {
    return sections.filter((s) => s.id !== "admin-section");
  }
  return sections;
}

/**
 * Initialisation du SideDrawer
 */
export function initSideDrawer(options = {}) {
  const showToast = options.showToast || ((msg) => console.log(msg));
  const openAuthModal = options.openAuthModal || (() => {});
  const user = { ...DRAWER_USER_CONFIG, ...(options.userConfig || {}) };

  let backdrop = document.getElementById("side-drawer-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "side-drawer-backdrop";
    backdrop.className = "side-drawer-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.appendChild(backdrop);
  }

  let drawer = document.getElementById("app-side-drawer");
  if (!drawer) {
    drawer = document.createElement("aside");
    drawer.id = "app-side-drawer";
    drawer.className = "side-drawer";
    drawer.setAttribute("aria-label", "Menu latéral FASTSporty AI");
    drawer.setAttribute("aria-hidden", "true");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    document.body.appendChild(drawer);
  }

  const toggleBtn = document.getElementById("sidebar-toggle-btn");
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-controls", "app-side-drawer");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", t("nav.profile", "Espace Personnel"));
  }

  renderDrawerContent(drawer, user);

  let isOpen = false;

  const openDrawer = () => {
    if (isOpen) return;
    isOpen = true;

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");

    backdrop.classList.add("is-active");
    backdrop.setAttribute("aria-hidden", "false");

    if (toggleBtn) {
      toggleBtn.classList.add("is-active");
      toggleBtn.setAttribute("aria-expanded", "true");
    }

    document.body.classList.add("drawer-scroll-locked");
    document.body.style.overflow = "hidden";

    const closeBtn = drawer.querySelector(".side-drawer-close-btn");
    setTimeout(() => {
      if (closeBtn) closeBtn.focus();
    }, 100);
  };

  const closeDrawer = () => {
    if (!isOpen) return;
    isOpen = false;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");

    backdrop.classList.remove("is-active");
    backdrop.setAttribute("aria-hidden", "true");

    if (toggleBtn) {
      toggleBtn.classList.remove("is-active");
      toggleBtn.setAttribute("aria-expanded", "false");
    }

    document.body.classList.remove("drawer-scroll-locked");
    document.body.style.overflow = "";

    if (toggleBtn) toggleBtn.focus();
  };

  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    isOpen ? closeDrawer() : openDrawer();
  });

  backdrop.addEventListener("click", () => {
    closeDrawer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeDrawer();
    }
  });

  drawer.addEventListener("keydown", (e) => {
    if (!isOpen || e.key !== "Tab") return;

    const focusableElements = drawer.querySelectorAll(
      'button:not([disabled]), a[href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });

  // Gestuelle tactile : Swipe vers la GAUCHE pour fermer
  let touchStartX = 0;
  let touchStartY = 0;

  drawer.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  drawer.addEventListener("touchend", (e) => {
    if (!isOpen) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = Math.abs(touchStartY - touchEndY);

    if (diffX > 50 && diffY < 80) {
      closeDrawer();
    }
  }, { passive: true });

  attachDrawerEvents(drawer, user, showToast, closeDrawer, openAuthModal);

  return {
    open: openDrawer,
    close: closeDrawer,
    toggle: () => (isOpen ? closeDrawer() : openDrawer()),
    updateUser: (newUserConfig) => {
      Object.assign(user, newUserConfig);
      renderDrawerContent(drawer, user);
      attachDrawerEvents(drawer, user, showToast, closeDrawer, openAuthModal);
    }
  };
}

/**
 * Génère le balisage HTML dynamique du tiroir
 */
function renderDrawerContent(drawer, user) {
  let cascadeCounter = 0;
  const sections = getDrawerMenuSections(user);

  // 1. En-tête Profil (connecté vs déconnecté)
  let profileSectionHtml = "";
  cascadeCounter++;
  
  if (user.isLoggedIn) {
    const avatarInner = user.avatarUrl
      ? `<img src="${user.avatarUrl}" alt="${user.name}" class="drawer-avatar-img" />`
      : `<span class="drawer-avatar-initials">${user.initials || user.name.slice(0, 2).toUpperCase()}</span>`;

    const subBadgeHtml = user.isVip
      ? `
        <div class="drawer-sub-badge drawer-sub-badge--vip">
          <span class="badge-tag"><i class="ph-fill ph-crown"></i> ${user.vipStatus || "VIP Pass"}</span>
          ${user.vipExpiryDays ? `<span class="badge-expiry">Expire dans ${user.vipExpiryDays} jours</span>` : ""}
        </div>
      `
      : `
        <div class="drawer-sub-badge drawer-sub-badge--none">
          <span class="badge-tag">Compte Membre</span>
          <a href="#pricing-section" class="drawer-btn-upgrade-vip">Passer VIP</a>
        </div>
      `;

    profileSectionHtml = `
      <div class="drawer-profile-card drawer-cascade-item" style="--stagger-idx: ${cascadeCounter}">
        <div class="drawer-avatar-container">
          <div class="drawer-avatar-ring">
            ${avatarInner}
          </div>
        </div>
        <div class="drawer-user-details">
          <div class="drawer-user-name">${user.name}</div>
          <div class="drawer-user-id-row">
            <span class="drawer-user-id-label">${t("drawer.id_label", "ID :")} ${user.id}</span>
            <button class="drawer-copy-btn" id="drawer-copy-id-btn" title="${t("drawer.copy_id", "Copier l'identifiant")}" aria-label="Copier ID">
              <i class="ph-bold ph-copy"></i>
            </button>
          </div>
          ${subBadgeHtml}
        </div>
      </div>
    `;
  } else {
    // Si invité non connecté : Boutons Connexion / Inscription en haut
    profileSectionHtml = `
      <div class="drawer-profile-card drawer-guest-card drawer-cascade-item" style="--stagger-idx: ${cascadeCounter}">
        <div class="drawer-guest-banner">
          <div class="drawer-guest-icon"><i class="ph-duotone ph-user-circle"></i></div>
          <div class="drawer-guest-text">
            <strong>${t("drawer.welcome", "Bienvenue sur FASTSporty")}</strong>
            <span>${t("drawer.welcome_sub", "Connectez-vous pour voir vos coupons")}</span>
          </div>
        </div>
        <div class="drawer-guest-actions">
          <button class="drawer-btn-guest-login" id="drawer-btn-guest-login" type="button">${t("drawer.login", "Connexion")}</button>
          <button class="drawer-btn-guest-register" id="drawer-btn-guest-register" type="button">${t("drawer.signup", "S'inscrire")}</button>
        </div>
      </div>
    `;
  }

  // 2. Sections de liens
  let sectionsHtml = "";
  sections.forEach((sec) => {
    let itemsHtml = "";
    sec.items.forEach((item) => {
      cascadeCounter++;
      const activeClass = item.active ? "is-active" : "";
      const itemLabel = item.i18nKey ? t(item.i18nKey, item.label) : item.label;
      
      let badgeHtml = "";
      if (item.badge === "VIP") {
        badgeHtml = `<span class="drawer-item-badge drawer-item-badge--vip">VIP</span>`;
      } else if (item.badge === "count" && user.notificationsCount > 0) {
        badgeHtml = `<span class="drawer-item-badge drawer-item-badge--notif">${user.notificationsCount}</span>`;
      }

      itemsHtml += `
        <li class="drawer-cascade-item" style="--stagger-idx: ${cascadeCounter}">
          <a href="${item.route}" 
             class="drawer-nav-item ${activeClass}" 
             data-id="${item.id}"
             data-action="${item.action || ''}">
            <span class="drawer-item-icon"><i class="ph ${item.icon}"></i></span>
            <span class="drawer-item-label">${itemLabel}</span>
            ${badgeHtml}
          </a>
        </li>
      `;
    });

    const titleHtml = sec.title
      ? `<div class="drawer-section-title drawer-cascade-item" style="--stagger-idx: ${cascadeCounter}">${sec.title}</div>`
      : "";

    sectionsHtml += `
      <div class="drawer-section-group">
        ${titleHtml}
        <ul class="drawer-nav-list">
          ${itemsHtml}
        </ul>
      </div>
    `;
  });

  // 3. Bas de tiroir (Déconnexion si connecté)
  cascadeCounter++;
  const logoutHtml = user.isLoggedIn
    ? `
      <div class="drawer-footer-zone drawer-cascade-item" style="--stagger-idx: ${cascadeCounter}">
        <button class="drawer-logout-btn" id="drawer-logout-btn" type="button">
          <i class="ph-bold ph-sign-out"></i>
          <span>${t("drawer.logout", "Se déconnecter")}</span>
        </button>
        <div class="drawer-app-version">${user.appVersion || "v2.5.0 • FASTSporty AI"}</div>
      </div>
    `
    : `
      <div class="drawer-footer-zone drawer-cascade-item" style="--stagger-idx: ${cascadeCounter}">
        <div class="drawer-app-version">${user.appVersion || "v2.5.0 • FASTSporty AI"}</div>
      </div>
    `;

  drawer.innerHTML = `
    <div class="side-drawer-glows" aria-hidden="true">
      <div class="side-drawer-glow-1"></div>
      <div class="side-drawer-glow-2"></div>
    </div>

    <div class="side-drawer-topbar">
      <div class="side-drawer-brand">
        <img src="/logo.png?v=3" alt="FAST Sporty" class="side-drawer-logo-img" />
      </div>
      <button class="side-drawer-close-btn" aria-label="Fermer le menu latéral" title="Fermer (Échap)">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>

    <div class="side-drawer-scroll-body">
      ${profileSectionHtml}
      ${sectionsHtml}
      ${logoutHtml}
    </div>
  `;
}

/**
 * Attache les événements d'interaction du tiroir
 */
function attachDrawerEvents(drawer, user, showToast, closeDrawer, openAuthModal) {
  const closeBtn = drawer.querySelector(".side-drawer-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closeDrawer();
    });
  }

  const copyBtn = drawer.querySelector("#drawer-copy-id-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(user.id);
        showToast(t("drawer.copied", "Identifiant copié !"));
      } catch (err) {
        showToast(`${t("drawer.id_label", "ID :")} ${user.id}`);
      }
    });
  }

  // Déconnexion
  const logoutBtn = drawer.querySelector("#drawer-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      await authSignOut();
      closeDrawer();
      showToast("Vous avez été déconnecté.");
    });
  }

  // Connexion / Inscription depuis le tiroir
  const guestLoginBtn = drawer.querySelector("#drawer-btn-guest-login");
  const guestRegisterBtn = drawer.querySelector("#drawer-btn-guest-register");

  guestLoginBtn?.addEventListener("click", () => {
    closeDrawer();
    openAuthModal("login");
  });

  guestRegisterBtn?.addEventListener("click", () => {
    closeDrawer();
    openAuthModal("register");
  });

  // Liens de navigation internes
  const navLinks = drawer.querySelectorAll(".drawer-nav-item");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const action = link.getAttribute("data-action");
      if (action === "open-admin") {
        e.preventDefault();
        closeDrawer();
        if (window.openAdminPortal) {
          window.openAdminPortal();
        }
        return;
      }
      if (action === "open-gift") {
        e.preventDefault();
        closeDrawer();
        document.getElementById("nav-gift-btn")?.click();
        return;
      }

      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          closeDrawer();
          setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 200);
        }
      }
    });
  });
}

// Sidebar (Slide Bar) & Modern Header Navigation Controller
export function initSidebarNav(showToast) {
  const sidebar = document.getElementById("app-sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle-btn");
  const collapseBtn = document.getElementById("sidebar-collapse-btn");
  const backdrop = document.getElementById("app-sidebar-backdrop");
  const searchInput = document.getElementById("header-quick-search");

  if (!sidebar) return;

  // Toggle Functionality (Adaptive Mobile Drawer / Desktop Collapse)
  const toggleSidebar = () => {
    const isMobile = window.innerWidth <= 992;
    if (isMobile) {
      const isOpen = sidebar.classList.toggle("sidebar-open");
      backdrop?.classList.toggle("active", isOpen);
      document.body.style.overflow = isOpen ? "hidden" : "";
    } else {
      sidebar.classList.toggle("sidebar-collapsed");
    }
  };

  const closeMobileSidebar = () => {
    sidebar.classList.remove("sidebar-open");
    backdrop?.classList.remove("active");
    document.body.style.overflow = "";
  };

  // Le bouton toggle (hamburger) pilote désormais exclusivement le SideDrawer (Menu Latéral Mobile)


  collapseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("sidebar-collapsed");
  });

  backdrop?.addEventListener("click", closeMobileSidebar);

  // Close sidebar on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileSidebar();
      if (searchInput && document.activeElement === searchInput) {
        searchInput.value = "";
        searchInput.blur();
        resetSearchFilters();
      }
    }
  });

  // Handle Nav Anchor Clicks & Scroll
  const navEntries = document.querySelectorAll(".sidebar-nav-entry");
  navEntries.forEach((entry) => {
    const anchor = entry.querySelector(".sidebar-nav-anchor");
    if (!anchor) return;

    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (href && href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          navEntries.forEach((n) => n.classList.remove("active"));
          entry.classList.add("active");

          target.scrollIntoView({ behavior: "smooth", block: "start" });
          closeMobileSidebar();
        }
      }
    });
  });

  // ScrollSpy to automatically highlight active nav link on scroll
  const sections = [
    { id: "accueil", nav: "accueil" },
    { id: "live-matches-section", nav: "live-matches" },
    { id: "coupons-section", nav: "coupons" },
    { id: "transparency-section", nav: "transparency" },
    { id: "match-analysis-section", nav: "h2h" },
    { id: "pricing-section", nav: "pricing" },
    { id: "live-tracking-section", nav: "live-tracking" },
    { id: "faq-section", nav: "faq" },
  ];

  window.addEventListener(
    "scroll",
    () => {
      const scrollPos = window.scrollY + 120;
      let currentSectionNav = null;

      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            currentSectionNav = sec.nav;
          }
        }
      }

      if (currentSectionNav) {
        navEntries.forEach((entry) => {
          if (entry.getAttribute("data-nav") === currentSectionNav) {
            entry.classList.add("active");
          } else {
            entry.classList.remove("active");
          }
        });
      }
    },
    { passive: true }
  );

  // Sidebar Coupon Categories Click Filter
  const couponCategoryItems = document.querySelectorAll(".coupon-category-row-item");
  couponCategoryItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const filter = item.getAttribute("data-category-filter") || "all";
      const filterLabels = {
        safe: "Coupons SAFE 90%+",
        fan: "Coupons FAN Grosses Cotes",
        montante: "Coupons Montante IA",
        all: "Tous les Coupons & Scores Exacts"
      };

      // Trigger the filter tab in the coupons section
      const targetPill = document.querySelector(`.coupons-filter-bar .filter-pill[data-filter="${filter}"]`);
      if (targetPill) {
        targetPill.click();
      }

      showToast(`Catégorie sélectionnée : ${filterLabels[filter] || filter}`);

      const couponsSection = document.getElementById("coupons-section");
      if (couponsSection) {
        couponsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      closeMobileSidebar();
    });
  });

  // Sidebar Subscription Plans Shortcuts
  const planShortcuts = document.querySelectorAll(".sidebar-plan-card");
  planShortcuts.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const pricingSection = document.getElementById("pricing-section");
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      closeMobileSidebar();
    });
  });

  // Quick Search Bar in Header
  function filterMatchesByText(text) {
    const q = text.toLowerCase().trim();
    if (!q) {
      resetSearchFilters();
      return;
    }

    // Filter cards in Live center
    const liveCards = document.querySelectorAll("#live-matches-cards-grid .live-match-card");
    let matchCount = 0;
    liveCards.forEach((card) => {
      const cardText = card.textContent.toLowerCase();
      if (cardText.includes(q)) {
        card.style.display = "";
        card.style.boxShadow = "0 0 20px rgba(124, 77, 255, 0.4)";
        matchCount++;
      } else {
        card.style.display = "none";
      }
    });

    // Filter coupons in Coupons grid
    const couponCards = document.querySelectorAll("#coupons-grid-container .coupon-card");
    couponCards.forEach((card) => {
      const cardText = card.textContent.toLowerCase();
      if (cardText.includes(q)) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });

    return matchCount;
  }

  function resetSearchFilters() {
    const liveCards = document.querySelectorAll("#live-matches-cards-grid .live-match-card");
    liveCards.forEach((card) => {
      card.style.display = "";
      card.style.boxShadow = "";
    });

    const couponCards = document.querySelectorAll("#coupons-grid-container .coupon-card");
    couponCards.forEach((card) => {
      card.style.display = "";
    });
  }

  let searchDebounce = null;
  searchInput?.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    const val = e.target.value;
    searchDebounce = setTimeout(() => {
      if (val.length >= 2) {
        filterMatchesByText(val);
      } else if (val.length === 0) {
        resetSearchFilters();
      }
    }, 200);
  });

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const target = document.getElementById("live-matches-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast(`Recherche pour : "${searchInput.value}"`);
      }
    }
  });
}

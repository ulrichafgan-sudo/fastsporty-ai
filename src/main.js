import { INITIAL_COUPONS, LIVE_HOT_MATCHES } from "./data/coupons.js";
import { initPreloader } from "./components/loader.js";
import { initHeroCarousel } from "./components/heroCarousel.js";
import { initAuthModal } from "./components/authModal.js";
import { initMatchCarousel } from "./components/carousel.js";
import { initScrollExpand } from "./components/scrollExpand.js";
import { initAdminPortal } from "./components/adminPortal.js";
import { initLiveCenter } from "./components/liveCenter.js";
import { initBetSlipWidget } from "./components/betSlipWidget.js";
import confetti from "canvas-confetti";

// Global state
let couponsData = [...INITIAL_COUPONS];
let currentFilter = "all"; // "all" | "vip" | "free" | "won"
let isVipSimulated = false; // When true, bypasses blur so user can preview full unlock

// Toast Notification system
export function showToast(message, duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span style="font-size: 18px;">⚡</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// Render Coupons into Home Page Grid (Authentic Bookmaker Betslip Style)
function renderCouponsGrid() {
  const grid = document.getElementById("coupons-grid-container");
  if (!grid) return;

  const filtered = couponsData.filter(coupon => {
    if (currentFilter === "vip") return coupon.isLocked;
    if (currentFilter === "free") return !coupon.isLocked && coupon.status !== "won";
    if (currentFilter === "won") return coupon.status === "won";
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--c-text-secondary);">
        <p style="font-size: 18px; font-weight: 700;">Aucun bordereau dans cette catégorie.</p>
        <p style="font-size: 13px; margin-top: 6px;">Consultez les autres onglets ou créez-en un dans le Portail Administrateur !</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(coupon => {
    // If user has VIP simulation active, blur is removed
    const effectivelyLocked = coupon.isLocked && !isVipSimulated;
    const badgeClass = coupon.status === "won" ? "badge-won" : (coupon.isLocked ? "badge-vip" : "badge-free");
    const badgeLabel = coupon.status === "won" ? "🏆 BORDEREAU GAGNÉ" : (coupon.isLocked ? "👑 VIP PRIVILÈGE" : "🆓 ACCÈS LIBRE");
    const bookingCode = coupon.bookingCode || "1X-" + Math.floor(1000 + Math.random() * 9000) + "B";
    const ref = coupon.ticketRef || "#TK-" + Math.floor(100000 + Math.random() * 900000);

    return `
      <div class="coupon-card ${coupon.isLocked ? 'is-vip' : ''} ${effectivelyLocked ? 'is-locked' : ''}" data-coupon-id="${coupon.id}">
        
        <!-- Betslip Top Metadata Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 18px 0; font-size:11px; color:var(--c-text-muted);">
          <span>${ref}</span>
          <span style="font-weight:700; color:var(--c-violet-light);">${coupon.bookmaker || '1xBet & Betclic'}</span>
        </div>

        <!-- Header Banner -->
        <div class="coupon-header-banner">
          <span class="coupon-badge-tag ${badgeClass}">
            ${badgeLabel}
          </span>
          <div class="coupon-odds-badge">
            Cote ${coupon.totalOdds.toFixed(2)}
          </div>
        </div>

        <!-- Body with Matches -->
        <div class="coupon-body">
          <h4 class="coupon-meta-title">${coupon.title}</h4>
          <div class="coupon-date-info">📅 ${coupon.date} • ${coupon.league}</div>

          <!-- Matches list (Subject to blur if locked) -->
          <div class="coupon-matches-list">
            ${coupon.matches.map(m => `
              <div class="coupon-match-item">
                <div class="item-league-text">${m.competition || coupon.league} • ${m.time}</div>
                <div class="item-clash-row">
                  <div class="clash-club">
                    <img src="${m.homeLogo}" alt="${m.homeTeam}" onerror="this.src='https://media.api-sports.io/football/teams/541.png'" />
                    <span>${m.homeTeam}</span>
                  </div>
                  <span style="font-weight: 800; font-size: 11px; color: var(--c-violet-neon);">VS</span>
                  <div class="clash-club">
                    <span>${m.awayTeam}</span>
                    <img src="${m.awayLogo}" alt="${m.awayTeam}" onerror="this.src='https://media.api-sports.io/football/teams/50.png'" />
                  </div>
                </div>
                <div class="item-prediction-row">
                  <span class="pred-name">Sélection : <strong>${m.prediction}</strong></span>
                  <span class="pred-odd">@${m.odds}</span>
                </div>
              </div>
            `).join("")}
          </div>

          <!-- Overlay with Lock & Unlock Button when Blurred -->
          ${effectivelyLocked ? `
            <div class="locked-blur-overlay">
              <div class="lock-shield-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div class="lock-shield-title">Pronostics & Cotes Floutés</div>
              <div class="lock-shield-desc">
                Ce combiné officiel à fort retour sur investissement est réservé aux membres VIP FASTSporty.
              </div>
              <button class="btn-unlock-coupon" data-action="unlock-coupon" data-id="${coupon.id}">
                <span>🔓 Débloquer ce combiné (${coupon.price})</span>
              </button>
            </div>
          ` : ''}

        </div>

        <!-- Booking Code Copy Row -->
        <div style="padding: 10px 18px 4px; display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed rgba(255,255,255,0.08);">
          <span style="font-size:11px; color:var(--c-text-muted);">Code Bookmaker :</span>
          <button class="btn-copy-code" data-booking="${bookingCode}" style="padding: 4px 10px; font-size: 11px;">
            <span>📋 ${bookingCode} (Copier)</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="coupon-footer">
          <span>🎯 Confiance : <strong>${coupon.confidence}%</strong></span>
          <span class="coupon-gain-estim">${coupon.stakeSuggestion.split("→")[1] || coupon.stakeSuggestion}</span>
        </div>

      </div>
    `;
  }).join("");

  // Attach Unlock actions
  grid.querySelectorAll("[data-action='unlock-coupon']").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const c = couponsData.find(item => item.id === id);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
      showToast(`🎉 Coupon "${c?.title}" débloqué avec succès ! Bon pari.`);
      if (c) {
        c.isLocked = false;
        renderCouponsGrid();
      }
    });
  });

  // Attach Copy Booking Code actions
  grid.querySelectorAll(".btn-copy-code").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.getAttribute("data-booking");
      if (code) {
        navigator.clipboard?.writeText?.(code);
        showToast(`Code coupon ${code} copié ! Collez-le dans 1xBet ou Betclic.`);
      }
    });
  });
}

// Bankroll Calculator Controller
function initBankrollCalculator() {
  const bankrollInput = document.getElementById("bankroll-input");
  const riskSelect = document.getElementById("risk-select");
  const avgOddInput = document.getElementById("avg-odd-input");
  const winrateSlider = document.getElementById("winrate-slider");
  const winrateLabel = document.getElementById("winrate-label");

  const resStakeUnit = document.getElementById("res-stake-unit");
  const resNetProfit = document.getElementById("res-net-profit");
  const resFinalBankroll = document.getElementById("res-final-bankroll");
  const resCalcRoi = document.getElementById("res-calc-roi");

  function calculate() {
    if (!bankrollInput || !riskSelect || !avgOddInput || !winrateSlider) return;

    const capital = parseFloat(bankrollInput.value) || 500;
    const risk = parseFloat(riskSelect.value) || 0.05;
    const avgOdd = parseFloat(avgOddInput.value) || 3.40;
    const winrate = (parseInt(winrateSlider.value, 10) || 80) / 100;

    if (winrateLabel) winrateLabel.textContent = `${Math.round(winrate * 100)}%`;

    const stakePerBet = capital * risk;
    const totalBets = 30;
    const totalWagered = totalBets * stakePerBet;
    const wonBets = totalBets * winrate;
    const totalReturned = wonBets * (stakePerBet * avgOdd);
    const netProfit = totalReturned - totalWagered;
    const finalBankroll = capital + netProfit;
    const roi = (netProfit / totalWagered) * 100;

    if (resStakeUnit) resStakeUnit.textContent = `${stakePerBet.toFixed(2)}€`;
    if (resNetProfit) {
      resNetProfit.textContent = `${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}€`;
      resNetProfit.className = `calc-kpi-val ${netProfit >= 0 ? 'text-green' : ''}`;
    }
    if (resFinalBankroll) resFinalBankroll.textContent = `${finalBankroll.toFixed(2)}€`;
    if (resCalcRoi) {
      resCalcRoi.textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
      resCalcRoi.className = `calc-kpi-val ${roi >= 0 ? 'text-green' : ''}`;
    }
  }

  [bankrollInput, riskSelect, avgOddInput, winrateSlider].forEach(el => {
    el?.addEventListener("input", calculate);
    el?.addEventListener("change", calculate);
  });

  calculate();
}

// Portal Switcher: Toggle between User Portal and Admin Portal
function setupPortalSwitcher() {
  const btnUser = document.getElementById("portal-switch-user");
  const btnAdmin = document.getElementById("portal-switch-admin");
  const userPortalView = document.getElementById("user-portal-view");
  const adminPortalView = document.getElementById("admin-portal-view");

  const switchPortal = (portal) => {
    if (portal === "admin") {
      btnAdmin?.classList.add("active");
      btnUser?.classList.remove("active");
      if (userPortalView) userPortalView.style.display = "none";
      if (adminPortalView) {
        adminPortalView.classList.add("active");
        adminPortalView.style.display = "block";
      }
      showToast("Basculement vers le Portail Administrateur.");
    } else {
      btnUser?.classList.add("active");
      btnAdmin?.classList.remove("active");
      if (adminPortalView) {
        adminPortalView.classList.remove("active");
        adminPortalView.style.display = "none";
      }
      if (userPortalView) userPortalView.style.display = "block";
      showToast("Retour sur le Portail Utilisateur.");
    }
  };

  btnUser?.addEventListener("click", () => switchPortal("user"));
  btnAdmin?.addEventListener("click", () => switchPortal("admin"));

  document.querySelectorAll("[data-goto='admin']").forEach(b => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      switchPortal("admin");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// Coupons Filter Tabs
function setupFilterTabs() {
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("active"));
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

// Initialize on DOM Loaded
document.addEventListener("DOMContentLoaded", () => {
  // 1. Preloader with bouncing soccer ball
  initPreloader(() => {
    console.log("FASTSporty AI loaded and ready.");
  });

  // 2. Central Hero Banner Carousel (Type 1xBet)
  initHeroCarousel();

  // 3. Auth Modal
  initAuthModal(showToast);

  // 4. Live Matches Carousel
  initMatchCarousel(LIVE_HOT_MATCHES);

  // 5. Scroll Expand Section
  initScrollExpand();

  // 6. Floating Bet Slip Widget
  const betSlip = initBetSlipWidget(showToast);

  // 7. Live Matches Center (Alimenté par API-Sports avec clé utilisateur)
  initLiveCenter((oddData) => {
    betSlip?.addSelection?.(oddData);
  });

  // 8. Bankroll Simulator
  initBankrollCalculator();

  // 9. Coupons Render & Filter
  renderCouponsGrid();
  setupFilterTabs();

  // 10. Admin Portal
  initAdminPortal(couponsData, () => {
    renderCouponsGrid();
  }, showToast);

  // 11. Portal Switcher
  setupPortalSwitcher();

  // Header scroll shadow
  window.addEventListener("scroll", () => {
    const header = document.querySelector(".site-header");
    if (window.scrollY > 20) {
      header?.classList.add("scrolled");
    } else {
      header?.classList.remove("scrolled");
    }
  });
});

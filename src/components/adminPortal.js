// Portail Administrateur Controller avec API-Sports et Supabase
import { searchClubs, generateClubLogoFallback, CLUBS_DATABASE } from "../data/clubs.js";
import { searchClubsApi } from "../services/apiSports.js";
import { saveCouponToDb } from "../services/supabase.js";

export function initAdminPortal(couponsState, onCouponsUpdated, showToast) {
  // Club Search 1 (Home)
  const homeInput = document.getElementById("admin-home-club-input");
  const homeDropdown = document.getElementById("admin-home-club-dropdown");
  const homePreviewLogo = document.getElementById("admin-home-preview-logo");
  const homePreviewName = document.getElementById("admin-home-preview-name");

  // Club Search 2 (Away)
  const awayInput = document.getElementById("admin-away-club-input");
  const awayDropdown = document.getElementById("admin-away-club-dropdown");
  const awayPreviewLogo = document.getElementById("admin-away-preview-logo");
  const awayPreviewName = document.getElementById("admin-away-preview-name");

  // Selected state
  let selectedHome = {
    id: "real-madrid",
    name: "Real Madrid",
    logo: "https://media.api-sports.io/football/teams/541.png",
  };
  let selectedAway = {
    id: "man-city",
    name: "Manchester City",
    logo: "https://media.api-sports.io/football/teams/50.png",
  };

  // Setup Autocomplete for a club input with live API-Sports search
  const setupClubSearch = (input, dropdown, onSelect) => {
    if (!input || !dropdown) return;

    let debounceTimer = null;

    const renderList = (clubs, fromApi = false) => {
      if (clubs.length === 0) {
        dropdown.innerHTML = `
          <div style="padding: 12px; font-size: 12px; color: var(--c-text-secondary);">
            Recherche en cours ou aucun club trouvé. Appuyez sur Entrée pour utiliser <strong>"${input.value}"</strong>.
          </div>
        `;
      } else {
        dropdown.innerHTML = `
          ${fromApi ? `<div style="padding: 6px 12px; font-size: 10px; color: var(--c-violet-neon); font-weight:700; text-transform:uppercase;">⚡ Résultats Officiels API-Sports</div>` : ''}
          ${clubs.map(c => `
            <div class="club-dropdown-item" data-club-id="${c.id}" data-club-name="${c.name}" data-club-logo="${c.logo}">
              <img src="${c.logo}" alt="${c.name}" onerror="this.src='${generateClubLogoFallback(c.name)}'" />
              <div>
                <div class="club-item-name">${c.name}</div>
                <div class="club-item-league">${c.country || c.league || 'Football'}</div>
              </div>
            </div>
          `).join("")}
        `;
      }

      dropdown.querySelectorAll(".club-dropdown-item").forEach(item => {
        item.addEventListener("click", () => {
          const clubName = item.getAttribute("data-club-name");
          const clubLogo = item.getAttribute("data-club-logo");
          const clubId = item.getAttribute("data-club-id");
          onSelect({ id: clubId, name: clubName, logo: clubLogo });
          dropdown.classList.remove("show");
        });
      });
    };

    const doSearch = async (val) => {
      // 1. Résultats instantanés locaux
      const localMatches = searchClubs(val);
      renderList(localMatches, false);
      dropdown.classList.add("show");

      // 2. Recherche en direct sur API-Sports
      if (val.trim().length >= 3) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const apiResults = await searchClubsApi(val.trim());
            if (apiResults && apiResults.length > 0) {
              renderList(apiResults, true);
            }
          } catch (e) {
            console.warn("Erreur recherche API-Sports:", e);
          }
        }, 300);
      }
    };

    input.addEventListener("focus", () => doSearch(input.value));
    input.addEventListener("input", () => doSearch(input.value));

    // Custom club creation on enter
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim() !== "") {
        e.preventDefault();
        const customClub = {
          id: "custom-" + Date.now(),
          name: input.value.trim(),
          logo: generateClubLogoFallback(input.value.trim()),
        };
        onSelect(customClub);
        dropdown.classList.remove("show");
      }
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });
  };

  setupClubSearch(homeInput, homeDropdown, (club) => {
    selectedHome = club;
    if (homeInput) homeInput.value = club.name;
    if (homePreviewLogo) homePreviewLogo.src = club.logo;
    if (homePreviewName) homePreviewName.textContent = club.name;
    showToast(`Club Domicile sélectionné : ${club.name}`);
  });

  setupClubSearch(awayInput, awayDropdown, (club) => {
    selectedAway = club;
    if (awayInput) awayInput.value = club.name;
    if (awayPreviewLogo) awayPreviewLogo.src = club.logo;
    if (awayPreviewName) awayPreviewName.textContent = club.name;
    showToast(`Club Extérieur sélectionné : ${club.name}`);
  });

  // Handle Create Coupon Form
  const form = document.getElementById("admin-create-coupon-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("coupon-title-input").value;
    const competition = document.getElementById("coupon-league-input").value;
    const prediction = document.getElementById("coupon-prediction-input").value;
    const odd = parseFloat(document.getElementById("coupon-odd-input").value);
    const confidence = parseInt(document.getElementById("coupon-conf-input").value, 10);
    const matchTime = document.getElementById("coupon-time-input").value;
    const isLocked = document.getElementById("coupon-lock-toggle").checked;

    const newCoupon = {
      id: "coupon-" + Date.now(),
      ticketRef: "#TK-" + Math.floor(100000 + Math.random() * 900000),
      title: title.toUpperCase(),
      type: isLocked ? "VIP" : "FREE",
      isLocked: isLocked,
      totalOdds: odd,
      confidence: confidence,
      date: matchTime,
      league: competition,
      price: isLocked ? "9.99€" : "0.00€",
      status: "pending",
      bookingCode: `1X-${Math.floor(1000 + Math.random() * 9000)}B`,
      bookmaker: "1xBet & Betclic",
      stakeSuggestion: `Mise conseillée : 50€ → Gain potentiel : ${(50 * odd).toFixed(2)}€`,
      analysisSnippet: "Pronostic certifié et vérifié dans le portail FASTSporty.",
      matches: [
        {
          homeTeam: selectedHome.name,
          awayTeam: selectedAway.name,
          homeLogo: selectedHome.logo,
          awayLogo: selectedAway.logo,
          prediction: prediction,
          odds: odd,
          time: matchTime,
          competition: competition,
        },
      ],
    };

    couponsState.unshift(newCoupon);
    
    // Sauvegarde Supabase
    saveCouponToDb(newCoupon);

    onCouponsUpdated();
    renderAdminTable();
    showToast(`✅ Coupon "${newCoupon.title}" publié avec succès avec flou ${isLocked ? 'VIP ACTIVÉ' : 'DÉSACTIVÉ'} !`);
  });

  // Render Table of existing coupons
  const tableBody = document.getElementById("admin-coupons-table-body");

  const renderAdminTable = () => {
    if (!tableBody) return;
    tableBody.innerHTML = couponsState.map(coupon => {
      const match = coupon.matches[0];
      const statusClass = coupon.status === "won" ? "status-won" : coupon.status === "lost" ? "status-lost" : "status-pending";
      const statusLabel = coupon.status === "won" ? "GAGNÉ" : coupon.status === "lost" ? "PERDU" : "EN COURS";

      return `
        <tr>
          <td><strong>${coupon.title}</strong></td>
          <td>
            <span style="display:flex; align-items:center; gap:6px;">
              <img src="${match.homeLogo}" style="width:20px;height:20px;object-fit:contain;" onerror="this.src='https://media.api-sports.io/football/teams/541.png'" />
              ${match.homeTeam} vs ${match.awayTeam}
              <img src="${match.awayLogo}" style="width:20px;height:20px;object-fit:contain;" onerror="this.src='https://media.api-sports.io/football/teams/50.png'" />
            </span>
          </td>
          <td><strong style="color:var(--c-violet-light);">${coupon.totalOdds}</strong></td>
          <td>
            <span class="coupon-badge-tag ${coupon.isLocked ? 'badge-vip' : 'badge-free'}">
              ${coupon.isLocked ? '🔒 Flou VIP' : '👁️ Public'}
            </span>
          </td>
          <td><span class="status-badge-live ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="action-btns-cell">
              <button class="btn-status-action" data-action="set-status" data-id="${coupon.id}" data-status="won" title="Marquer Gagné">✅</button>
              <button class="btn-status-action" data-action="set-status" data-id="${coupon.id}" data-status="lost" title="Marquer Perdu">❌</button>
              <button class="btn-status-action" data-action="toggle-lock" data-id="${coupon.id}" title="Inverser Flou">🔒/👁️</button>
              <button class="btn-status-action" data-action="delete" data-id="${coupon.id}" title="Supprimer" style="color:#ef4444;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Action button listeners
    tableBody.querySelectorAll("[data-action='set-status']").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const newStatus = btn.getAttribute("data-status");
        const item = couponsState.find(c => c.id === id);
        if (item) {
          item.status = newStatus;
          onCouponsUpdated();
          renderAdminTable();
          showToast(`Statut mis à jour pour "${item.title}" : ${newStatus.toUpperCase()}`);
        }
      });
    });

    tableBody.querySelectorAll("[data-action='toggle-lock']").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const item = couponsState.find(c => c.id === id);
        if (item) {
          item.isLocked = !item.isLocked;
          item.type = item.isLocked ? "VIP" : "FREE";
          onCouponsUpdated();
          renderAdminTable();
          showToast(`Flou ${item.isLocked ? 'ACTIVÉ' : 'DÉSACTIVÉ'} pour "${item.title}"`);
        }
      });
    });

    tableBody.querySelectorAll("[data-action='delete']").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const idx = couponsState.findIndex(c => c.id === id);
        if (idx !== -1) {
          const removed = couponsState.splice(idx, 1)[0];
          onCouponsUpdated();
          renderAdminTable();
          showToast(`Coupon "${removed.title}" supprimé`);
        }
      });
    });
  };

  renderAdminTable();
}

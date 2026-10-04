// ==============================================================================
// FASTSporty AI — Portail Administrateur Supabase Complet & Temps Réel
// ==============================================================================
import { searchClubs, generateClubLogoFallback } from "../data/clubs.js";
import { searchClubsApi } from "../services/apiSports.js";
import {
  saveCouponToDb,
  updateCouponStatusInDb,
  toggleCouponLockInDb,
  deleteCouponFromDb,
  fetchAllUsersProfiles,
  updateUserProfileSubscription,
  fetchCouponsFromDb,
  fetchSubscriptionsFromDb
} from "../services/supabase.js";
import {
  getMaketouConfig,
  saveMaketouConfig,
  testMaketouApiKey
} from "../services/maketouPayment.js";


export function initAdminPortal(couponsState, onCouponsUpdated, showToast) {
  // 1. Injecter le modal d'administration s'il n'existe pas encore dans le DOM
  let modal = document.getElementById("admin-portal-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "admin-portal-modal";
    modal.className = "admin-modal-backdrop";
    modal.innerHTML = `
      <div class="admin-modal-card">
        <!-- Header -->
        <div class="admin-modal-header">
          <div class="admin-header-left">
            <div class="admin-badge-crown"><i class="ph-bold ph-crown"></i> SUPER ADMIN</div>
            <h2 class="admin-title">FASTSporty AI • Espace Administration</h2>
          </div>
          <div class="admin-header-right">
            <span class="supabase-status-pill"><i class="ph-fill ph-circle"></i> Supabase Connecté (sflxgegvfpytproyoyis)</span>
            <button class="admin-close-btn" id="admin-close-btn" aria-label="Fermer"><i class="ph-bold ph-x"></i></button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="admin-tabs-nav">
          <button class="admin-tab-btn active" data-tab="tab-coupons"><i class="ph-bold ph-ticket"></i> Gestion des Coupons</button>
          <button class="admin-tab-btn" data-tab="tab-users"><i class="ph-bold ph-users"></i> Abonnés & Profils</button>
          <button class="admin-tab-btn" data-tab="tab-maketou"><i class="ph-bold ph-credit-card"></i> Paiements MakeTou</button>
          <button class="admin-tab-btn" data-tab="tab-db"><i class="ph-bold ph-database"></i> Base de Données Supabase</button>
        </div>

        <!-- Tab 1 : Gestion des Coupons -->
        <div class="admin-tab-content active" id="tab-coupons">
          <!-- KPIs Rapides -->
          <div class="admin-kpis-grid">
            <div class="admin-kpi-card">
              <span class="admin-kpi-val" id="admin-kpi-total">0</span>
              <span class="admin-kpi-lbl">Coupons Publiés</span>
            </div>
            <div class="admin-kpi-card text-success">
              <span class="admin-kpi-val" id="admin-kpi-won">0</span>
              <span class="admin-kpi-lbl">Validés Gagnés</span>
            </div>
            <div class="admin-kpi-card text-warning">
              <span class="admin-kpi-val" id="admin-kpi-pending">0</span>
              <span class="admin-kpi-lbl">En Cours</span>
            </div>
            <div class="admin-kpi-card text-vip">
              <span class="admin-kpi-val" id="admin-kpi-rate">0%</span>
              <span class="admin-kpi-lbl">Taux de Réussite</span>
            </div>
          </div>

          <!-- Formulaire Création Coupon -->
          <div class="admin-section-box">
            <h3 class="admin-sec-title"><i class="ph-bold ph-plus-circle"></i> Publier un Nouveau Coupon (Direct Supabase)</h3>
            <form id="admin-create-coupon-form" class="admin-coupon-form">
              <div class="admin-form-grid">
                <div class="admin-input-group">
                  <label>Titre du Coupon</label>
                  <input type="text" id="coupon-title-input" class="admin-input" placeholder="ex: COUPON SAFE DU JOUR" required />
                </div>
                <div class="admin-input-group">
                  <label>Type / Catégorie</label>
                  <select id="coupon-type-select" class="admin-input">
                    <option value="SAFE">SAFE (Sécurité maximale)</option>
                    <option value="FAN">FAN (Grosse cote value)</option>
                    <option value="MONTANTE">MONTANTE (Palier)</option>
                    <option value="SCORE EXACT">SCORE EXACT</option>
                    <option value="COMBINE">COMBINÉ MULTI-CHAMPIONNATS</option>
                    <option value="FREE">DÉCOUVERTE (Gratuit pour tous)</option>
                  </select>
                </div>
                <div class="admin-input-group">
                  <label>Compétition / Ligue</label>
                  <input type="text" id="coupon-league-input" class="admin-input" placeholder="ex: Ligue des Champions" required />
                </div>
                <div class="admin-input-group">
                  <label>Cote Totale</label>
                  <input type="number" step="0.01" min="1.01" id="coupon-odd-input" class="admin-input" placeholder="ex: 2.15" required />
                </div>
                <div class="admin-input-group">
                  <label>Confiance IA (%)</label>
                  <input type="number" min="50" max="99" id="coupon-conf-input" class="admin-input" value="92" required />
                </div>
                <div class="admin-input-group">
                  <label>Horaire / Date</label>
                  <input type="text" id="coupon-time-input" class="admin-input" placeholder="ex: Aujourd'hui, 20h45" required />
                </div>
              </div>

              <!-- Clubs Autocomplete & Match -->
              <div class="admin-match-picker-box">
                <div class="admin-club-col">
                  <label>Équipe Domicile (Recherche API-Sports)</label>
                  <div class="club-input-wrap">
                    <input type="text" id="admin-home-club-input" class="admin-input" placeholder="ex: Real Madrid" required autocomplete="off" />
                    <div id="admin-home-club-dropdown" class="club-dropdown-menu"></div>
                  </div>
                  <div class="club-preview-tag">
                    <img id="admin-home-preview-logo" src="https://media.api-sports.io/football/teams/541.png" alt="Domicile" />
                    <span id="admin-home-preview-name">Real Madrid</span>
                  </div>
                </div>

                <div class="match-vs-divider">VS</div>

                <div class="admin-club-col">
                  <label>Équipe Extérieur (Recherche API-Sports)</label>
                  <div class="club-input-wrap">
                    <input type="text" id="admin-away-club-input" class="admin-input" placeholder="ex: Manchester City" required autocomplete="off" />
                    <div id="admin-away-club-dropdown" class="club-dropdown-menu"></div>
                  </div>
                  <div class="club-preview-tag">
                    <img id="admin-away-preview-logo" src="https://media.api-sports.io/football/teams/50.png" alt="Extérieur" />
                    <span id="admin-away-preview-name">Manchester City</span>
                  </div>
                </div>
              </div>

              <div class="admin-form-grid" style="margin-top:14px;">
                <div class="admin-input-group" style="grid-column: span 2;">
                  <label>Pronostic Prédictif Suggéré</label>
                  <input type="text" id="coupon-prediction-input" class="admin-input" placeholder="ex: Real Madrid ou Nul & Plus de 1.5 Buts" required />
                </div>
                <div class="admin-input-group">
                  <label>Code Réservation (1xBet / Betclic)</label>
                  <input type="text" id="coupon-code-input" class="admin-input" placeholder="ex: 1X-SAFE99" />
                </div>
                <div class="admin-input-group">
                  <label>Accès VIP (Flou protecteur)</label>
                  <label class="admin-toggle-label">
                    <input type="checkbox" id="coupon-lock-toggle" checked />
                    <span>Verrouillé VIP (Réservé aux forfaits Rookie/Standard)</span>
                  </label>
                </div>
              </div>

              <button type="submit" class="btn-admin-submit">
                <i class="ph-bold ph-paper-plane-tilt"></i> Publier et Enregistrer dans Supabase
              </button>
            </form>
          </div>

          <!-- Tableau des coupons en direct -->
          <div class="admin-section-box">
            <div class="admin-table-header">
              <h3 class="admin-sec-title"><i class="ph-bold ph-list"></i> Liste des Coupons dans la Base de Données</h3>
              <button class="btn-admin-sync" id="admin-refresh-coupons"><i class="ph-bold ph-arrows-clockwise"></i> Recharger Supabase</button>
            </div>
            <div class="admin-table-container">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Titre & Ticket</th>
                    <th>Match & Compétition</th>
                    <th>Cote</th>
                    <th>Accès</th>
                    <th>Statut</th>
                    <th style="text-align: right;">Actions Rapides</th>
                  </tr>
                </thead>
                <tbody id="admin-coupons-table-body">
                  <!-- Rempli dynamiquement -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 2 : Gestion des Utilisateurs & Abonnements -->
        <div class="admin-tab-content" id="tab-users">
          <div class="admin-section-box">
            <div class="admin-table-header">
              <h3 class="admin-sec-title"><i class="ph-bold ph-users-three"></i> Utilisateurs Inscrits & Attribution d'Abonnements</h3>
              <button class="btn-admin-sync" id="admin-refresh-users"><i class="ph-bold ph-arrows-clockwise"></i> Actualiser</button>
            </div>
            <p style="font-size:13px; color:var(--c-text-secondary); margin-bottom:16px;">
              Gérez les forfaits <strong>Fast Rookie (14 Jours)</strong> et <strong>Fast Standard (30 Jours)</strong> de vos utilisateurs en 1 clic.
            </p>
            <div class="admin-table-container">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Utilisateur / ID</th>
                    <th>Forfait Actuel</th>
                    <th>Jours Restants</th>
                    <th>Cadeau Réclamé</th>
                    <th style="text-align: right;">Attribuer un Forfait</th>
                  </tr>
                </thead>
                <tbody id="admin-users-table-body">
                  <!-- Rempli dynamiquement -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 3 : Supabase Live Database Info -->
        <div class="admin-tab-content" id="tab-db">
          <div class="admin-section-box">
            <h3 class="admin-sec-title"><i class="ph-bold ph-database"></i> Connexion Base de Données PostgreSQL Supabase</h3>
            <div class="admin-db-status-grid">
              <div class="db-status-card">
                <span class="db-card-icon"><i class="ph-bold ph-link"></i></span>
                <div>
                  <div class="db-card-title">Instance Supabase</div>
                  <div class="db-card-val">https://sflxgegvfpytproyoyis.supabase.co</div>
                </div>
              </div>
              <div class="db-status-card">
                <span class="db-card-icon"><i class="ph-bold ph-globe"></i></span>
                <div>
                  <div class="db-card-title">Région Cloud</div>
                  <div class="db-card-val">eu-central-1 (Francfort) • Actif 🟢</div>
                </div>
              </div>
              <div class="db-status-card">
                <span class="db-card-icon"><i class="ph-bold ph-table"></i></span>
                <div>
                  <div class="db-card-title">Tables Connectées</div>
                  <div class="db-card-val">public.coupons, public.profiles, public.subscriptions, public.programs</div>
                </div>
              </div>
            </div>
            <div style="margin-top:20px; display:flex; gap:12px;">
              <button class="btn-admin-submit" id="admin-test-ping-db" style="width:auto; padding:10px 20px;">
                <i class="ph-bold ph-broadcast"></i> Tester la Latence Supabase
              </button>
            </div>
          </div>
        </div>

        <!-- Tab 4 : Passerelle MakeTou & Abonnements -->
        <div class="admin-tab-content" id="tab-maketou">
          <div class="admin-section-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
              <div>
                <h3 class="admin-sec-title" style="margin-bottom:4px;"><i class="ph-bold ph-credit-card"></i> Passerelle de Paiement MakeTou (Mobile Money & Cartes)</h3>
                <span style="font-size:12px; color:var(--c-text-muted);">Encaissage automatique en Franc CFA (XAF) et Euro (€) via Orange Money, MTN MoMo, Wave et CB.</span>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" id="admin-mkt-test-btn" class="btn-glass" style="padding:8px 14px; font-size:12px; cursor:pointer;">
                  <i class="ph-bold ph-plugs-connected"></i> Tester Connexion API
                </button>
              </div>
            </div>

            <!-- Merchant Profile Badge -->
            <div style="background:rgba(34,229,160,0.06); border:1px solid rgba(34,229,160,0.2); border-radius:10px; padding:12px 16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:38px; height:38px; border-radius:8px; background:rgba(34,229,160,0.15); display:flex; align-items:center; justify-content:center; color:#22E5A0; font-size:20px;">
                  <i class="ph-bold ph-storefront"></i>
                </div>
                <div>
                  <div style="font-weight:700; color:#fff; font-size:14px;">Marchand : Fast Sporty AI</div>
                  <div style="font-size:12px; color:var(--c-text-muted);">Compte MakeTou : <code style="color:#22E5A0;">contact@fastsportyai.com</code></div>
                </div>
              </div>
              <span class="supabase-status-pill" id="admin-mkt-status-badge"><i class="ph-fill ph-circle"></i> Clé active</span>
            </div>

            <form id="admin-maketou-settings-form">
              <div class="admin-input-group" style="margin-bottom:16px;">
                <label style="color:#fff; font-weight:600;">Clé API Secrète MakeTou (Authorization Bearer)</label>
                <input type="password" id="admin-mkt-key-input" class="admin-input" placeholder="ex: mkt_sec_live_..." style="font-family:monospace;" />
                <div id="admin-mkt-key-status" style="font-size:12px; margin-top:6px; display:none;"></div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-bottom:20px;">
                <div class="admin-input-group">
                  <label>⚡ ID Produit Fast Rookie (14j)</label>
                  <input type="text" id="admin-mkt-prod-rookie" class="admin-input" placeholder="productDocumentId ou lien" />
                </div>
                <div class="admin-input-group">
                  <label>⭐ ID Produit Fast Standard (1 mois)</label>
                  <input type="text" id="admin-mkt-prod-standard" class="admin-input" placeholder="productDocumentId ou lien" />
                </div>
                <div class="admin-input-group">
                  <label>👑 ID Produit Fast Premium (1 mois)</label>
                  <input type="text" id="admin-mkt-prod-premium" class="admin-input" placeholder="productDocumentId ou lien" />
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn-neon-primary" style="padding:10px 20px; font-weight:700; cursor:pointer;">
                  <i class="ph-bold ph-floppy-disk"></i> Enregistrer les Paramètres MakeTou
                </button>
              </div>
            </form>
          </div>

          <!-- Tableau des Dernières Transactions d'Abonnement -->
          <div class="admin-section-box" style="margin-top:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 class="admin-sec-title"><i class="ph-bold ph-receipt"></i> Historique des Transactions Supabase (subscriptions)</h3>
              <button type="button" class="btn-glass" id="admin-refresh-subscriptions" style="padding:6px 12px; font-size:12px; cursor:pointer;">
                <i class="ph-bold ph-arrows-clockwise"></i> Actualiser
              </button>
            </div>
            <div class="admin-table-container">
              <table class="admin-table" id="admin-subscriptions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>ID Utilisateur</th>
                    <th>Formule</th>
                    <th>Montant</th>
                    <th>Passerelle</th>
                    <th>Référence</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody id="admin-subscriptions-tbody">
                  <tr>
                    <td colspan="7" style="text-align:center; padding:20px; color:var(--c-text-muted);">Chargement des transactions...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // 2. Gestion de l'ouverture et fermeture du portail
  const openModal = () => {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    updateKpis();
    renderCouponsTable();
    loadUsersTable();
    loadMaketouTab();
    loadSubscriptionsTable();
  };

  const closeModal = () => {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  };

  document.getElementById("admin-close-btn")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  // Export pour ouverture globale
  window.openAdminPortal = openModal;
  window.closeAdminPortal = closeModal;

  // 3. Navigation par Onglets
  modal.querySelectorAll(".admin-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
      modal.querySelectorAll(".admin-tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  // 4. Club Search Autocomplete (API-Sports)
  let selectedHome = { id: "real-madrid", name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" };
  let selectedAway = { id: "man-city", name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" };

  const setupClubSearch = (inputId, dropdownId, previewLogoId, previewNameId, onSelect) => {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const previewLogo = document.getElementById(previewLogoId);
    const previewName = document.getElementById(previewNameId);
    if (!input || !dropdown) return;

    let debounceTimer = null;
    const renderList = (clubs, fromApi = false) => {
      if (clubs.length === 0) {
        dropdown.innerHTML = `
          <div style="padding: 10px; font-size: 12px; color: var(--c-text-secondary);">
            Appuyez sur Entrée pour utiliser <strong>"${input.value}"</strong>
          </div>`;
      } else {
        dropdown.innerHTML = `
          ${fromApi ? `<div style="padding: 4px 10px; font-size: 10px; color: var(--c-violet-neon); font-weight:700;">⚡ API-Sports Live</div>` : ''}
          ${clubs.map(c => `
            <div class="club-dropdown-item" data-id="${c.id}" data-name="${c.name}" data-logo="${c.logo}">
              <img src="${c.logo}" alt="${c.name}" onerror="this.src='${generateClubLogoFallback(c.name)}'" />
              <span>${c.name}</span>
            </div>
          `).join("")}
        `;
      }

      dropdown.querySelectorAll(".club-dropdown-item").forEach(item => {
        item.addEventListener("click", () => {
          const club = {
            id: item.getAttribute("data-id"),
            name: item.getAttribute("data-name"),
            logo: item.getAttribute("data-logo")
          };
          onSelect(club);
          input.value = club.name;
          if (previewLogo) previewLogo.src = club.logo;
          if (previewName) previewName.textContent = club.name;
          dropdown.classList.remove("show");
        });
      });
    };

    const doSearch = (val) => {
      const localMatches = searchClubs(val);
      renderList(localMatches, false);
      dropdown.classList.add("show");

      if (val.trim().length >= 3) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const apiResults = await searchClubsApi(val.trim());
            if (apiResults && apiResults.length > 0) renderList(apiResults, true);
          } catch (e) {
            console.warn("API-Sports error:", e);
          }
        }, 300);
      }
    };

    input.addEventListener("focus", () => doSearch(input.value));
    input.addEventListener("input", () => doSearch(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim() !== "") {
        e.preventDefault();
        const custom = {
          id: "custom-" + Date.now(),
          name: input.value.trim(),
          logo: generateClubLogoFallback(input.value.trim())
        };
        onSelect(custom);
        if (previewLogo) previewLogo.src = custom.logo;
        if (previewName) previewName.textContent = custom.name;
        dropdown.classList.remove("show");
      }
    });

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove("show");
    });
  };

  setupClubSearch("admin-home-club-input", "admin-home-club-dropdown", "admin-home-preview-logo", "admin-home-preview-name", (c) => selectedHome = c);
  setupClubSearch("admin-away-club-input", "admin-away-club-dropdown", "admin-away-preview-logo", "admin-away-preview-name", (c) => selectedAway = c);

  // 5. Mise à jour des KPIs
  const updateKpis = () => {
    const total = couponsState.length;
    const won = couponsState.filter(c => c.status === "won").length;
    const pending = couponsState.filter(c => c.status === "pending").length;
    const evaluated = couponsState.filter(c => c.status === "won" || c.status === "lost").length;
    const rate = evaluated > 0 ? Math.round((won / evaluated) * 100) : 89;

    document.getElementById("admin-kpi-total").textContent = total;
    document.getElementById("admin-kpi-won").textContent = won;
    document.getElementById("admin-kpi-pending").textContent = pending;
    document.getElementById("admin-kpi-rate").textContent = `${rate}%`;
  };

  // 6. Rendu du Tableau des Coupons
  const renderCouponsTable = () => {
    const tbody = document.getElementById("admin-coupons-table-body");
    if (!tbody) return;

    if (couponsState.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">Aucun coupon dans la base de données.</td></tr>`;
      return;
    }

    tbody.innerHTML = couponsState.map(coupon => {
      const match = coupon.matches?.[0] || {
        homeTeam: "Équipe A", awayTeam: "Équipe B",
        homeLogo: "https://media.api-sports.io/football/teams/541.png",
        awayLogo: "https://media.api-sports.io/football/teams/50.png"
      };

      const statusBadge = coupon.status === "won"
        ? `<span class="badge-status-won">🟢 GAGNÉ</span>`
        : coupon.status === "lost"
        ? `<span class="badge-status-lost">🔴 PERDU</span>`
        : `<span class="badge-status-pending">🟡 EN COURS</span>`;

      return `
        <tr>
          <td>
            <strong>${coupon.title}</strong>
            <div style="font-size:11px; color:#7e79a8;">${coupon.ticketRef || coupon.id}</div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="${match.homeLogo}" style="width:20px;height:20px;object-fit:contain;" onerror="this.src='${generateClubLogoFallback(match.homeTeam)}'" />
              <span>${match.homeTeam} vs ${match.awayTeam}</span>
              <img src="${match.awayLogo}" style="width:20px;height:20px;object-fit:contain;" onerror="this.src='${generateClubLogoFallback(match.awayTeam)}'" />
            </div>
            <div style="font-size:11px; color:var(--c-violet-light);">${coupon.league}</div>
          </td>
          <td><strong style="color:#ffffff;">@${coupon.totalOdds}</strong></td>
          <td>
            <span class="admin-pill ${coupon.isLocked ? 'pill-vip' : 'pill-free'}">
              ${coupon.isLocked ? '<i class="ph-bold ph-lock-key"></i> VIP' : '<i class="ph-bold ph-eye"></i> Gratuit'}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <div class="admin-action-row">
              <button class="btn-admin-act btn-won" data-act="status" data-id="${coupon.id}" data-val="won" title="Marquer Gagné"><i class="ph-bold ph-check"></i></button>
              <button class="btn-admin-act btn-lost" data-act="status" data-id="${coupon.id}" data-val="lost" title="Marquer Perdu"><i class="ph-bold ph-x"></i></button>
              <button class="btn-admin-act btn-lock" data-act="lock" data-id="${coupon.id}" title="Basculer VIP / Public"><i class="ph-bold ${coupon.isLocked ? 'ph-lock-open' : 'ph-lock-key'}"></i></button>
              <button class="btn-admin-act btn-del" data-act="del" data-id="${coupon.id}" title="Supprimer de Supabase"><i class="ph-bold ph-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Listeners actions coupons
    tbody.querySelectorAll("[data-act='status']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const val = btn.getAttribute("data-val");
        const c = couponsState.find(item => item.id === id);
        if (c) {
          c.status = val;
          await updateCouponStatusInDb(id, val);
          onCouponsUpdated();
          updateKpis();
          renderCouponsTable();
          showToast(`Coupon "${c.title}" mis à jour : ${val.toUpperCase()} dans Supabase !`);
        }
      });
    });

    tbody.querySelectorAll("[data-act='lock']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const c = couponsState.find(item => item.id === id);
        if (c) {
          c.isLocked = !c.isLocked;
          c.type = c.isLocked ? "VIP" : "FREE";
          await toggleCouponLockInDb(id, c.isLocked);
          onCouponsUpdated();
          renderCouponsTable();
          showToast(`Accès modifié : ${c.isLocked ? 'Réservé VIP (Flou)' : 'Public (Gratuit)'}`);
        }
      });
    });

    tbody.querySelectorAll("[data-act='del']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Supprimer définitivement ce coupon de la base Supabase ?")) {
          const idx = couponsState.findIndex(item => item.id === id);
          if (idx !== -1) {
            const removed = couponsState.splice(idx, 1)[0];
            await deleteCouponFromDb(id);
            onCouponsUpdated();
            updateKpis();
            renderCouponsTable();
            showToast(`Coupon "${removed.title}" supprimé de Supabase.`);
          }
        }
      });
    });
  };

  // 7. Formulaire de Création de Coupon (Envoi Direct Supabase)
  const form = document.getElementById("admin-create-coupon-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("coupon-title-input").value.trim();
    const type = document.getElementById("coupon-type-select").value;
    const league = document.getElementById("coupon-league-input").value.trim();
    const odd = parseFloat(document.getElementById("coupon-odd-input").value);
    const confidence = parseInt(document.getElementById("coupon-conf-input").value, 10);
    const time = document.getElementById("coupon-time-input").value.trim();
    const prediction = document.getElementById("coupon-prediction-input").value.trim();
    const bookingCode = document.getElementById("coupon-code-input").value.trim() || `1X-${Math.floor(1000 + Math.random() * 9000)}`;
    const isLocked = document.getElementById("coupon-lock-toggle").checked;

    const newCoupon = {
      id: "coupon-" + Date.now(),
      ticketRef: "#TK-" + Math.floor(100000 + Math.random() * 900000),
      title: title.toUpperCase(),
      type: type,
      category: type.toLowerCase(),
      isLocked: isLocked,
      totalOdds: odd,
      confidence: confidence,
      date: time,
      league: league,
      price: isLocked ? "Inclus dans l'abonnement" : "0.00€",
      status: "pending",
      bookingCode: bookingCode,
      bookmaker: "1xBet & Betclic",
      stakeSuggestion: `Mise conseillée : 50€ → Gain potentiel : ${(50 * odd).toFixed(2)}€`,
      analysisSnippet: "Analyse prédictive certifiée et enregistrée dans Supabase.",
      matches: [
        {
          homeTeam: selectedHome.name,
          awayTeam: selectedAway.name,
          homeLogo: selectedHome.logo,
          awayLogo: selectedAway.logo,
          prediction: prediction,
          odds: odd,
          time: time,
          competition: league
        }
      ]
    };

    couponsState.unshift(newCoupon);

    // Enregistrement réel dans Supabase
    showToast("💾 Enregistrement dans Supabase en cours...");
    const { error } = await saveCouponToDb(newCoupon);

    if (error) {
      showToast("⚠️ Coupon ajouté localement, mais échec Supabase : " + error.message);
    } else {
      showToast(`🎉 Coupon "${newCoupon.title}" enregistré avec succès dans Supabase !`);
    }

    onCouponsUpdated();
    updateKpis();
    renderCouponsTable();
    form.reset();
  });

  // Bouton recharger depuis Supabase
  document.getElementById("admin-refresh-coupons")?.addEventListener("click", async () => {
    showToast("🔄 Rechargement depuis Supabase...");
    const fresh = await fetchCouponsFromDb();
    if (fresh && fresh.length > 0) {
      couponsState.length = 0;
      couponsState.push(...fresh);
      onCouponsUpdated();
      updateKpis();
      renderCouponsTable();
      showToast(`✅ ${fresh.length} coupons synchronisés depuis Supabase !`);
    }
  });

  // 8. Tableau des Utilisateurs & Attribution d'Abonnements
  const loadUsersTable = async () => {
    const tbody = document.getElementById("admin-users-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;"><i class="ph-bold ph-spinner-gap" style="animation:spin 1s linear infinite;"></i> Chargement des profils Supabase...</td></tr>`;

    const users = await fetchAllUsersProfiles();

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:30px; color:#64748b;">
            Aucun compte inscrit dans <code>public.profiles</code> pour le moment.<br>
            <span style="font-size:12px;">Dès qu'un visiteur crée un compte via le formulaire, il apparaîtra ici avec son statut et son abonnement.</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => {
      const planName = user.subscription_name || "Gratuit";
      const days = user.subscription_days_remaining || 0;
      const isRookie = user.subscription_tier === "rookie";
      const isStandard = user.subscription_tier === "standard";

      return `
        <tr>
          <td>
            <strong>${user.username || 'Utilisateur'}</strong>
            <div style="font-size:11px; color:#7e79a8;">ID: ${user.public_id || user.id.slice(0, 8)}</div>
          </td>
          <td>
            <span class="admin-pill ${user.subscription_tier !== 'free' ? 'pill-vip' : 'pill-free'}">
              ${planName}
            </span>
          </td>
          <td><strong>${days} jours</strong></td>
          <td>${user.welcome_gift_claimed ? '✅ Oui' : '❌ Non'}</td>
          <td style="text-align: right;">
            <div class="admin-action-row">
              <button class="btn-sub-grant ${isRookie ? 'active' : ''}" data-uid="${user.id}" data-tier="rookie" data-name="Fast Rookie (14 Jours)" data-days="14">
                + Rookie (14j)
              </button>
              <button class="btn-sub-grant ${isStandard ? 'active' : ''}" data-uid="${user.id}" data-tier="standard" data-name="Fast Standard (30 Jours)" data-days="30">
                + Standard (30j)
              </button>
              <button class="btn-sub-grant btn-reset" data-uid="${user.id}" data-tier="free" data-name="Gratuit" data-days="0">
                Réinitialiser
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Boutons d'attribution d'abonnement
    tbody.querySelectorAll(".btn-sub-grant").forEach(btn => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-uid");
        const tier = btn.getAttribute("data-tier");
        const name = btn.getAttribute("data-name");
        const days = parseInt(btn.getAttribute("data-days"), 10);

        showToast(`Mise à jour du forfait pour l'utilisateur...`);
        const { error } = await updateUserProfileSubscription(uid, { tier, name, daysRemaining: days });
        if (error) {
          showToast(`Erreur : ${error.message}`);
        } else {
          showToast(`✅ Forfait "${name}" activé pour l'utilisateur !`);
          loadUsersTable();
        }
      });
    });
  };

  document.getElementById("admin-refresh-users")?.addEventListener("click", loadUsersTable);

  // 9. Test de Ping Supabase
  document.getElementById("admin-test-ping-db")?.addEventListener("click", async () => {
    const t0 = performance.now();
    showToast("📡 Envoi d'un ping à l'API Supabase...");
    try {
      const res = await fetchCouponsFromDb();
      const t1 = performance.now();
      const latency = Math.round(t1 - t0);
      showToast(`🟢 Connexion Supabase excellente ! Latence : ${latency}ms (${res?.length || 0} coupons lus)`);
    } catch (e) {
      showToast("🔴 Erreur de connexion Supabase : " + e.message);
    }
  });

  // 10. Gestion des paramètres MakeTou & Tableau des Souscriptions
  const loadMaketouTab = () => {
    const config = getMaketouConfig();
    const keyInput = document.getElementById("admin-mkt-key-input");
    const rookieInput = document.getElementById("admin-mkt-prod-rookie");
    const standardInput = document.getElementById("admin-mkt-prod-standard");
    const premiumInput = document.getElementById("admin-mkt-prod-premium");
    const statusBadge = document.getElementById("admin-mkt-status-badge");

    if (keyInput) keyInput.value = config.apiKey || "";
    if (rookieInput) rookieInput.value = config.products?.rookie || "";
    if (standardInput) standardInput.value = config.products?.standard || "";
    if (premiumInput) premiumInput.value = config.products?.premium || "";

    if (statusBadge) {
      if (config.apiKey) {
        statusBadge.innerHTML = `<i class="ph-fill ph-check-circle" style="color:#22E5A0;"></i> Clé configurée`;
        statusBadge.style.color = "#22E5A0";
      } else {
        statusBadge.innerHTML = `<i class="ph-fill ph-warning-circle" style="color:#f7c948;"></i> En attente de clé`;
        statusBadge.style.color = "#f7c948";
      }
    }
  };

  const loadSubscriptionsTable = async () => {
    const tbody = document.getElementById("admin-subscriptions-tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--c-text-muted);"><i class="ph-bold ph-spinner ph-spin"></i> Chargement des transactions...</td></tr>`;

    try {
      const subs = await fetchSubscriptionsFromDb();
      if (!subs || subs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--c-text-muted);">Aucune transaction enregistrée pour le moment. Les paiements MakeTou apparaîtront ici automatiquement dès qu'un utilisateur souscrit.</td></tr>`;
        return;
      }

      tbody.innerHTML = subs.map(s => {
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—";
        const tierBadge = s.plan_tier === "premium" ? "background:rgba(212,160,23,0.15);color:#f7c948;border:1px solid #d4a017;" :
                          s.plan_tier === "standard" ? "background:rgba(124,77,255,0.15);color:#7C4DFF;border:1px solid #7C4DFF;" :
                          "background:rgba(34,229,160,0.15);color:#22E5A0;border:1px solid #22E5A0;";

        return `
          <tr>
            <td style="font-size:12px; white-space:nowrap;">${dateStr}</td>
            <td style="font-family:monospace; font-size:12px;">${(s.user_id || "").slice(0, 8)}...</td>
            <td><span style="display:inline-block; padding:3px 8px; border-radius:6px; font-weight:700; font-size:11px; ${tierBadge}">${s.plan_name || s.plan_tier}</span></td>
            <td style="font-weight:700; color:#fff;">${s.amount_paid || 0} ${s.currency || "€"}</td>
            <td><span style="font-size:11px; text-transform:uppercase; color:var(--c-text-muted);">${s.provider || "maketou"}</span></td>
            <td style="font-family:monospace; font-size:11px; color:#22E5A0;">${s.payment_reference || "—"}</td>
            <td><span class="user-sub-badge status-active">Actif</span></td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#FF4B6E; padding:15px;">Erreur chargement transactions : ${err.message}</td></tr>`;
    }
  };

  // Bouton tester clé API MakeTou dans l'admin
  document.getElementById("admin-mkt-test-btn")?.addEventListener("click", async () => {
    const key = document.getElementById("admin-mkt-key-input")?.value?.trim();
    const statusDiv = document.getElementById("admin-mkt-key-status");
    if (!key) {
      showToast("Veuillez saisir votre clé API MakeTou avant de tester.");
      return;
    }

    showToast("Test de la clé API auprès de MakeTou...");
    const res = await testMaketouApiKey(key);
    if (statusDiv) {
      statusDiv.style.display = "block";
      statusDiv.style.color = res.valid ? "#22E5A0" : "#FF4B6E";
      statusDiv.innerText = res.message;
    }
    showToast(res.message);
  });

  // Sauvegarde des paramètres MakeTou
  document.getElementById("admin-maketou-settings-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const apiKey = document.getElementById("admin-mkt-key-input")?.value?.trim() || "";
    const rookie = document.getElementById("admin-mkt-prod-rookie")?.value?.trim() || "";
    const standard = document.getElementById("admin-mkt-prod-standard")?.value?.trim() || "";
    const premium = document.getElementById("admin-mkt-prod-premium")?.value?.trim() || "";

    saveMaketouConfig({
      apiKey,
      accountEmail: "contact@fastsportyai.com",
      merchantName: "Fast Sporty AI",
      products: { rookie, standard, premium }
    });

    loadMaketouTab();
    showToast("Paramètres MakeTou enregistrés avec succès !");
  });

  document.getElementById("admin-refresh-subscriptions")?.addEventListener("click", loadSubscriptionsTable);
}


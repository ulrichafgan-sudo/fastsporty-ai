// Composant Live Match Center alimenté par API-Sports avec logos réels, cotes interactives et avis communauté Supabase
import { getLiveFixtures } from "../services/apiSports.js";
import { fetchMatchComments, createMatchComment, getAuthSession } from "../services/supabase.js";

function formatTimeAgo(isoString) {
  if (!isoString) return "Récemment";
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
  } catch (e) {
    return "Récemment";
  }
}

export function initLiveCenter(options = {}) {
  const showToast = typeof options === "function" ? options : options?.showToast || ((msg) => console.log(msg));
  const openAuthModal = options?.openAuthModal || (() => {});

  const container = document.getElementById("live-matches-grid");
  const refreshBtn = document.getElementById("live-refresh-btn");
  const filterBtns = document.querySelectorAll(".league-filter-pill");

  let currentMatches = [];
  let activeLeague = "all";
  const commentsCache = {};

  async function loadMatches(showLoading = true) {
    if (!container) return;
    if (showLoading) {
      container.innerHTML = `
        <div class="live-loading-state">
          <div class="spinner-neon"></div>
          <span>Synchronisation des flux API-Sports en direct...</span>
        </div>
      `;
    }

    try {
      currentMatches = await getLiveFixtures();
      renderMatches();
      // Pre-fetch comment counts for all matches
      fetchInitialCommentCounts();
    } catch (e) {
      console.warn("Erreur chargement live fixtures:", e);
    }
  }

  async function fetchInitialCommentCounts() {
    for (const match of currentMatches) {
      try {
        const comments = await fetchMatchComments(match.id);
        commentsCache[match.id] = comments;
        updateMatchCountBadge(match.id, comments.length);
      } catch (e) {
        // silently catch
      }
    }
  }

  function updateMatchCountBadge(matchId, count) {
    const chip = document.getElementById(`rev-chip-${matchId}`);
    if (chip) {
      const numSpan = chip.querySelector(".count-num");
      if (numSpan) {
        numSpan.textContent = count > 0 ? `${count}` : "0";
      }
    }
  }

  function renderMatches() {
    if (!container) return;

    let filtered = currentMatches;
    if (activeLeague !== "all") {
      filtered = currentMatches.filter(m => 
        m.league.name.toLowerCase().includes(activeLeague.toLowerCase())
      );
      if (filtered.length === 0) filtered = currentMatches;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--c-text-secondary);">
          Aucun match en direct actuellement. Consultez les prochains coups d'envoi ci-dessous.
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(match => {
      const isLive = String(match.status).includes("LIVE") || String(match.status).includes("'") || match.status === "1H" || match.status === "2H";
      const confidence = match.confidence || Math.floor(88 + Math.random() * 8);
      const predictionText = match.prediction || `${match.homeTeam.name} ou Match Nul (1X)`;
      const categoryFilter = confidence >= 90 ? "safe" : "fan";
      const valueOdd = match.odds?.home || (1.65 + Math.random() * 0.8).toFixed(2);
      const initialCount = commentsCache[match.id]?.length || 0;
      
      return `
        <article class="live-match-card ${isLive ? 'is-live' : ''}" data-match-id="${match.id}">
          <!-- Match Header: League & Status -->
          <div class="live-card-top">
            <div class="league-tag">
              ${match.league.logo ? `<img src="${match.league.logo}" alt="${match.league.name}" class="league-mini-logo" onerror="this.style.display='none'" />` : ''}
              <span>${match.league.name}</span>
            </div>
            <div class="match-time-badge ${isLive ? 'live-pulse' : ''}">
              ${isLive ? `<span class="live-indicator-dot"></span>` : ''}
              <span>${match.status}</span>
            </div>
          </div>

          <!-- Teams and Scoreboard -->
          <div class="live-scoreboard">
            <!-- Home Team -->
            <div class="team-unit home">
              <img src="${match.homeTeam.logo}" alt="${match.homeTeam.name}" class="team-crest" onerror="this.src='https://media.api-sports.io/football/teams/541.png'" />
              <span class="team-name">${match.homeTeam.name}</span>
            </div>

            <!-- Score Display -->
            <div class="score-display">
              <span class="score-num ${isLive ? 'accent' : ''}">${match.goals.home}</span>
              <span class="score-sep">-</span>
              <span class="score-num ${isLive ? 'accent' : ''}">${match.goals.away}</span>
            </div>

            <!-- Away Team -->
            <div class="team-unit away">
              <img src="${match.awayTeam.logo}" alt="${match.awayTeam.name}" class="team-crest" onerror="this.src='https://media.api-sports.io/football/teams/50.png'" />
              <span class="team-name">${match.awayTeam.name}</span>
            </div>
          </div>

          <!-- Module Prédictif IA Flouté avec Bouton 'Voir le coupon' -->
          <div class="ai-prediction-box is-blurred-preview">
            <!-- Background Content blurred -->
            <div class="ai-pred-content-blur">
              <div class="ai-pred-header">
                <span class="ai-pred-tag"><i class="ph-bold ph-brain"></i> Conseil IA xG</span>
                <span class="ai-pred-conf"><i class="ph-bold ph-shield-check"></i> ${confidence}% confiance</span>
              </div>
              <div class="ai-pred-choice">${predictionText}</div>
              <div class="ai-pred-meta">
                <span class="ai-pred-odd">Cote Value : <strong>${valueOdd}</strong></span>
                <span class="ai-pred-bookies"><i class="ph-bold ph-ticket"></i> 1xBet & Betclic</span>
              </div>
            </div>

            <!-- Overlay avec Flou Glassmorphism et Bouton 'Voir le coupon' -->
            <div class="ai-pred-blur-overlay">
              <a href="#coupons-section" class="btn-match-to-coupon btn-see-coupon-overlay" data-filter="${categoryFilter}">
                <i class="ph-bold ph-ticket"></i>
                <span>Voir le coupon</span>
                <i class="ph-bold ph-arrow-right"></i>
              </a>
            </div>
          </div>

          <!-- Déclencheur Avis sur le coupon (Capsule Pilule Compacte & Centrée) -->
          <div class="match-reviews-bar">
            <button class="btn-toggle-reviews" data-match-id="${match.id}" data-match-title="${match.homeTeam.name} vs ${match.awayTeam.name}" type="button" title="Consulter les avis sur ce coupon">
              <span class="pill-eye-beacon">
                <i class="ph-fill ph-eye"></i>
              </span>
              <span class="pill-title-text">Avis sur ce coupon</span>
              <span class="pill-counter-chip" id="rev-chip-${match.id}">
                <i class="ph-bold ph-chat-teardrop-dots"></i>
                <span class="count-num">${initialCount > 0 ? initialCount : '0'}</span>
              </span>
              <i class="ph-bold ph-caret-down pill-chevron-icon"></i>
            </button>
          </div>

          <!-- Fenêtre Survole Flottante des Avis (Popover Panel) -->
          <div class="reviews-popover-panel" id="reviews-popover-${match.id}" aria-hidden="true">
            <div class="popover-header">
              <div class="popover-title-box">
                <span class="popover-title-text"><i class="ph-bold ph-chat-teardrop-text"></i> Avis Communauté</span>
                <span class="popover-match-sub">${match.homeTeam.name} vs ${match.awayTeam.name}</span>
              </div>
              <div class="popover-header-actions">
                <button class="btn-add-review-plus" data-match-id="${match.id}" type="button" title="Ajouter mon avis">
                  <i class="ph-bold ph-plus"></i>
                  <span>Avis</span>
                </button>
                <button class="btn-close-popover" data-match-id="${match.id}" type="button" title="Fermer les avis">
                  <i class="ph-bold ph-x"></i>
                </button>
              </div>
            </div>

            <!-- Zone Formulaire Rédaction (ouvert via le bouton +) -->
            <form class="popover-compose-box" id="compose-box-${match.id}" style="display: none;">
              <div class="compose-header-row">
                <span style="font-size:11px; font-weight:700; color:var(--c-text-muted);">Votre évaluation :</span>
                <div class="star-rating-select" id="stars-${match.id}" data-rating="5">
                  <i class="ph-fill ph-star star-item active" data-val="1"></i>
                  <i class="ph-fill ph-star star-item active" data-val="2"></i>
                  <i class="ph-fill ph-star star-item active" data-val="3"></i>
                  <i class="ph-fill ph-star star-item active" data-val="4"></i>
                  <i class="ph-fill ph-star star-item active" data-val="5"></i>
                </div>
              </div>
              <textarea class="compose-textarea" id="comment-text-${match.id}" placeholder="Partagez votre analyse sur ce pronostic..." rows="2" required></textarea>
              <div class="compose-actions-row">
                <button type="button" class="btn-compose-cancel" data-match-id="${match.id}">Annuler</button>
                <button type="submit" class="btn-compose-submit" id="btn-submit-${match.id}">
                  <i class="ph-bold ph-paper-plane-tilt"></i>
                  <span>Publier</span>
                </button>
              </div>
            </form>

            <!-- Liste des avis -->
            <div class="popover-reviews-list" id="reviews-list-${match.id}">
              <div class="reviews-loading-state">
                <i class="ph-bold ph-spinner ph-spin"></i> Chargement des avis...
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    attachInteractionHandlers();
  }

  function attachInteractionHandlers() {
    // 1. Bouton "Voir le coupon" (redirection fluide)
    container.querySelectorAll(".btn-match-to-coupon").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const filter = btn.getAttribute("data-filter") || "all";
        const targetPill = document.querySelector(`.coupons-filter-bar .filter-pill[data-filter="${filter}"]`);
        if (targetPill) targetPill.click();
        const couponsSection = document.getElementById("coupons-section");
        if (couponsSection) {
          couponsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // 2. Bouton "👁️ Avis sur ce coupon" (ouvre/ferme la fenêtre survole)
    container.querySelectorAll(".btn-toggle-reviews").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const matchId = btn.getAttribute("data-match-id");
        const panel = document.getElementById(`reviews-popover-${matchId}`);
        if (!panel) return;

        const isOpen = panel.classList.contains("is-open");

        // Fermer tous les autres panneaux ouverts
        container.querySelectorAll(".reviews-popover-panel.is-open").forEach(p => {
          if (p !== panel) {
            p.classList.remove("is-open");
            p.setAttribute("aria-hidden", "true");
          }
        });
        container.querySelectorAll(".btn-toggle-reviews.is-active").forEach(b => {
          if (b !== btn) b.classList.remove("is-active");
        });

        if (isOpen) {
          panel.classList.remove("is-open");
          panel.setAttribute("aria-hidden", "true");
          btn.classList.remove("is-active");
        } else {
          panel.classList.add("is-open");
          panel.setAttribute("aria-hidden", "false");
          btn.classList.add("is-active");
          loadCommentsForMatch(matchId);
        }
      });
    });

    // 3. Bouton Fermer le popover (✕)
    container.querySelectorAll(".btn-close-popover").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const matchId = btn.getAttribute("data-match-id");
        const panel = document.getElementById(`reviews-popover-${matchId}`);
        if (panel) {
          panel.classList.remove("is-open");
          panel.setAttribute("aria-hidden", "true");
        }
        const toggleBtn = container.querySelector(`.btn-toggle-reviews[data-match-id="${matchId}"]`);
        if (toggleBtn) toggleBtn.classList.remove("is-active");
      });
    });

    // 4. Bouton "+" pour Ajouter un Avis (Contrôle d'authentification)
    container.querySelectorAll(".btn-add-review-plus").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const matchId = btn.getAttribute("data-match-id");
        const composeBox = document.getElementById(`compose-box-${matchId}`);

        // Vérifier si l'utilisateur est connecté
        const session = await getAuthSession();
        if (!session?.user) {
          showToast("🔒 Vous devez être connecté pour publier un avis.");
          openAuthModal("login");
          return;
        }

        // Si connecté, afficher / masquer le formulaire de rédaction
        if (composeBox) {
          const isHidden = composeBox.style.display === "none";
          composeBox.style.display = isHidden ? "flex" : "none";
          if (isHidden) {
            const textarea = composeBox.querySelector("textarea");
            if (textarea) textarea.focus();
          }
        }
      });
    });

    // 5. Bouton Annuler formulaire rédaction
    container.querySelectorAll(".btn-compose-cancel").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const matchId = btn.getAttribute("data-match-id");
        const composeBox = document.getElementById(`compose-box-${matchId}`);
        if (composeBox) composeBox.style.display = "none";
      });
    });

    // 6. Sélecteur d'étoiles interactif
    container.querySelectorAll(".star-rating-select").forEach(starBox => {
      const stars = starBox.querySelectorAll(".star-item");
      stars.forEach(star => {
        star.addEventListener("click", () => {
          const val = parseInt(star.getAttribute("data-val"), 10) || 5;
          starBox.setAttribute("data-rating", val);
          stars.forEach(s => {
            const sVal = parseInt(s.getAttribute("data-val"), 10) || 1;
            if (sVal <= val) {
              s.classList.add("active");
            } else {
              s.classList.remove("active");
            }
          });
        });
      });
    });

    // 7. Soumission du formulaire d'avis vers Supabase
    container.querySelectorAll(".popover-compose-box").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formId = form.id;
        const matchId = formId.replace("compose-box-", "");
        const textarea = document.getElementById(`comment-text-${matchId}`);
        const starBox = document.getElementById(`stars-${matchId}`);
        const submitBtn = document.getElementById(`btn-submit-${matchId}`);

        const commentText = textarea?.value?.trim();
        const rating = parseInt(starBox?.getAttribute("data-rating"), 10) || 5;

        if (!commentText) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> Envoi...`;
        }

        try {
          const { data, error } = await createMatchComment({
            matchId,
            comment: commentText,
            rating
          });

          if (error) {
            showToast("Erreur lors de la publication : " + (error.message || "Session expirée."));
          } else {
            showToast("🎉 Votre avis a été publié avec succès !");
            if (textarea) textarea.value = "";
            form.style.display = "none";

            // Ajouter le commentaire dans la liste en temps réel
            if (!commentsCache[matchId]) commentsCache[matchId] = [];
            commentsCache[matchId].unshift(data);

            renderCommentsList(matchId, commentsCache[matchId]);
            updateMatchCountBadge(matchId, commentsCache[matchId].length);
          }
        } catch (err) {
          console.error("Comment submit error:", err);
          showToast("Une erreur inattendue est survenue.");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="ph-bold ph-paper-plane-tilt"></i> <span>Envoyer</span>`;
          }
        }
      });
    });
  }

  async function loadCommentsForMatch(matchId) {
    const listContainer = document.getElementById(`reviews-list-${matchId}`);
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div class="reviews-loading-state">
        <i class="ph-bold ph-spinner ph-spin"></i> Chargement des avis communautaires...
      </div>
    `;

    try {
      const comments = await fetchMatchComments(matchId);
      commentsCache[matchId] = comments;
      renderCommentsList(matchId, comments);
      updateMatchCountBadge(matchId, comments.length);
    } catch (err) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:20px; font-size:12px; color:var(--c-text-muted);">
          Impossible de charger les avis. Vérifiez votre connexion.
        </div>
      `;
    }
  }

  function renderCommentsList(matchId, comments = []) {
    const listContainer = document.getElementById(`reviews-list-${matchId}`);
    if (!listContainer) return;

    if (!comments || comments.length === 0) {
      listContainer.innerHTML = `
        <div class="reviews-empty-state">
          <i class="ph-bold ph-chat-circle" style="font-size:24px; color:var(--c-violet-light); margin-bottom:4px;"></i>
          <p style="font-size:12px; font-weight:700; color:#FFFFFF;">Aucun avis pour l'instant</p>
          <p style="font-size:11px; color:var(--c-text-muted);">Soyez le premier à donner votre analyse sur ce match !</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = comments.map(c => {
      const initials = c.user_initials || (c.user_name ? c.user_name.slice(0, 2).toUpperCase() : "MB");
      const isVip = c.user_tier === "vip" || String(c.user_name).toLowerCase().includes("vip") || String(c.user_name).toLowerCase().includes("admin");
      const timeStr = formatTimeAgo(c.created_at);
      const rating = Number(c.rating) || 5;

      const starsHtml = Array.from({ length: 5 }, (_, i) => 
        `<i class="ph-fill ph-star ${i < rating ? 'star-gold' : 'star-dim'}"></i>`
      ).join("");

      return `
        <div class="review-item-card">
          <div class="review-item-top">
            <div class="review-author-info">
              <span class="review-avatar-chip ${isVip ? 'is-vip' : ''}">${initials}</span>
              <div class="review-names-box">
                <span class="review-author-name">${c.user_name}</span>
                ${isVip ? `<span class="review-badge-vip"><i class="ph-fill ph-crown"></i> VIP</span>` : ''}
              </div>
            </div>
            <div class="review-stars-and-time">
              <div class="review-stars-row">${starsHtml}</div>
              <span class="review-time-ago">${timeStr}</span>
            </div>
          </div>
          <p class="review-item-text">${c.comment}</p>
        </div>
      `;
    }).join("");
  }

  // Event Listeners
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.classList.add("rotating");
      loadMatches(false).finally(() => {
        setTimeout(() => refreshBtn.classList.remove("rotating"), 600);
      });
    });
  }

  filterBtns.forEach(pill => {
    pill.addEventListener("click", () => {
      filterBtns.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeLeague = pill.getAttribute("data-league") || "all";
      renderMatches();
    });
  });

  // Fermer les popovers au clic à l'extérieur
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".live-match-card")) {
      container?.querySelectorAll(".reviews-popover-panel.is-open").forEach(panel => {
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
      });
      container?.querySelectorAll(".btn-toggle-reviews.is-active").forEach(btn => {
        btn.classList.remove("is-active");
      });
    }
  });

  // Initial Load
  loadMatches();

  // Auto refresh every 90 seconds
  setInterval(() => loadMatches(false), 90000);
}

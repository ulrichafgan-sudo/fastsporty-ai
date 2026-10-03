// Composant Live Match Center alimenté par API-Sports avec logos réels et cotes interactives
import { getLiveFixtures } from "../services/apiSports.js";

export function initLiveCenter(onSelectOdd) {
  const container = document.getElementById("live-matches-grid");
  const refreshBtn = document.getElementById("live-refresh-btn");
  const filterBtns = document.querySelectorAll(".league-filter-pill");

  let currentMatches = [];
  let activeLeague = "all";

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
    } catch (e) {
      console.warn("Erreur chargement live fixtures:", e);
    }
  }

  function renderMatches() {
    if (!container) return;

    let filtered = currentMatches;
    if (activeLeague !== "all") {
      filtered = currentMatches.filter(m => 
        m.league.name.toLowerCase().includes(activeLeague.toLowerCase())
      );
      if (filtered.length === 0) filtered = currentMatches; // fallback si pas de match dans la ligue exacte
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

          <!-- Live Odds Selection (1 - N - 2) -->
          <div class="live-odds-row">
            <button class="odd-btn" data-type="1" data-match="${match.homeTeam.name} vs ${match.awayTeam.name}" data-choice="${match.homeTeam.name}" data-odd="${match.odds?.home || '1.95'}">
              <span class="odd-label">1</span>
              <span class="odd-val">${match.odds?.home || '1.95'}</span>
            </button>
            <button class="odd-btn" data-type="N" data-match="${match.homeTeam.name} vs ${match.awayTeam.name}" data-choice="Match Nul" data-odd="${match.odds?.draw || '3.40'}">
              <span class="odd-label">N</span>
              <span class="odd-val">${match.odds?.draw || '3.40'}</span>
            </button>
            <button class="odd-btn" data-type="2" data-match="${match.homeTeam.name} vs ${match.awayTeam.name}" data-choice="${match.awayTeam.name}" data-odd="${match.odds?.away || '3.20'}">
              <span class="odd-label">2</span>
              <span class="odd-val">${match.odds?.away || '3.20'}</span>
            </button>
          </div>

          ${match.prediction ? `
            <div class="live-tip-badge">
              <span>🎯 Conseil : <strong>${match.prediction}</strong></span>
              <span class="conf-pill">${match.confidence || 90}% confiance</span>
            </div>
          ` : ''}
        </article>
      `;
    }).join("");

    // Setup Click Handlers on Odds Buttons
    container.querySelectorAll(".odd-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const match = btn.getAttribute("data-match");
        const choice = btn.getAttribute("data-choice");
        const odd = parseFloat(btn.getAttribute("data-odd"));

        // Toggle Active Styling
        btn.classList.toggle("selected");

        if (onSelectOdd) {
          onSelectOdd({ match, choice, odd });
        }
      });
    });
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

  // Initial Load
  loadMatches();

  // Auto refresh every 90 seconds
  setInterval(() => loadMatches(false), 90000);
}

// Widget Bordereau de Pari Interactif Flottant (Style Bookmaker 1xBet / Betclic)
import confetti from "canvas-confetti";

export function initBetSlipWidget(showToast) {
  const container = document.getElementById("floating-bet-slip");
  if (!container) return;

  let selections = [];
  let stake = 20;

  function renderSlip() {
    if (selections.length === 0) {
      container.classList.remove("open");
      return;
    }

    container.classList.add("open");

    const totalOdds = selections.reduce((acc, curr) => acc * curr.odd, 1).toFixed(2);
    const potentialGain = (totalOdds * stake).toFixed(2);

    container.innerHTML = `
      <div class="bet-slip-card">
        <!-- Header -->
        <div class="slip-header">
          <div class="slip-title-row">
            <span class="slip-badge">TICKET EN COURS</span>
            <span class="slip-count">${selections.length} sélection${selections.length > 1 ? 's' : ''}</span>
          </div>
          <button class="slip-close-btn" id="slip-close-btn" title="Fermer">✕</button>
        </div>

        <!-- Selections List -->
        <div class="slip-items-list">
          ${selections.map((item, idx) => `
            <div class="slip-item">
              <div class="slip-item-info">
                <span class="slip-match-name">${item.match}</span>
                <span class="slip-choice">Choix : <strong>${item.choice}</strong></span>
              </div>
              <div class="slip-item-odd">
                <span>@${item.odd.toFixed(2)}</span>
                <button class="slip-item-remove" data-idx="${idx}" title="Supprimer">✕</button>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- Stake & Gains -->
        <div class="slip-footer">
          <div class="slip-stake-row">
            <label for="slip-stake-input">Mise (€) :</label>
            <div class="stake-input-wrap">
              <button class="stake-step-btn" data-step="-5">-5</button>
              <input type="number" id="slip-stake-input" value="${stake}" min="5" max="1000" step="5" />
              <button class="stake-step-btn" data-step="+5">+5</button>
            </div>
          </div>

          <div class="slip-summary-row">
            <div class="summary-col">
              <span class="summary-lbl">Cote Totale</span>
              <span class="summary-odd">${totalOdds}</span>
            </div>
            <div class="summary-col right">
              <span class="summary-lbl">Gain Potentiel</span>
              <span class="summary-gain">${potentialGain}€</span>
            </div>
          </div>

          <div class="slip-actions">
            <button class="btn-copy-code" id="slip-copy-btn">
              <span>📋 Copier le Code 1xBet</span>
            </button>
            <button class="btn-neon-primary" id="slip-validate-btn" style="flex: 1; justify-content: center; padding: 10px;">
              <span>⚡ Encaisser</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Listeners
    container.querySelector("#slip-close-btn")?.addEventListener("click", () => {
      selections = [];
      renderSlip();
      showToast("Bordereau réinitialisé");
    });

    container.querySelectorAll(".slip-item-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        selections.splice(idx, 1);
        renderSlip();
      });
    });

    const stakeInput = container.querySelector("#slip-stake-input");
    if (stakeInput) {
      stakeInput.addEventListener("input", (e) => {
        stake = Math.max(5, parseFloat(e.target.value) || 5);
        renderSlip();
      });
    }

    container.querySelectorAll(".stake-step-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const step = parseInt(btn.getAttribute("data-step"), 10);
        stake = Math.max(5, stake + step);
        renderSlip();
      });
    });

    container.querySelector("#slip-copy-btn")?.addEventListener("click", () => {
      const code = `1X-${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
      navigator.clipboard?.writeText?.(code);
      showToast(`Code combiné ${code} copié ! Collez-le dans 1xBet ou Betclic.`);
    });

    container.querySelector("#slip-validate-btn")?.addEventListener("click", () => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#7C4DFF", "#5B2BE0", "#22E5A0", "#FFFFFF"]
      });
      showToast(`Sélection prête ! Redirection vers votre compte VIP...`);
    });
  }

  // Public method to add an odd to the slip
  return {
    addSelection: (item) => {
      const existingIdx = selections.findIndex(s => s.match === item.match);
      if (existingIdx >= 0) {
        selections[existingIdx] = item; // Update selection
      } else {
        selections.push(item);
      }
      renderSlip();
      showToast(`Ajouté au bordereau : ${item.match} (@${item.odd})`);
    },
    clear: () => {
      selections = [];
      renderSlip();
    }
  };
}

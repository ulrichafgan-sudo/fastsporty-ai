// Carousel Component for Live Matches and Odds
export function initMatchCarousel(matches) {
  const track = document.getElementById("matches-carousel-track");
  const prevBtn = document.getElementById("carousel-prev-btn");
  const nextBtn = document.getElementById("carousel-next-btn");

  if (!track || !matches || matches.length === 0) return;

  // Render cards into track
  track.innerHTML = matches.map(match => `
    <div class="match-card" data-match-id="${match.id}">
      <div class="match-league-bar">
        <span>🏆 ${match.league}</span>
        <span style="color: var(--c-violet-light); font-weight: 600;">${match.time}</span>
      </div>

      <div class="match-teams-row">
        <div class="team-badge-box">
          <img src="${match.homeLogo}" alt="${match.home}" class="team-logo-img" loading="lazy" />
          <span class="team-name-text" title="${match.home}">${match.home}</span>
        </div>

        <div class="match-vs-divider">VS</div>

        <div class="team-badge-box">
          <img src="${match.awayLogo}" alt="${match.away}" class="team-logo-img" loading="lazy" />
          <span class="team-name-text" title="${match.away}">${match.away}</span>
        </div>
      </div>

      <div class="odds-capsule-row">
        <div class="odd-chip">
          <span class="odd-tag">1 (Dom.)</span>
          <span class="odd-val">${match.odds.home}</span>
        </div>
        <div class="odd-chip">
          <span class="odd-tag">N (Nul)</span>
          <span class="odd-val">${match.odds.draw}</span>
        </div>
        <div class="odd-chip">
          <span class="odd-tag">2 (Ext.)</span>
          <span class="odd-val">${match.odds.away}</span>
        </div>
      </div>

      <div class="ai-recommendation-bar">
        <span class="ai-tip-text">⚡ Conseil IA : <strong>${match.aiTip}</strong></span>
        <span class="ai-conf-badge">${match.aiProb} Conf.</span>
      </div>
    </div>
  `).join("");

  let currentIndex = 0;
  const cardWidth = 340; // 320px width + 20px gap
  const maxIndex = Math.max(0, matches.length - 2);

  const updateSlide = () => {
    track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
  };

  nextBtn?.addEventListener("click", () => {
    currentIndex = (currentIndex >= maxIndex) ? 0 : currentIndex + 1;
    updateSlide();
  });

  prevBtn?.addEventListener("click", () => {
    currentIndex = (currentIndex <= 0) ? maxIndex : currentIndex - 1;
    updateSlide();
  });

  // Autoplay
  let autoplayTimer = setInterval(() => {
    currentIndex = (currentIndex >= maxIndex) ? 0 : currentIndex + 1;
    updateSlide();
  }, 4500);

  track.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
  track.addEventListener("mouseleave", () => {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => {
      currentIndex = (currentIndex >= maxIndex) ? 0 : currentIndex + 1;
      updateSlide();
    }, 4500);
  });
}

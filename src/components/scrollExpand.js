// Scroll-driven Expanding Section (Inspired by MCP 21 scroll expansion concept)
export function initScrollExpand() {
  const container = document.getElementById("scroll-expand-section");
  const card = document.getElementById("expandable-vip-card");
  const stakeInput = document.getElementById("roi-stake-slider");
  const stakeDisplay = document.getElementById("roi-stake-val");
  const gainDisplay = document.getElementById("roi-gain-val");
  const oddMultiplier = 5.45; // Based on today's featured VIP coupon

  if (!container || !card) return;

  // Real-time calculation on slider change
  const updateCalculation = () => {
    if (!stakeInput || !stakeDisplay || !gainDisplay) return;
    const stake = parseFloat(stakeInput.value) || 50;
    stakeDisplay.textContent = `${stake}€`;
    const gain = (stake * oddMultiplier).toFixed(2);
    gainDisplay.textContent = `${gain}€`;
  };

  stakeInput?.addEventListener("input", updateCalculation);
  updateCalculation();

  // Scroll effect using requestAnimationFrame and scroll position
  const handleScroll = () => {
    const rect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Calculate how far the section is into the viewport
    // 0 = top of section enters bottom of viewport, 1 = centered in viewport
    const progress = Math.min(Math.max((windowHeight - rect.top) / (windowHeight * 0.8), 0), 1);

    // Dynamic expansion transformation
    // Scales from 0.94 to 1.0, increases glowing border and specular light
    const scale = 0.93 + (progress * 0.07);
    const glowOpacity = 0.2 + (progress * 0.45);
    const translateY = (1 - progress) * 20;

    card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    card.style.borderColor = `rgba(168, 85, 247, ${0.25 + (progress * 0.45)})`;
    card.style.boxShadow = `0 25px 65px rgba(0, 0, 0, 0.75), 0 0 ${40 * progress}px rgba(168, 85, 247, ${glowOpacity})`;
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}

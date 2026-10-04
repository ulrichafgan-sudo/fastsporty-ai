// ==========================================================================
// FASTSporty AI - 4 BLOCS DE CHIFFRES CLÉS (ANIMATION COMPTEURS HAUTE PRÉCISION)
// Déclenchement garanti après disparition du preloader (app-ready)
// Easing: easeOutExpo, durée 2.0s, stagger 120ms, requestAnimationFrame
// Formatage : Tabular nums + séparateur de milliers français (espace insécable)
// ==========================================================================

export function initMetricCounters() {
  const section = document.getElementById("key-metrics-section");
  if (!section) return;

  const cards = section.querySelectorAll(".metric-counter-card");
  let hasAnimated = false;

  // Format with non-breaking space (\u00A0) for French thousands
  const formatFrenchThousands = (val) => {
    return Math.floor(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  };

  // Easing easeOutExpo (starts fast, smoothly settles at the target)
  const easeOutExpo = (t) => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  const runCounterAnimation = () => {
    if (hasAnimated) return;
    hasAnimated = true;

    cards.forEach((card, idx) => {
      const numEl = card.querySelector(".metric-number");
      if (!numEl) return;

      const target = parseInt(numEl.getAttribute("data-target"), 10) || 0;
      const staggerDelay = idx * 120; // 120ms progressive stagger
      const duration = 2000; // 2.0 seconds

      // Ensure starts visibly at 0
      numEl.textContent = "0";

      setTimeout(() => {
        let startTime = null;
        card.classList.add("is-counting");

        function step(currentTime) {
          if (!startTime) startTime = currentTime;
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeOutExpo(progress);
          const currentVal = Math.floor(eased * target);

          numEl.textContent = formatFrenchThousands(currentVal);

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            numEl.textContent = formatFrenchThousands(target);
            card.classList.remove("is-counting");
            card.classList.add("is-counted");
          }
        }

        requestAnimationFrame(step);
      }, staggerDelay);
    });
  };

  // Check if section is currently visible in viewport
  const isSectionInViewport = () => {
    const rect = section.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    // Visible if top is below 0 or partly on screen
    return rect.top <= windowHeight * 0.85 && rect.bottom >= 0;
  };

  // Function to initialize after preloader has hidden
  const setupTrigger = () => {
    // If already in viewport when page is ready, run immediately with small 250ms visual delay
    if (isSectionInViewport()) {
      setTimeout(runCounterAnimation, 250);
      return;
    }

    // Otherwise, trigger on scroll into view with IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            runCounterAnimation();
            observer.unobserve(section);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(section);
  };

  // Wait for the preloader to disappear so user actually sees the count-up!
  const preloader = document.getElementById("preloader");
  if (preloader && !document.body.classList.contains("app-ready")) {
    const checkReady = setInterval(() => {
      if (document.body.classList.contains("app-ready") || preloader.classList.contains("preloader-hidden") || preloader.style.display === "none") {
        clearInterval(checkReady);
        setupTrigger();
      }
    }, 80);

    // Fallback maximum safety timeout in case preloader takes too long
    setTimeout(() => {
      clearInterval(checkReady);
      if (!hasAnimated) setupTrigger();
    }, 4000);
  } else {
    // No preloader or already ready
    setupTrigger();
  }
}

// ==========================================================================
// FASTSporty AI - COMPOSANT CARROUSEL BANNIÈRE PRINCIPAL (HERO BANNER)
// Affiche les bannières graphiques officielles 1600x534 fournies par l'utilisateur
// ==========================================================================

import { HERO_SLIDES } from "../data/slides.js";

export function initHeroCarousel() {
  const container = document.getElementById("hero-banner-carousel");
  if (!container) return;

  let currentIndex = 0;
  let autoplayTimer = null;
  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let animationId = null;

  // Build the complete Carousel DOM structure with user's official banners
  container.innerHTML = `
    <div class="hero-carousel-inner" role="region" aria-roledescription="carousel" aria-label="Bannières et offres FASTSporty">
      
      <!-- Animated Neon Conic Border Ring -->
      <div class="carousel-conic-glow"></div>

      <!-- Slides Track -->
      <div class="hero-carousel-track" id="hero-carousel-track">
        ${HERO_SLIDES.map((slide, index) => `
          <div class="hero-slide-item banner-graphic-slide ${index === 0 ? 'active' : ''}" 
               data-slide-index="${index}" 
               role="tabpanel" 
               aria-roledescription="slide" 
               aria-label="${index + 1} sur ${HERO_SLIDES.length}: ${slide.title}">
            
            <a href="${slide.link || '#coupons-section'}" class="hero-banner-link" data-action="${slide.action || ''}" title="${slide.title}">
              <img src="${slide.image}" 
                   alt="${slide.title}" 
                   class="hero-banner-full-img" 
                   loading="${index === 0 ? 'eager' : 'lazy'}" 
                   draggable="false" />
            </a>

          </div>
        `).join("")}
      </div>

      <!-- Navigation Arrows -->
      <button class="hero-carousel-arrow arrow-prev" id="hero-carousel-prev" aria-label="Bannière précédente">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <button class="hero-carousel-arrow arrow-next" id="hero-carousel-next" aria-label="Bannière suivante">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <!-- Pagination Dots / Pills -->
      <div class="hero-carousel-dots" role="tablist" aria-label="Pagination des bannières">
        ${HERO_SLIDES.map((_, index) => `
          <button class="carousel-dot ${index === 0 ? 'active' : ''}" 
                  data-dot-index="${index}" 
                  role="tab" 
                  aria-selected="${index === 0 ? 'true' : 'false'}" 
                  aria-label="Aller à la bannière ${index + 1}">
          </button>
        `).join("")}
      </div>

    </div>
  `;

  const track = document.getElementById("hero-carousel-track");
  const slides = container.querySelectorAll(".hero-slide-item");
  const dots = container.querySelectorAll(".carousel-dot");
  const prevBtn = document.getElementById("hero-carousel-prev");
  const nextBtn = document.getElementById("hero-carousel-next");
  const totalSlides = HERO_SLIDES.length;

  const goToSlide = (index) => {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;

    track.style.transition = "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)";
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    slides.forEach((s, idx) => {
      if (idx === currentIndex) {
        s.classList.add("active");
        s.setAttribute("aria-hidden", "false");
      } else {
        s.classList.remove("active");
        s.setAttribute("aria-hidden", "true");
      }
    });

    dots.forEach((d, idx) => {
      if (idx === currentIndex) {
        d.classList.add("active");
        d.setAttribute("aria-selected", "true");
      } else {
        d.classList.remove("active");
        d.setAttribute("aria-selected", "false");
      }
    });
  };

  const nextSlide = () => goToSlide(currentIndex + 1);
  const prevSlide = () => goToSlide(currentIndex - 1);

  // Autoplay
  const startAutoplay = () => {
    stopAutoplay();
    autoplayTimer = setInterval(nextSlide, 5000);
  };

  const stopAutoplay = () => {
    if (autoplayTimer) clearInterval(autoplayTimer);
  };

  // Click on arrows
  prevBtn?.addEventListener("click", () => {
    prevSlide();
    startAutoplay();
  });

  nextBtn?.addEventListener("click", () => {
    nextSlide();
    startAutoplay();
  });

  // Click on dots
  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.getAttribute("data-dot-index"), 10);
      goToSlide(idx);
      startAutoplay();
    });
  });

  // Pause on hover
  container.addEventListener("mouseenter", stopAutoplay);
  container.addEventListener("mouseleave", startAutoplay);

  // Keyboard navigation
  container.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
      startAutoplay();
    } else if (e.key === "ArrowRight") {
      nextSlide();
      startAutoplay();
    }
  });

  // Handle banner clicks with action triggers (e.g. open auth modal)
  container.querySelectorAll(".hero-banner-link").forEach(link => {
    link.addEventListener("click", (e) => {
      const action = link.getAttribute("data-action");
      if (action === "open-auth-register") {
        e.preventDefault();
        const registerBtn = document.querySelector('[data-action="open-auth"][data-mode="register"]');
        if (registerBtn) registerBtn.click();
        else {
          const authBtn = document.querySelector('[data-action="open-auth"]');
          if (authBtn) authBtn.click();
        }
      } else if (action === "open-auth-login") {
        e.preventDefault();
        const authBtn = document.querySelector('[data-action="open-auth"]');
        if (authBtn) authBtn.click();
      }
    });
  });

  // Touch & Swipe Support
  const getPositionX = (e) => {
    return e.type.includes("mouse") ? e.pageX : e.touches[0].clientX;
  };

  const touchStart = (e) => {
    isDragging = true;
    startX = getPositionX(e);
    stopAutoplay();
    animationId = requestAnimationFrame(animation);
    track.style.transition = "none";
  };

  const touchMove = (e) => {
    if (!isDragging) return;
    const currentX = getPositionX(e);
    const diff = currentX - startX;
    currentTranslate = prevTranslate + diff;
  };

  const touchEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    cancelAnimationFrame(animationId);

    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -50 && currentIndex < totalSlides - 1) {
      currentIndex += 1;
    } else if (movedBy > 50 && currentIndex > 0) {
      currentIndex -= 1;
    } else if (movedBy < -50 && currentIndex === totalSlides - 1) {
      currentIndex = 0;
    } else if (movedBy > 50 && currentIndex === 0) {
      currentIndex = totalSlides - 1;
    }

    goToSlide(currentIndex);
    prevTranslate = -currentIndex * container.offsetWidth;
    startAutoplay();
  };

  const animation = () => {
    if (isDragging) requestAnimationFrame(animation);
  };

  track.addEventListener("touchstart", touchStart, { passive: true });
  track.addEventListener("touchmove", touchMove, { passive: true });
  track.addEventListener("touchend", touchEnd);

  // Start initial slide and autoplay
  goToSlide(0);
  startAutoplay();
}

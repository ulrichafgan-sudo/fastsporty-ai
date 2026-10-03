// ==========================================================================
// FASTSporty AI - HERO BANNER CAROUSEL (Inspiré du carrousel central 1xBet)
// - Ratio 3.5:1 sur Desktop, 16:10 sur Mobile
// - Défilement automatique 5s avec boucle infinie
// - Défilement tactile / souris (drag & swipe) avec inertie et snap
// - Points de pagination (pilule active #B07CFF)
// - Flèches semi-transparentes visibles au survol desktop
// - Transitions avec animations décalées (staggered)
// - Accessibilité complète (WAI-ARIA & Clavier)
// ==========================================================================

import { HERO_SLIDES } from "../data/slides.js";

// Helper de génération de visuels vectoriels thématiques (Placeholders haute fidélité)
function renderSlideArtwork(slide) {
  switch (slide.visualType) {
    case "ai-sports":
      return `
        <div class="artwork-composition ai-sports-art">
          <div class="art-glow-orb" style="background: radial-gradient(circle, rgba(124, 77, 255, 0.45) 0%, transparent 70%);"></div>
          <svg class="art-svg" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad-ball" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF"/>
                <stop offset="60%" stop-color="#B07CFF"/>
                <stop offset="100%" stop-color="#5B2BE0"/>
              </linearGradient>
              <linearGradient id="neon-stream" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#7C4DFF" stop-opacity="0"/>
                <stop offset="50%" stop-color="#B07CFF"/>
                <stop offset="100%" stop-color="#22E5A0"/>
              </linearGradient>
            </defs>
            <!-- Data Grid Stream -->
            <path d="M40 180 Q 180 80 340 120" stroke="url(#neon-stream)" stroke-width="3" fill="none" stroke-dasharray="6 4" opacity="0.8"/>
            <path d="M60 210 Q 200 130 360 160" stroke="url(#neon-stream)" stroke-width="2" fill="none" opacity="0.5"/>
            <!-- 3D Glowing Soccer Sphere -->
            <circle cx="280" cy="115" r="56" fill="url(#grad-ball)"/>
            <circle cx="280" cy="115" r="56" stroke="#7C4DFF" stroke-width="2" opacity="0.8"/>
            <!-- AI Neural Nodes -->
            <circle cx="160" cy="95" r="6" fill="#22E5A0"/>
            <circle cx="210" cy="140" r="5" fill="#B07CFF"/>
            <circle cx="340" cy="80" r="7" fill="#7C4DFF"/>
            <line x1="160" y1="95" x2="210" y2="140" stroke="#7C4DFF" stroke-width="1.5" stroke-dasharray="3 3"/>
            <line x1="210" y1="140" x2="280" y2="115" stroke="#22E5A0" stroke-width="1.5"/>
            <!-- Badge IA Floating -->
            <rect x="180" y="50" width="85" height="26" rx="13" fill="#140C3A" stroke="#7C4DFF" stroke-width="1.5"/>
            <text x="222" y="67" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="800" fill="#22E5A0" text-anchor="middle">xG +94.2%</text>
          </svg>
        </div>
      `;
    case "trophy-stats":
      return `
        <div class="artwork-composition trophy-art">
          <div class="art-glow-orb" style="background: radial-gradient(circle, rgba(34, 229, 160, 0.35) 0%, transparent 70%);"></div>
          <svg class="art-svg" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Ascending Bars Chart -->
            <rect x="140" y="150" width="22" height="50" rx="4" fill="#2A0E9E" stroke="#4B2FD0"/>
            <rect x="175" y="125" width="22" height="75" rx="4" fill="#3B1BB8" stroke="#5B2BE0"/>
            <rect x="210" y="95" width="22" height="105" rx="4" fill="#5B2BE0" stroke="#7C4DFF"/>
            <rect x="245" y="65" width="22" height="135" rx="4" fill="url(#grad-bar)" stroke="#22E5A0"/>
            <!-- Ascending Trend Curve -->
            <path d="M130 160 Q 200 130 280 45" stroke="#22E5A0" stroke-width="3.5" fill="none" filter="drop-shadow(0 0 8px #22E5A0)"/>
            <!-- Glowing Trophy -->
            <circle cx="310" cy="100" r="42" fill="#140C3A" stroke="#FFC21A" stroke-width="2"/>
            <text x="310" y="112" font-size="34" text-anchor="middle">🏆</text>
            <!-- Stat Pill -->
            <rect x="200" y="25" width="110" height="28" rx="14" fill="#0B0820" stroke="#22E5A0" stroke-width="1.5"/>
            <text x="255" y="44" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="800" fill="#22E5A0" text-anchor="middle">ROI +420%</text>
          </svg>
        </div>
      `;
    case "match-odds":
      return `
        <div class="artwork-composition match-art">
          <div class="art-glow-orb" style="background: radial-gradient(circle, rgba(124, 77, 255, 0.4) 0%, transparent 70%);"></div>
          <svg class="art-svg" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Betting Ticket Glass Card -->
            <g transform="rotate(-6 260 115)">
              <rect x="180" y="40" width="160" height="150" rx="16" fill="#140C3A" stroke="#7C4DFF" stroke-width="2" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.8))"/>
              <rect x="195" y="55" width="60" height="18" rx="9" fill="rgba(124, 77, 255, 0.3)"/>
              <text x="225" y="68" font-size="10" font-weight="800" fill="#B07CFF" text-anchor="middle">COTE TOTALE</text>
              <text x="260" y="115" font-family="'Outfit', sans-serif" font-size="32" font-weight="900" fill="#FFFFFF" text-anchor="middle">5.45</text>
              <line x1="195" y1="130" x2="325" y2="130" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4 4"/>
              <text x="260" y="152" font-size="11" font-weight="700" fill="#22E5A0" text-anchor="middle">CONFIANCE IA 87%</text>
              <rect x="205" y="162" width="110" height="18" rx="9" fill="#22E5A0" opacity="0.15"/>
            </g>
          </svg>
        </div>
      `;
    case "telegram-live":
      return `
        <div class="artwork-composition telegram-art">
          <div class="art-glow-orb" style="background: radial-gradient(circle, rgba(34, 211, 238, 0.35) 0%, transparent 70%);"></div>
          <svg class="art-svg" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 3D Telegram Circle Icon -->
            <circle cx="280" cy="115" r="50" fill="url(#grad-tele)" filter="drop-shadow(0 0 25px rgba(34, 211, 238, 0.6))"/>
            <!-- Paper Plane -->
            <path d="M255 116 L298 96 L288 135 L276 122 L270 130 L268 122 Z" fill="#FFFFFF"/>
            <path d="M276 122 L298 96 L268 122 Z" fill="#E0F2FE"/>
            <!-- Live Pulse Rings -->
            <circle cx="280" cy="115" r="66" stroke="#22D3EE" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.6"/>
            <!-- Notification Badge -->
            <circle cx="318" cy="80" r="14" fill="#FF4D6D" filter="drop-shadow(0 0 10px #FF4D6D)"/>
            <text x="318" y="85" font-size="12" font-weight="900" fill="#FFFFFF" text-anchor="middle">1</text>
          </svg>
        </div>
      `;
    case "data-radar":
      return `
        <div class="artwork-composition radar-art">
          <div class="art-glow-orb" style="background: radial-gradient(circle, rgba(167, 139, 250, 0.35) 0%, transparent 70%);"></div>
          <svg class="art-svg" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Polygon Radar Mesh -->
            <polygon points="270,55 330,95 330,165 270,195 210,165 210,95" stroke="#3B1BB8" stroke-width="1.5" fill="none"/>
            <polygon points="270,80 310,105 310,150 270,170 230,150 230,105" stroke="#4B2FD0" stroke-width="1" fill="none"/>
            <!-- Active Data Area -->
            <polygon points="270,62 325,100 300,158 270,182 220,135 240,90" fill="rgba(124, 77, 255, 0.35)" stroke="#7C4DFF" stroke-width="2"/>
            <!-- Data Points -->
            <circle cx="270" cy="62" r="4" fill="#22E5A0"/>
            <circle cx="325" cy="100" r="4" fill="#B07CFF"/>
            <circle cx="300" cy="158" r="4" fill="#22E5A0"/>
            <circle cx="270" cy="182" r="4" fill="#B07CFF"/>
          </svg>
        </div>
      `;
    case "vip-card":
    default:
      return `
        <div class="artwork-composition vip-art">
          <div class="art-glow-orb" style="background: radial-gradient(circle, rgba(255, 194, 26, 0.3) 0%, transparent 70%);"></div>
          <svg class="art-svg" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- VIP Credit / Privilege Card with Gold Sheen -->
            <g transform="rotate(4 260 115)">
              <rect x="175" y="50" width="170" height="110" rx="14" fill="linear-gradient(135deg, #1C1145 0%, #0E0728 100%)" stroke="#FFC21A" stroke-width="1.8" filter="drop-shadow(0 20px 40px rgba(0,0,0,0.85))"/>
              <text x="195" y="80" font-family="'Outfit', sans-serif" font-size="14" font-weight="900" fill="#FFC21A" letter-spacing="2">FAST VIP PASS</text>
              <rect x="195" y="94" width="30" height="20" rx="4" fill="#FFC21A" opacity="0.8"/>
              <text x="195" y="142" font-size="10" fill="#B9B6E6" letter-spacing="1">MEMBRE ILLIMITÉ</text>
              <text x="325" y="142" font-size="14" text-anchor="end">👑</text>
            </g>
          </svg>
        </div>
      `;
  }
}

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

  // Build the complete Carousel DOM structure
  container.innerHTML = `
    <div class="hero-carousel-inner" role="region" aria-roledescription="carousel" aria-label="Bannières et coupons du jour FASTSporty">
      
      <!-- Animated Neon Conic Border Ring -->
      <div class="carousel-conic-glow"></div>

      <!-- Slides Track -->
      <div class="hero-carousel-track" id="hero-carousel-track">
        ${HERO_SLIDES.map((slide, index) => `
          <div class="hero-slide-item ${index === 0 ? 'active' : ''}" 
               data-slide-index="${index}" 
               role="tabpanel" 
               aria-roledescription="slide" 
               aria-label="${index + 1} sur ${HERO_SLIDES.length}: ${slide.title}">
            
            <!-- Left Text Content -->
            <div class="hero-slide-content">
              <div class="slide-badge" style="border-color: ${slide.accentColor}; color: ${slide.accentColor};">
                <span class="slide-pulse-dot" style="background: ${slide.accentColor};"></span>
                <span>${slide.badge}</span>
              </div>
              <h2 class="slide-title">${slide.title}</h2>
              <p class="slide-subtitle">${slide.subtitle}</p>
              <div class="slide-cta-wrapper">
                <a href="${slide.btnLink}" class="btn-slide-action" data-action-type="${slide.btnActionType}" style="--slide-accent: ${slide.accentColor};">
                  <span>${slide.btnText}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </a>
              </div>
            </div>

            <!-- Right Visual Artwork (With Dark Violet Overlay) -->
            <div class="hero-slide-artwork">
              <!-- Dark gradient overlay behind artwork to preserve text readability -->
              <div class="artwork-dark-overlay"></div>
              
              <!-- If custom image exists, attempt load, else fallback gracefully -->
              <picture class="artwork-picture">
                <source srcset="${slide.image}" type="image/webp">
                <img src="${slide.image}" alt="${slide.title}" class="artwork-custom-img" loading="${index === 0 ? 'eager' : 'lazy'}" onerror="this.style.display='none';" />
              </picture>

              <!-- High-Fidelity Thematic SVG Vector Artwork -->
              ${renderSlideArtwork(slide)}
            </div>

          </div>
        `).join("")}
      </div>

      <!-- Navigation Arrows (Semi-transparent, hidden on mobile touch, visible on desktop hover) -->
      <button class="hero-carousel-arrow arrow-prev" id="hero-carousel-prev" aria-label="Slide précédente">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <button class="hero-carousel-arrow arrow-next" id="hero-carousel-next" aria-label="Slide suivante">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <!-- Pagination Dots (Active dot is elongated pill #B07CFF) -->
      <div class="hero-carousel-dots" role="tablist" aria-label="Pagination du carrousel">
        ${HERO_SLIDES.map((_, index) => `
          <button class="carousel-dot ${index === 0 ? 'active' : ''}" 
                  data-dot-index="${index}" 
                  role="tab" 
                  aria-selected="${index === 0 ? 'true' : 'false'}" 
                  aria-label="Aller à la slide ${index + 1}">
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

  // Goto Slide Function with smooth snap and staggered transition
  const goToSlide = (index) => {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;

    track.style.transition = "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)";
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    // Update active classes
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

  // Next / Prev actions
  const nextSlide = () => goToSlide(currentIndex + 1);
  const prevSlide = () => goToSlide(currentIndex - 1);

  nextBtn?.addEventListener("click", () => {
    nextSlide();
    resetAutoplay();
  });

  prevBtn?.addEventListener("click", () => {
    prevSlide();
    resetAutoplay();
  });

  // Dots click
  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.getAttribute("data-dot-index"), 10);
      goToSlide(idx);
      resetAutoplay();
    });
  });

  // Autoplay Logic (every 5 seconds)
  const startAutoplay = () => {
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = setInterval(nextSlide, 5000);
  };

  const stopAutoplay = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };

  const resetAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  // Pause on Hover / Touch
  container.addEventListener("mouseenter", stopAutoplay);
  container.addEventListener("mouseleave", startAutoplay);
  container.addEventListener("focusin", stopAutoplay);
  container.addEventListener("focusout", startAutoplay);

  // Touch Swipe & Mouse Drag Handling
  const getPositionX = (e) => e.type.includes("mouse") ? e.pageX : e.touches[0].clientX;

  const touchStart = (e) => {
    isDragging = true;
    startX = getPositionX(e);
    track.style.transition = "none";
    stopAutoplay();
  };

  const touchMove = (e) => {
    if (!isDragging) return;
    const currentX = getPositionX(e);
    const diff = currentX - startX;
    const trackWidth = container.offsetWidth || 1;
    const percentDiff = (diff / trackWidth) * 100;
    track.style.transform = `translateX(-${(currentIndex * 100) - percentDiff}%)`;
  };

  const touchEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.type.includes("mouse") ? e.pageX : (e.changedTouches ? e.changedTouches[0].clientX : startX);
    const diff = endX - startX;
    // Swipe threshold 45px
    if (diff < -45) {
      nextSlide();
    } else if (diff > 45) {
      prevSlide();
    } else {
      goToSlide(currentIndex);
    }
    startAutoplay();
  };

  // Attach touch listeners
  track.addEventListener("touchstart", touchStart, { passive: true });
  track.addEventListener("touchmove", touchMove, { passive: true });
  track.addEventListener("touchend", touchEnd, { passive: true });

  // Attach mouse drag listeners
  track.addEventListener("mousedown", touchStart);
  window.addEventListener("mousemove", touchMove);
  window.addEventListener("mouseup", (e) => {
    if (isDragging) touchEnd(e);
  });

  // Keyboard Navigation (Arrow Left & Arrow Right)
  container.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
      resetAutoplay();
    } else if (e.key === "ArrowRight") {
      nextSlide();
      resetAutoplay();
    }
  });

  // Action button clicks inside slides
  container.querySelectorAll(".btn-slide-action").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const type = btn.getAttribute("data-action-type");
      const target = btn.getAttribute("href");
      if (type === "scroll" && target?.startsWith("#")) {
        e.preventDefault();
        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      } else if (type === "unlock") {
        e.preventDefault();
        const firstVipBtn = document.querySelector("[data-action='unlock-coupon']");
        if (firstVipBtn) {
          firstVipBtn.scrollIntoView({ behavior: "smooth", block: "center" });
          firstVipBtn.focus();
        } else {
          document.querySelector("#coupons-section")?.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // Start Autoplay immediately
  startAutoplay();
}

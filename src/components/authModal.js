// Authentication Modal Controller (Exact replica of FASTSporty AI Mockup)
export function initAuthModal(showToast) {
  const modalBackdrop = document.getElementById("auth-modal-backdrop");
  const closeBtn = document.getElementById("auth-modal-close");
  const tabLogin = document.getElementById("auth-tab-login");
  const tabRegister = document.getElementById("auth-tab-register");
  const modalTitle = document.getElementById("auth-card-title");
  const modalSub = document.getElementById("auth-card-sub");
  const submitBtn = document.getElementById("auth-submit-btn");
  const submitText = document.getElementById("auth-submit-text");
  const togglePassBtn = document.getElementById("auth-password-toggle");
  const passInput = document.getElementById("auth-password-input");
  const bottomLink = document.getElementById("auth-switch-link");
  const authForm = document.getElementById("auth-form-element");

  let currentMode = "login"; // "login" | "register"

  const setMode = (mode) => {
    currentMode = mode;
    if (mode === "login") {
      tabLogin?.classList.add("active");
      tabRegister?.classList.remove("active");
      if (modalTitle) modalTitle.textContent = "Connexion";
      if (modalSub) modalSub.textContent = "Accédez à vos prédictions et vivez le sport autrement.";
      if (submitText) submitText.textContent = "Se connecter →";
      if (bottomLink) {
        bottomLink.innerHTML = `Pas encore membre ? <span style="text-decoration: underline; color: var(--c-violet-light); font-weight:700;">Créer un compte</span>`;
      }
    } else {
      tabRegister?.classList.add("active");
      tabLogin?.classList.remove("active");
      if (modalTitle) modalTitle.textContent = "Inscription";
      if (modalSub) modalSub.textContent = "Créez votre compte FASTSporty AI en 30 secondes.";
      if (submitText) submitText.textContent = "Créer mon compte →";
      if (bottomLink) {
        bottomLink.innerHTML = `Déjà membre ? <span style="text-decoration: underline; color: var(--c-violet-light); font-weight:700;">Se connecter</span>`;
      }
    }
  };

  tabLogin?.addEventListener("click", () => setMode("login"));
  tabRegister?.addEventListener("click", () => setMode("register"));
  bottomLink?.addEventListener("click", (e) => {
    e.preventDefault();
    setMode(currentMode === "login" ? "register" : "login");
  });

  // Password Visibility Toggle
  togglePassBtn?.addEventListener("click", () => {
    if (!passInput) return;
    const isPass = passInput.type === "password";
    passInput.type = isPass ? "text" : "password";
  });

  // Open & Close Modal
  const openModal = (mode = "login") => {
    setMode(mode);
    modalBackdrop?.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modalBackdrop?.classList.remove("open");
    document.body.style.overflow = "";
  };

  closeBtn?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Attach to trigger buttons
  document.querySelectorAll("[data-action='open-auth']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const mode = btn.getAttribute("data-mode") || "login";
      openModal(mode);
    });
  });

  // Submit Handler
  authForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email-input")?.value || "utilisateur@fastsporty.com";
    showToast(`Connexion réussie ! Bienvenue, ${email.split("@")[0]}`);
    closeModal();
  });

  // Social Buttons
  document.getElementById("btn-auth-google")?.addEventListener("click", () => {
    showToast("Connexion avec Google réussie !");
    closeModal();
  });

  document.getElementById("btn-auth-apple")?.addEventListener("click", () => {
    showToast("Connexion avec Apple ID réussie !");
    closeModal();
  });

  return { openModal, closeModal };
}

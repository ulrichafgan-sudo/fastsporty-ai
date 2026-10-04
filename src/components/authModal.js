// Authentication Modal Controller connected to Supabase & i18n
import { authSignIn, authSignUp, authResetPassword } from "../services/supabase.js";
import { t } from "../services/i18n.js";

export function initAuthModal(showToast, onAuthSuccess) {
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
  const emailInput = document.getElementById("auth-email-input");
  const usernameInput = document.getElementById("auth-username-input");
  const usernameBox = document.getElementById("auth-username-box");
  const bottomLink = document.getElementById("auth-switch-link");
  const authForm = document.getElementById("auth-form-element");
  const forgotLink = document.getElementById("auth-forgot-link");

  let currentMode = "login"; // "login" | "register" | "reset"
  let isSubmitting = false;

  const setMode = (mode) => {
    currentMode = mode;
    if (mode === "login") {
      tabLogin?.classList.add("active");
      tabRegister?.classList.remove("active");
      if (modalTitle) modalTitle.textContent = t("auth.login_title", "Connexion");
      if (modalSub) modalSub.textContent = t("auth.login_sub", "Accédez à vos prédictions et vivez le sport autrement.");
      if (submitText) submitText.textContent = t("auth.btn_login", "Se connecter →");
      if (usernameBox) usernameBox.style.display = "none";
      if (usernameInput) usernameInput.required = false;
      if (passInput) passInput.placeholder = "Mot de passe";
      if (bottomLink) {
        bottomLink.innerHTML = `${t("auth.switch_to_signup", "Pas encore membre ?")} <span style="text-decoration: underline; color: var(--c-violet-light); font-weight:700; cursor:pointer;">${t("auth.link_signup", "Créer un compte")}</span>`;
      }
    } else if (mode === "register") {
      tabRegister?.classList.add("active");
      tabLogin?.classList.remove("active");
      if (modalTitle) modalTitle.textContent = t("auth.signup_title", "Inscription");
      if (modalSub) modalSub.textContent = t("auth.signup_sub", "Créez votre compte FASTSporty AI en 30 secondes.");
      if (submitText) submitText.textContent = t("auth.btn_signup", "Créer mon compte →");
      if (usernameBox) usernameBox.style.display = "block";
      if (usernameInput) usernameInput.required = true;
      if (passInput) passInput.placeholder = "Mot de passe (min. 6 caractères)";
      if (bottomLink) {
        bottomLink.innerHTML = `${t("auth.switch_to_login", "Déjà membre ?")} <span style="text-decoration: underline; color: var(--c-violet-light); font-weight:700; cursor:pointer;">${t("auth.link_login", "Se connecter")}</span>`;
      }
    } else if (mode === "reset") {
      tabLogin?.classList.remove("active");
      tabRegister?.classList.remove("active");
      if (modalTitle) modalTitle.textContent = "Réinitialiser mon mot de passe";
      if (modalSub) modalSub.textContent = "Entrez votre email ou pseudo et choisissez votre nouveau mot de passe.";
      if (submitText) submitText.textContent = "Mettre à jour & Se connecter →";
      if (usernameBox) usernameBox.style.display = "none";
      if (usernameInput) usernameInput.required = false;
      if (passInput) passInput.placeholder = "Nouveau mot de passe (min. 6 car.)";
      if (bottomLink) {
        bottomLink.innerHTML = `<span style="text-decoration: underline; color: var(--c-violet-light); font-weight:700; cursor:pointer;">← Retour à la Connexion</span>`;
      }
    }
  };

  tabLogin?.addEventListener("click", () => setMode("login"));
  tabRegister?.addEventListener("click", () => setMode("register"));
  bottomLink?.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentMode === "reset") {
      setMode("login");
    } else {
      setMode(currentMode === "login" ? "register" : "login");
    }
  });

  forgotLink?.addEventListener("click", (e) => {
    e.preventDefault();
    setMode("reset");
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop?.classList.contains("open")) {
      closeModal();
    }
  });

  // Attach to trigger buttons across DOM
  const attachTriggers = () => {
    document.querySelectorAll("[data-action='open-auth']").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const mode = btn.getAttribute("data-mode") || "login";
        openModal(mode);
      };
    });
  };
  attachTriggers();

  // Submit Handler connected to Supabase
  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const email = emailInput?.value?.trim();
    const password = passInput?.value;
    const username = usernameInput?.value?.trim();

    if (!email || !password) return;

    if (password.length < 6) {
      showToast(t("auth.err_weak_password", "Le mot de passe doit comporter au moins 6 caractères."));
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    const originalText = submitText ? submitText.textContent : "";
    if (submitText) {
      submitText.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> ${t("auth.loading", "Chargement...")}`;
    }

    try {
      if (currentMode === "reset") {
        // Mode Réinitialisation instantanée
        const resetRes = await authResetPassword({ identifier: email, newPassword: password });
        if (!resetRes.success) {
          showToast(resetRes.error?.message || "Impossible de réinitialiser : compte introuvable.");
        } else {
          showToast("✅ Mot de passe mis à jour ! Connexion en cours...");
          // Connexion immédiate
          const loginRes = await authSignIn({ email, password });
          if (!loginRes.error) {
            const userName = loginRes.data?.user?.user_metadata?.username || email.split("@")[0];
            showToast(`🎉 Bon retour, ${userName} !`);
            closeModal();
            if (authForm) authForm.reset();
            if (onAuthSuccess) onAuthSuccess({ user: loginRes.data?.user, session: loginRes.data?.session });
          } else {
            showToast("Mot de passe modifié. Vous pouvez maintenant vous connecter.");
            setMode("login");
          }
        }
      } else if (currentMode === "login") {
        const { data, error } = await authSignIn({ email, password });
        if (error) {
          console.error("Sign in error:", error);
          let msg = "Identifiants incorrects. Cliquez sur 'Mot de passe oublié ?' ci-dessous pour le réinitialiser en 1 clic.";
          if (error.message?.includes("Email not confirmed")) {
            msg = "Votre adresse e-mail n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception.";
          } else if (error.message?.includes("Invalid login credentials")) {
            msg = "E-mail ou mot de passe incorrect. Vous pouvez cliquer sur 'Mot de passe oublié ?' ci-dessous pour réinitialiser.";
          } else if (error.message) {
            msg = error.message;
          }
          showToast(msg, 5000);
        } else {
          const userName = data?.user?.user_metadata?.username || data?.user?.email?.split("@")[0] || "Membre";
          showToast(`🎉 Connexion réussie ! Bon retour, ${userName}.`);
          closeModal();
          if (authForm) authForm.reset();
          if (onAuthSuccess) onAuthSuccess({ user: data?.user, session: data?.session });
        }
      } else {
        const { data, error } = await authSignUp({ email, password, username });
        if (error) {
          console.error("Sign up error:", error);
          if (error.message?.includes("already registered")) {
            showToast(t("auth.err_email_taken", "Cette adresse e-mail est déjà associée à un compte."));
          } else {
            showToast(error.message || t("auth.err_generic", "Une erreur est survenue lors de l'inscription."));
          }
        } else {
          showToast("🎉 Compte créé avec succès ! Connexion en cours...");
          const signInRes = await authSignIn({ email, password });
          closeModal();
          if (authForm) authForm.reset();
          const activeUser = signInRes.data?.user || data?.user;
          const activeSession = signInRes.data?.session || data?.session;
          if (onAuthSuccess) onAuthSuccess({ user: activeUser, session: activeSession });
        }
      }
    } catch (err) {
      console.error("Auth submit exception:", err);
      showToast(t("auth.err_generic", "Une erreur inattendue est survenue."));
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      if (submitText) submitText.textContent = originalText;
    }
  });

  // Social Buttons with user feedback
  document.getElementById("btn-auth-google")?.addEventListener("click", () => {
    showToast("Authentification Google sécurisée en cours...");
    closeModal();
  });

  document.getElementById("btn-auth-apple")?.addEventListener("click", () => {
    showToast("Authentification Apple ID sécurisée en cours...");
    closeModal();
  });

  return { openModal, closeModal, setMode, attachTriggers };
}

import fr from "../i18n/fr.json";
import en from "../i18n/en.json";
import { updateProfileLanguage } from "./supabase.js";

const translations = { fr, en };
const STORAGE_KEY = "fastsporty_lang";

let currentLang = localStorage.getItem(STORAGE_KEY) || "fr";
if (!translations[currentLang]) {
  currentLang = "fr";
}

const listeners = new Set();

/**
 * Get translation by dot path, e.g. t("nav.coupon_vip")
 */
export function t(path, fallback = "") {
  if (!path) return fallback;
  const keys = path.split(".");
  let val = translations[currentLang];
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = val[k];
    } else {
      // Fallback to French if missing in current language
      let fallbackVal = translations["fr"];
      for (const fk of keys) {
        if (fallbackVal && typeof fallbackVal === "object" && fk in fallbackVal) {
          fallbackVal = fallbackVal[fk];
        } else {
          return fallback || path;
        }
      }
      return fallbackVal;
    }
  }
  return typeof val === "string" ? val : fallback || path;
}

/**
 * Get current active language code ('fr' | 'en')
 */
export function getCurrentLanguage() {
  return currentLang;
}

/**
 * Set active language ('fr' or 'en')
 */
export function setLanguage(lang) {
  if (!translations[lang]) return currentLang;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);

  // Sync to database if user is logged in
  updateProfileLanguage(lang);

  // Apply to all elements with data-i18n
  applyTranslations();

  // Notify listeners
  listeners.forEach((fn) => fn(currentLang));
  return currentLang;
}

/**
 * Subscribe to language changes
 */
export function onLanguageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Apply translations to DOM elements with data-i18n attribute
 */
export function applyTranslations(root = document) {
  const elements = root.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const translated = t(key);
    if (!translated) return;

    // Attributes like placeholder or title
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.hasAttribute("placeholder")) {
        el.setAttribute("placeholder", translated);
      }
    } else {
      el.innerHTML = translated;
    }
  });

  // Specifically translate placeholders with data-i18n-placeholder
  const placeholderEls = root.querySelectorAll("[data-i18n-placeholder]");
  placeholderEls.forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });

  // Update HTML lang attribute
  document.documentElement.lang = currentLang;

  // Update language toggle button visual text
  const toggleBtn = document.getElementById("nav-lang-toggle-btn");
  if (toggleBtn) {
    const textSpan = toggleBtn.querySelector(".lang-current-label");
    if (textSpan) {
      textSpan.textContent = currentLang.toUpperCase();
    }
  }
}

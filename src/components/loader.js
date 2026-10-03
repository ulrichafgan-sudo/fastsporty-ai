// Preloader & Bouncing Soccer Ball Controller
export function initPreloader(onLoadedCallback) {
  const preloader = document.getElementById("preloader");
  const progressBar = document.getElementById("loader-progress-bar");
  const progressText = document.getElementById("loader-progress-percent");
  const statusMessage = document.getElementById("loader-status-msg");
  const skipBtn = document.getElementById("loader-skip-btn");

  if (!preloader) return;

  const statusSteps = [
    { percent: 15, msg: "Initialisation du moteur FASTSporty AI..." },
    { percent: 42, msg: "Synchronisation des cotes & championnats mondiaux..." },
    { percent: 70, msg: "Analyse des coupons VIP et calcul des probabilités..." },
    { percent: 92, msg: "Génération de l'interface haute fidélité..." },
    { percent: 100, msg: "Prêt ! Bienvenue sur FASTSporty AI." }
  ];

  let currentPercent = 0;
  let isDone = false;

  const finishLoading = () => {
    if (isDone) return;
    isDone = true;
    if (progressBar) progressBar.style.width = "100%";
    if (progressText) progressText.textContent = "100%";
    if (statusMessage) statusMessage.textContent = "Prêt !";

    setTimeout(() => {
      preloader.classList.add("preloader-hidden");
      document.body.classList.add("app-ready");
      if (typeof onLoadedCallback === "function") {
        onLoadedCallback();
      }
    }, 450);
  };

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      finishLoading();
    });
  }

  // Animate progress smoothly
  const interval = setInterval(() => {
    if (currentPercent >= 100) {
      clearInterval(interval);
      finishLoading();
      return;
    }

    currentPercent += Math.floor(Math.random() * 8) + 3;
    if (currentPercent > 100) currentPercent = 100;

    if (progressBar) progressBar.style.width = `${currentPercent}%`;
    if (progressText) progressText.textContent = `${currentPercent}%`;

    const activeStep = statusSteps.find(s => currentPercent <= s.percent) || statusSteps[statusSteps.length - 1];
    if (statusMessage && activeStep) {
      statusMessage.textContent = activeStep.msg;
    }
  }, 90);
}

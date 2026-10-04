import Chart from "chart.js/auto";

// Données de performance par période
const CHART_DATA_PERIODS = {
  "1m": {
    label: "1 Mois",
    kpiProfit: "+12,450 €",
    kpiRoi: "+28.7% ROI",
    labels: ["04 Sep", "08 Sep", "12 Sep", "16 Sep", "20 Sep", "24 Sep", "28 Sep", "02 Oct", "04 Oct"],
    data: [35800, 37200, 39150, 40400, 42100, 44350, 45800, 47100, 48250],
    winRate: "84.2%",
    avgOdd: "3.25",
    wonTickets: "28/33"
  },
  "3m": {
    label: "3 Mois",
    kpiProfit: "+29,750 €",
    kpiRoi: "+34.1% ROI",
    labels: ["01 Juil", "15 Juil", "01 Août", "15 Août", "01 Sep", "15 Sep", "01 Oct", "04 Oct"],
    data: [18500, 22400, 27300, 32100, 37200, 42100, 47100, 48250],
    winRate: "82.4%",
    avgOdd: "3.20",
    wonTickets: "75/91"
  },
  "season": {
    label: "Saison 2026",
    kpiProfit: "+48,250 €",
    kpiRoi: "+38.9% ROI",
    labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct"],
    data: [7500, 12800, 18900, 24100, 29500, 33200, 37800, 42100, 46500, 48250],
    winRate: "81.9%",
    avgOdd: "3.18",
    wonTickets: "214/261"
  }
};

let performanceChartInstance = null;

export function initPerformanceChart() {
  const canvas = document.getElementById("performanceChartCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Création du dégradé vert émeraude & violet sous la courbe
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, "rgba(34, 229, 160, 0.32)");
  gradient.addColorStop(0.5, "rgba(124, 77, 255, 0.12)");
  gradient.addColorStop(1, "rgba(11, 8, 30, 0.0)");

  // Période par défaut : 1 Mois
  let currentPeriod = "1m";
  const initialData = CHART_DATA_PERIODS[currentPeriod];

  // Si une instance existe déjà, la détruire proprement
  if (performanceChartInstance) {
    performanceChartInstance.destroy();
  }

  // Configuration Chart.js ultra-fluide & moderne
  performanceChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: initialData.labels,
      datasets: [
        {
          label: "Gains Nets Cumulés",
          data: initialData.data,
          borderColor: "#22E5A0",
          borderWidth: 3,
          tension: 0.42, // Courbe de Bézier douce
          fill: true,
          backgroundColor: gradient,
          pointBackgroundColor: "#22E5A0",
          pointBorderColor: "#FFFFFF",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: "#FFFFFF",
          pointHoverBorderColor: "#22E5A0",
          pointHoverBorderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "rgba(15, 11, 38, 0.95)",
          borderColor: "rgba(124, 77, 255, 0.5)",
          borderWidth: 1,
          titleColor: "#FFFFFF",
          titleFont: {
            family: "'Outfit', 'Inter', sans-serif",
            size: 12,
            weight: "bold"
          },
          bodyColor: "#22E5A0",
          bodyFont: {
            family: "'Outfit', 'Inter', sans-serif",
            size: 13,
            weight: "bold"
          },
          padding: 12,
          displayColors: false,
          cornerRadius: 8,
          callbacks: {
            title: (items) => `📅 Date : ${items[0].label}`,
            label: (context) => `💰 Gains cumulés : +${context.parsed.y.toLocaleString("fr-FR")} €`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: "#94A3B8",
            font: {
              family: "'Outfit', 'Inter', sans-serif",
              size: 11,
              weight: "600"
            },
            padding: 8
          }
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.06)",
            drawBorder: false
          },
          ticks: {
            color: "#94A3B8",
            font: {
              family: "'Outfit', 'Inter', sans-serif",
              size: 11
            },
            padding: 8,
            callback: (val) => val.toLocaleString("fr-FR") + " €"
          }
        }
      }
    }
  });

  // Mise à jour dynamique des métriques affichées
  function updateMetricsDisplay(periodKey) {
    const data = CHART_DATA_PERIODS[periodKey];
    if (!data) return;

    const profitEl = document.getElementById("chart-kpi-profit");
    const roiEl = document.getElementById("chart-kpi-roi");
    const winRateEl = document.getElementById("chart-kpi-winrate");
    const avgOddEl = document.getElementById("chart-kpi-avgodd");
    const ticketsEl = document.getElementById("chart-kpi-tickets");

    if (profitEl) profitEl.textContent = data.kpiProfit;
    if (roiEl) roiEl.textContent = data.kpiRoi;
    if (winRateEl) winRateEl.textContent = data.winRate;
    if (avgOddEl) avgOddEl.textContent = data.avgOdd;
    if (ticketsEl) ticketsEl.textContent = data.wonTickets;
  }

  // Écouteurs pour les boutons de filtre de période
  const filterBtns = document.querySelectorAll(".chart-period-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const period = btn.getAttribute("data-period");
      if (!period || !CHART_DATA_PERIODS[period]) return;

      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const nextData = CHART_DATA_PERIODS[period];
      performanceChartInstance.data.labels = nextData.labels;
      performanceChartInstance.data.datasets[0].data = nextData.data;
      performanceChartInstance.update();

      updateMetricsDisplay(period);
    });
  });

  // Init metrics display
  updateMetricsDisplay(currentPeriod);
}

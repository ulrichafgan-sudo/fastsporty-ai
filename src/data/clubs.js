// Base de données des clubs de football & sports
export const CLUBS_DATABASE = [
  {
    id: "real-madrid",
    name: "Real Madrid",
    shortName: "RMA",
    country: "Espagne",
    league: "La Liga",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/240px-Real_Madrid_CF.svg.png",
    color: "#FEBE10",
  },
  {
    id: "barcelona",
    name: "FC Barcelone",
    shortName: "FCB",
    country: "Espagne",
    league: "La Liga",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/240px-FC_Barcelona_%28crest%29.svg.png",
    color: "#A50044",
  },
  {
    id: "psg",
    name: "Paris Saint-Germain",
    shortName: "PSG",
    country: "France",
    league: "Ligue 1",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/240px-Paris_Saint-Germain_F.C..svg.png",
    color: "#004170",
  },
  {
    id: "man-city",
    name: "Manchester City",
    shortName: "MCI",
    country: "Angleterre",
    league: "Premier League",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/240px-Manchester_City_FC_badge.svg.png",
    color: "#6CABDD",
  },
  {
    id: "arsenal",
    name: "Arsenal FC",
    shortName: "ARS",
    country: "Angleterre",
    league: "Premier League",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/240px-Arsenal_FC.svg.png",
    color: "#EF0107",
  },
  {
    id: "liverpool",
    name: "Liverpool FC",
    shortName: "LIV",
    country: "Angleterre",
    league: "Premier League",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/240px-Liverpool_FC.svg.png",
    color: "#C8102E",
  },
  {
    id: "bayern",
    name: "Bayern Munich",
    shortName: "BAY",
    country: "Allemagne",
    league: "Bundesliga",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/240px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png",
    color: "#DC052D",
  },
  {
    id: "dortmund",
    name: "Borussia Dortmund",
    shortName: "BVB",
    country: "Allemagne",
    league: "Bundesliga",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/240px-Borussia_Dortmund_logo.svg.png",
    color: "#FDE100",
  },
  {
    id: "inter",
    name: "Inter Milan",
    shortName: "INT",
    country: "Italie",
    league: "Serie A",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/240px-FC_Internazionale_Milano_2021.svg.png",
    color: "#001489",
  },
  {
    id: "milan",
    name: "AC Milan",
    shortName: "MIL",
    country: "Italie",
    league: "Serie A",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/240px-Logo_of_AC_Milan.svg.png",
    color: "#FB090B",
  },
  {
    id: "juventus",
    name: "Juventus Turin",
    shortName: "JUV",
    country: "Italie",
    league: "Serie A",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juventus_FC_2017_icon_%28black%29.svg/240px-Juventus_FC_2017_icon_%28black%29.svg.png",
    color: "#000000",
  },
  {
    id: "chelsea",
    name: "Chelsea FC",
    shortName: "CHE",
    country: "Angleterre",
    league: "Premier League",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/240px-Chelsea_FC.svg.png",
    color: "#034694",
  },
  {
    id: "atletico",
    name: "Atlético Madrid",
    shortName: "ATM",
    country: "Espagne",
    league: "La Liga",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Atletico_Madrid_2017_logo.svg/240px-Atletico_Madrid_2017_logo.svg.png",
    color: "#CB3524",
  },
  {
    id: "marseille",
    name: "Olympique de Marseille",
    shortName: "OM",
    country: "France",
    league: "Ligue 1",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Olympique_de_Marseille_logo.svg/240px-Olympique_de_Marseille_logo.svg.png",
    color: "#2FAEE0",
  },
  {
    id: "monaco",
    name: "AS Monaco",
    shortName: "ASM",
    country: "France",
    league: "Ligue 1",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/AS_Monaco_FC.svg/240px-AS_Monaco_FC.svg.png",
    color: "#E51B24",
  },
  {
    id: "lyon",
    name: "Olympique Lyonnais",
    shortName: "OL",
    country: "France",
    league: "Ligue 1",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c6/Olympique_Lyonnais.svg/240px-Olympique_Lyonnais.svg.png",
    color: "#182C61",
  }
];

// Helper de recherche instantanée de club
export function searchClubs(query) {
  if (!query || query.trim() === "") return CLUBS_DATABASE.slice(0, 8);
  const q = query.toLowerCase().trim();
  return CLUBS_DATABASE.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.shortName.toLowerCase().includes(q) || 
    c.league.toLowerCase().includes(q)
  );
}

// Fallback pour générer un logo SVG moderne si le club n'est pas dans la liste
export function generateClubLogoFallback(name) {
  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "FC";
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%238B5CF6"/><stop offset="100%" stop-color="%233B82F6"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="url(%23grad)" stroke="%23A855F7" stroke-width="2"/><text x="32" y="38" font-family="sans-serif" font-weight="900" font-size="20" fill="%23ffffff" text-anchor="middle">${initials}</text></svg>`;
}

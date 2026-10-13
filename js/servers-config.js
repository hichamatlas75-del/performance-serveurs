/**
 * ==============================================================================
 * GREY CORNER — CONFIGURATION DES SERVEURS & CATALOGUE OFFICIEL
 * ==============================================================================
 */

window.SERVERS_CATALOG = [
  {
    id: "ALAOUI_LAZIZ",
    name: "Alaoui Laziz",
    displayName: "Abdelaziz Alaoui",
    role: "Serveur",
    photo: "images/HAMID_ALAOUI_ABDELAZIZ.jpg",
    aliases: ["ALAOUI", "LAZIZ", "AZIZ", "ABDELAZIZ", "HAMID ALAOUI", "ALAOUI ABDELAZIZ", "ALAOUI LAZIZ"]
  },
  {
    id: "HATTAF_MOHAMED",
    name: "Hattaf Mohamed",
    displayName: "Mohamed Hattaf",
    role: "Serveur",
    photo: "images/HATTAF_MOHAMMED.jpg",
    aliases: ["HATTAF", "SIMO", "MOHAMED HATTAF", "MOHAMMED HATTAF", "HATTAF MOHAMMED", "SIMO HATTAF", "MOHAMED", "MOHAMMED"]
  },
  {
    id: "HIDARA_YOUSSEF",
    name: "Hidara Youssef",
    displayName: "Youssef Hidara",
    role: "Serveur",
    photo: "images/HIDARA-LACHKAR_YOUSSEF.jpg",
    aliases: ["HIDARA", "YOUSSEF", "HIDARA YOUSSEF", "YOUSSEF HIDARA", "HIDARA LACHKAR", "LACHKAR"]
  },
  {
    id: "KAFOUNI_ZAKARIAE",
    name: "Kafouni Zakariae",
    displayName: "Zakariae Kafouni",
    role: "Serveur",
    photo: "images/KAFOUNI_ZAKARIAE.jpg",
    aliases: ["KAFOUNI", "ZAKARIA", "KAFOUNI ZAKARIAE", "ZAKARIAE KAFOUNI", "ZAKARIA KAFOUNI"]
  },
  {
    id: "MOHSINE_YOUNESS",
    name: "Mohssine Youness",
    displayName: "Youness Mohssine",
    role: "Serveur",
    photo: "images/MOHSSINE_YOUNESS.jpg",
    aliases: ["MOHSINE", "MOHSSINE", "YOUNESS", "MOHSINE YOUNESS", "MOHSSINE YOUNESS", "YOUNESS MOHSINE"]
  },
  {
    id: "MOKHTAR",
    name: "Mokhtar",
    displayName: "Mokhtar",
    role: "Serveur",
    photo: "images/Mokhtar.jpg",
    aliases: ["MOKHTAR", "MOUKHTAR", "MOKHTAR SERVEUR", "EL MOKHTAR", "MOKHTAR SERVICE"]
  },
  {
    id: "EMP_GLOVO",
    name: "Commandes Glovo",
    displayName: "Commandes Glovo",
    role: "Livraisons & Emporté",
    photo: "images/LOGO.jpg",
    aliases: ["GLOVO", "EMP--GLOVO", "EMP-GLOVO", "EMP GLOVO", "LIVRAISON GLOVO"]
  }
];

/**
 * Normalise un texte (minuscule, sans accents, sans caractères spéciaux)
 */
function normalizeServerString(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recherche et résout un serveur depuis une chaîne textuelle brute (ex: du ticket Excel)
 */
function findServerByRawName(rawName) {
  if (!rawName) return null;
  const clean = normalizeServerString(rawName);
  if (!clean || clean.length < 2) return null;

  // 0. Exclusion stricte du responsable de salle / manager (non serveur)
  if (clean.includes("quassir") || clean.includes("hicham")) {
    return null;
  }

  // 1. Recherche exacte ou alias
  for (const s of window.SERVERS_CATALOG) {
    if (normalizeServerString(s.name) === clean || normalizeServerString(s.displayName) === clean) {
      return s;
    }
    for (const alias of s.aliases) {
      if (normalizeServerString(alias) === clean) {
        return s;
      }
    }
  }

  // 2. Recherche par inclusion de mot-clé principal
  const cleanWords = clean.split(" ").filter(w => w.length >= 3);
  for (const s of window.SERVERS_CATALOG) {
    for (const alias of s.aliases) {
      const aliasNorm = normalizeServerString(alias);
      if (aliasNorm.length >= 4 && clean.includes(aliasNorm)) {
        return s;
      }
    }
    for (const w of cleanWords) {
      if (normalizeServerString(s.name).includes(w) || normalizeServerString(s.displayName).includes(w)) {
        return s;
      }
    }
  }

  // 3. Serveur non répertorié : Création dynamique d'un profil générique
  const dynamicId = "SRV_" + clean.toUpperCase().replace(/\s+/g, "_");
  return {
    id: dynamicId,
    name: rawName.trim(),
    displayName: rawName.trim(),
    role: "Serveur",
    photo: null, // Utilisera l'avatar avec initiales
    aliases: [rawName.trim()]
  };
}

// Export explicite sur window
window.findServerByRawName = findServerByRawName;
window.normalizeServerString = normalizeServerString;


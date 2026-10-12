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
    aliases: ["HATTAF", "SIMO", "MOHAMED HATTAF", "MOHAMMED HATTAF", "HATTAF MOHAMMED", "SIMO HATTAF"]
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
    id: "BENKHADA_ABDESLAM",
    name: "Benkhada Abdeslam",
    displayName: "Abdesslam Benkhada",
    role: "Caisse / Responsable",
    photo: "images/BENKHADA_ABDESSLAM.jpg",
    aliases: ["BENKHADA", "ABDESLAM", "ABDESSLAM", "BENKHADA ABDESSLAM", "CAISSE"]
  },
  {
    id: "SALIL_HOUDA",
    name: "Salil Houda",
    displayName: "Houda Salil",
    role: "Caisse",
    photo: "images/SALIL_HOUDA.jpg",
    aliases: ["SALIL", "HOUDA", "SALIL HOUDA", "HOUDA SALIL"]
  },
  {
    id: "CHKAIRI_YOUSSEF",
    name: "Chkairi Youssef",
    displayName: "Youssef Chkairi",
    role: "Barista",
    photo: "images/CHKAIRI_YOUSSEF.jpg",
    aliases: ["CHKAIRI", "CHKAIRI YOUSSEF", "YOUSSEF BAR"]
  },
  {
    id: "ELKOBBI_MOSTAFA",
    name: "El Kobbi Mostafa",
    displayName: "Mostafa El Kobbi",
    role: "Barista",
    photo: "images/EL_KOBBI_MOSTAFA.jpg",
    aliases: ["KOBBI", "EL KOBBI", "EL_KOBBI", "MOSTAFA EL KOBBI"]
  },
  {
    id: "KHALOUQ_RACHID",
    name: "Khalouq Rachid",
    displayName: "Rachid Khalouq",
    role: "Barista",
    photo: "images/KHALOUQ_RACHID.jpg",
    aliases: ["KHALOUQ", "RACHID KHALOUQ", "KHALOUQ RACHID"]
  },
  {
    id: "TOUATI_OMAR",
    name: "Touati Omar",
    displayName: "Omar Touati",
    role: "Salle",
    photo: "images/TOUATI_OMAR.jpg",
    aliases: ["TOUATI", "OMAR TOUATI", "TOUATI OMAR"]
  },
  {
    id: "WALID",
    name: "Walid",
    displayName: "Walid",
    role: "Service",
    photo: "images/WALID.jpg",
    aliases: ["WALID"]
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
    id: "QUASSIR_HICHAM",
    name: "Quassir Hicham",
    displayName: "Hicham Quassir",
    role: "Responsable Salle",
    photo: "images/QUASSIR_HICHAM.jpg",
    aliases: ["QUASSIR", "HICHAM QUASSIR", "QUASSIR HICHAM", "HICHAM SALLE"]
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

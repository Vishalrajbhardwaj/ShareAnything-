// Fun character-themed avatars — match the random device identities so everyone
// can pick a character that fits their vibe. Each value is a path to an image
// (rendered as <img> by the Avatar component).

// Every character can have multiple image variants. AVATAR_SETS maps each
// character name to an array of image paths. Picking an avatar randomly from
// its set gives a different look on every refresh.
// Characters that have an actual image file. Any character NOT listed here will
// fall back to showing its initial letter (handled by the Avatar component).
const IMG = {
  "Iron Man": "/avatars/characters/iron-man-1.jpg",
  "Captain America": "/avatars/characters/captain-america-1.jpg",
  "Thor": "/avatars/characters/thor-1.jpg",
  "Doctor Strange": "/avatars/characters/doctor-strange-1.jpg",
  "Hulk": "/avatars/characters/hulk.jpg",
  "Black Widow": "/avatars/characters/black-widow.jpg",
  "Hawkeye": "/avatars/characters/hawkeye.jpg",
  "Ant-Man": "/avatars/characters/ant-man.jpg",
  "Captain Marvel": "/avatars/characters/captain-marvel.jpg",
  "Loki": "/avatars/characters/loki.jpg",
  "Deadpool": "/avatars/characters/deadpool.jpg",
  "Groot": "/avatars/characters/groot.jpg",
  "Batman": "/avatars/characters/batman.jpg",
  "Flash": "/avatars/characters/flash.jpg",
  "Aquaman": "/avatars/characters/aquaman.jpg",
  "Joker": "/avatars/characters/joker.jpg",
  "Superman": "/avatars/characters/superman.jpg",
  "Wolverine": "/avatars/characters/wolverine.jpg",
  "Harry Potter": "/avatars/characters/harry-potter.jpg",
  "Hermione Granger": "/avatars/characters/hermione-granger.jpg",
  "Albus Dumbledore": "/avatars/characters/albus-dumbledore.jpg",
  "Severus Snape": "/avatars/characters/severus-snape.jpg",
  "Draco Malfoy": "/avatars/characters/draco-malfoy.jpg",
  "Rubeus Hagrid": "/avatars/characters/rubeus-hagrid.jpg",
  "Dobby": "/avatars/characters/dobby.jpg",
  "Sorting Hat": "/avatars/characters/sorting-hat.jpg",
  "Professor": "/avatars/characters/professor.jpg",
  "Tokyo": "/avatars/characters/tokyo.jpg",
  "Berlin": "/avatars/characters/berlin.jpg",
  "Denver": "/avatars/characters/denver.jpg",
  "Helsinki": "/avatars/characters/helsinki.jpg",
  "Naruto Uzumaki": "/avatars/characters/naruto.jpg",
  "Sasuke Uchiha": "/avatars/characters/sasuke.jpg",
  "Monkey D. Luffy": "/avatars/characters/luffy.jpg",
  "Sanji": "/avatars/characters/sanji.jpg",
  "Levi Ackerman": "/avatars/characters/levi.jpg",
  "Eren Yeager": "/avatars/characters/eren.jpg",
  "Goku": "/avatars/characters/goku.jpg",
};

// Every character in the picker, grouped by franchise. Characters WITHOUT an
// image in IMG get an empty array → the profile picker shows their initial.
export const AVATAR_SETS = Object.fromEntries(
  [
    // Marvel / Superhero
    "Iron Man","Spider-Man","Captain America","Thor","Hulk","Black Widow",
    "Hawkeye","Doctor Strange","Black Panther","Scarlet Witch","Vision","Falcon",
    "Winter Soldier","War Machine","Ant-Man","Wasp","Captain Marvel","Star-Lord",
    "Loki","Deadpool","Groot","Batman","Flash","Aquaman","Joker","Superman","Wolverine",
    // Harry Potter
    "Harry Potter","Ron Weasley","Hermione Granger","Albus Dumbledore","Severus Snape",
    "Draco Malfoy","Sirius Black","Ginny Weasley","Rubeus Hagrid","Dobby","Sorting Hat",
    // Money Heist
    "Professor","Tokyo","Berlin","Rio","Nairobi","Denver","Helsinki","Oslo","Lisbon",
    "Palermo","Bogotá","Stockholm",
    // Anime
    "Naruto Uzumaki","Sasuke Uchiha","Kakashi Hatake","Itachi Uchiha","Monkey D. Luffy",
    "Roronoa Zoro","Sanji","Levi Ackerman","Eren Yeager","Goku",
  ].map((name) => [name, IMG[name] ? [IMG[name]] : []])
);

// Organized for the profile modal: label -> ordered character names.
export const FRANCHISES = [
  {
    label: "Marvel / Superhero",
    icon: "🦸",
    names: ["Iron Man","Spider-Man","Captain America","Thor","Hulk","Black Widow","Hawkeye","Doctor Strange","Black Panther","Scarlet Witch","Vision","Falcon","Winter Soldier","War Machine","Ant-Man","Wasp","Captain Marvel","Star-Lord","Loki","Deadpool","Groot","Batman","Flash","Aquaman","Joker","Superman","Wolverine"],
  },
  {
    label: "Harry Potter",
    icon: "🪄",
    names: ["Harry Potter","Ron Weasley","Hermione Granger","Albus Dumbledore","Severus Snape","Draco Malfoy","Sirius Black","Ginny Weasley","Rubeus Hagrid","Dobby","Sorting Hat"],
  },
  {
    label: "Money Heist",
    icon: "🎭",
    names: ["Professor","Tokyo","Berlin","Rio","Nairobi","Denver","Helsinki","Oslo","Lisbon","Palermo","Bogotá","Stockholm"],
  },
  {
    label: "Anime",
    icon: "⚡",
    names: ["Naruto Uzumaki","Sasuke Uchiha","Kakashi Hatake","Itachi Uchiha","Monkey D. Luffy","Roronoa Zoro","Sanji","Levi Ackerman","Eren Yeager","Goku"],
  },
];

// Legacy single-path map — first variant of each character, so any existing
// code that reads AVATARS[name] still works.
export const AVATARS = Object.fromEntries(
  Object.entries(AVATAR_SETS).map(([name, paths]) => [name, paths[0]])
);

// Returns a random image path for a given character name. Used by the server so
// each new connection gets a different variant (image changes on refresh).
export function randomAvatar(name) {
  const set = AVATAR_SETS[name];
  if (!set || set.length === 0) return AVATARS[name];
  return set[Math.floor(Math.random() * set.length)];
}

// Character-based theme: each character gets a UNIQUE color pair + a distinct
// animation effect so the radar/dashboard feels alive and every peer is unique.
export function characterTheme(name) {
  const n = String(name ?? "").toLowerCase();
  const is = (...words) => words.some((w) => n.includes(w));

  // ---- Marvel / Superhero ----
  if (is("iron man") || is("ironman") || is("iron-man")) {
    return { c1: "#ff3d3d", c2: "#ffb300", label: "tech", glitch: true };
  }
  if (is("spider-man")) {
    return { c1: "#e63946", c2: "#1d3557", label: "web", web: true };
  }
  if (is("captain america") || is("captain-america")) {
    return { c1: "#3d7bff", c2: "#ff3d3d", label: "shield", spark: true };
  }
  if (is("thor")) {
    return { c1: "#7bd7ff", c2: "#8b5cf6", label: "storm", lightning: true };
  }
  if (is("hulk")) {
    return { c1: "#2ecc71", c2: "#27ae60", label: "strong", shake: true };
  }
  if (is("black widow")) {
    return { c1: "#e74c3c", c2: "#111", label: "spy", web: true };
  }
  if (is("hawkeye")) {
    return { c1: "#6f42c1", c2: "#2c3e50", label: "archer", slash: true };
  }
  if (is("doctor strange") || is("dr strange") || is("dr_strange")) {
    return { c1: "#ff8c42", c2: "#c084fc", label: "magic", mystic: true };
  }
  if (is("black panther")) {
    return { c1: "#111", c2: "#8a5cf6", label: "panther", aura: true };
  }
  if (is("scarlet witch")) {
    return { c1: "#ff2d55", c2: "#e0115f", label: "hex", mystic: true };
  }
  if (is("vision")) {
    return { c1: "#ffd700", c2: "#e74c3c", label: "solar", glow: true };
  }
  if (is("falcon")) {
    return { c1: "#e67e22", c2: "#7f8c8d", label: "wing", speed: true };
  }
  if (is("winter soldier")) {
    return { c1: "#2c3e50", c2: "#e74c3c", label: "cyber", glitch: true };
  }
  if (is("war machine")) {
    return { c1: "#7f8c8d", c2: "#2c3e50", label: "armor", gear: true };
  }
  if (is("ant-man")) {
    return { c1: "#e0332a", c2: "#444", label: "tiny", shrink: true };
  }
  if (is("wasp")) {
    return { c1: "#f1c40f", c2: "#111", label: "sting", spark: true };
  }
  if (is("captain marvel")) {
    return { c1: "#ff2d55", c2: "#ffd700", label: "cosmic", glow: true };
  }
  if (is("star-lord")) {
    return { c1: "#e74c3c", c2: "#f1c40f", label: "mixtape", spark: true };
  }
  if (is("loki")) {
    return { c1: "#2ecc71", c2: "#111", label: "trickster", spark: true };
  }
  if (is("deadpool")) {
    return { c1: "#e0115f", c2: "#1a1a1a", label: "mercy", flame: true };
  }
  if (is("groot")) {
    return { c1: "#8a5a2b", c2: "#4a7c3f", label: "tree", leaves: true };
  }
  if (is("batman")) {
    return { c1: "#111", c2: "#f5c518", label: "knight", bat: true };
  }
  if (is("flash")) {
    return { c1: "#e74c3c", c2: "#f1c40f", label: "speed", speed: true };
  }
  if (is("aquaman")) {
    return { c1: "#0e7bd6", c2: "#2ecc71", label: "ocean", waves: true };
  }
  if (is("joker")) {
    return { c1: "#8e44ad", c2: "#2ecc71", label: "chaos", spark: true };
  }
  if (is("superman")) {
    return { c1: "#3d7bff", c2: "#e74c3c", label: "hero", glow: true };
  }
  if (is("wolverine")) {
    return { c1: "#f39c12", c2: "#c0392b", label: "claw", slash: true };
  }

  // ---- Harry Potter ----
  if (is("harry potter") || is("harryporter") || is("harry")) {
    return { c1: "#f1c40f", c2: "#c0392b", label: "wizard", magic: true };
  }
  if (is("ron weasley")) {
    return { c1: "#e74c3c", c2: "#f1c40f", label: "weasley", spark: true };
  }
  if (is("hermione") || is("herminey")) {
    return { c1: "#e67e22", c2: "#f1c40f", label: "wizard", magic: true };
  }
  if (is("dumbledore") || is("dumbledor")) {
    return { c1: "#9b59b6", c2: "#f1c40f", label: "elder", stars: true };
  }
  if (is("snape") || is("snake") || is("severus")) {
    return { c1: "#2c3e50", c2: "#8e44ad", label: "potion", bubbles: true };
  }
  if (is("draco") || is("malfoy")) {
    return { c1: "#7f8c8d", c2: "#2ecc71", label: "slytherin", glitch: true };
  }
  if (is("sirius black")) {
    return { c1: "#2c3e50", c2: "#7f8c8d", label: "dog", bat: true };
  }
  if (is("ginny weasley")) {
    return { c1: "#e67e22", c2: "#c0392b", label: "ginger", flame: true };
  }
  if (is("hagrid") || is("rubeus")) {
    return { c1: "#8a5a2b", c2: "#5d4037", label: "keeper", leaves: true };
  }
  if (is("dobby")) {
    return { c1: "#bdc3c7", c2: "#f1c40f", label: "elf", spark: true };
  }
  if (is("sorting hat") || is("bolti_topi") || is("bolti")) {
    return { c1: "#8a5a2b", c2: "#c0392b", label: "sorting", talking: true };
  }

  // ---- Money Heist ----
  if (is("professor") || is("professsor")) {
    return { c1: "#e74c3c", c2: "#111", label: "heist", mask: true };
  }
  if (is("tokyo")) {
    return { c1: "#e74c3c", c2: "#1a1a2e", label: "tokyo", mask: true };
  }
  if (is("berlin")) {
    return { c1: "#c0392b", c2: "#111", label: "berlin", mask: true };
  }
  if (is("rio")) {
    return { c1: "#f39c12", c2: "#2c3e50", label: "rio", glow: true };
  }
  if (is("nairobi")) {
    return { c1: "#e67e22", c2: "#111", label: "nairobi", flame: true };
  }
  if (is("denver")) {
    return { c1: "#e74c3c", c2: "#2c3e50", label: "denver", mask: true };
  }
  if (is("helsinki")) {
    return { c1: "#d35400", c2: "#111", label: "helsinki", shake: true };
  }
  if (is("oslo")) {
    return { c1: "#7f8c8d", c2: "#111", label: "oslo", aura: true };
  }
  if (is("lisbon")) {
    return { c1: "#3498db", c2: "#111", label: "lisbon", waves: true };
  }
  if (is("palermo")) {
    return { c1: "#8e44ad", c2: "#111", label: "palermo", spark: true };
  }
  if (is("bogotá") || is("bogota")) {
    return { c1: "#16a085", c2: "#111", label: "bogota", leaves: true };
  }
  if (is("stockholm")) {
    return { c1: "#f1c40f", c2: "#2c3e50", label: "stockholm", stars: true };
  }

  // ---- Anime ----
  if (is("naruto")) {
    return { c1: "#f39c12", c2: "#e67e22", label: "ninja", chakra: true };
  }
  if (is("sasuke")) {
    return { c1: "#8e44ad", c2: "#2c3e50", label: "ninja", flame: true };
  }
  if (is("kakashi")) {
    return { c1: "#7f8c8d", c2: "#2c3e50", label: "copy", lightning: true };
  }
  if (is("itachi")) {
    return { c1: "#c0392b", c2: "#111", label: "sharingan", aura: true };
  }
  if (is("luffy") || is("monkey d")) {
    return { c1: "#2ecc71", c2: "#e74c3c", label: "pirate", rubber: true };
  }
  if (is("zoro") || is("roronoa")) {
    return { c1: "#2ecc71", c2: "#111", label: "swords", slash: true };
  }
  if (is("sanji")) {
    return { c1: "#f1c40f", c2: "#2c3e50", label: "cook", flame: true };
  }
  if (is("levi")) {
    return { c1: "#7f8c8d", c2: "#2c3e50", label: "scout", slash: true };
  }
  if (is("eren")) {
    return { c1: "#27ae60", c2: "#7f8c8d", label: "titan", smash: true };
  }
  if (is("goku")) {
    return { c1: "#f39c12", c2: "#3d7bff", label: "saiyan", aura: true };
  }

  // Fallback: derive a unique color pair + simple effect from the name hash so
  // ANY custom name still gets a distinct look.
  let h = 0;
  for (let i = 0; i < n.length; i += 1) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const c1 = `hsl(${hue} 80% 62%)`;
  const c2 = `hsl(${(hue + 60) % 360} 75% 55%)`;
  const effects = ["glow", "spark", "speed", "aura", "waves", "stars"];
  return { c1, c2, label: "default", [effects[h % effects.length]]: true };
}

export function avatarColor(value) {
  const text = String(value ?? "◆");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  const hue = hash % 360;
  return `hsl(${hue} 78% 62%)`;
}

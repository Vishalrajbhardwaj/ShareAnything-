// Generates fun character names for device identities — "Iron Man", "Doctor
// Strange", "Captain America", "Harry Potter", "Hermione Granger" ...
// so people can recognize each other on the radar with familiar, fun names.

const AVENGERS_NAMES = [
  // Primary Members & Allies
  "Iron Man",
  "Captain America",
  "Thor",
  "Hulk",
  "Black Widow",
  "Hawkeye",
  "Spider-Man",
  "Doctor Strange",
  "Black Panther",
  "Scarlet Witch",
  "Vision",
  "Falcon",
  "Winter Soldier",
  "War Machine",
  "Ant-Man",
  "Wasp",
  "Captain Marvel",
  "Star-Lord",
];

const HARRY_POTTER_NAMES = [
  // Key Characters
  "Harry Potter",
  "Ron Weasley",
  "Hermione Granger",
  "Albus Dumbledore",
  "Lord Voldemort",
  "Severus Snape",
  "Rubeus Hagrid",
  "Sirius Black",
  "Remus Lupin",
  "Draco Malfoy",
  "Neville Longbottom",
  "Luna Lovegood",
  "Ginny Weasley",
  "Minerva McGonagall",
  "Bellatrix Lestrange",
  "Dobby",
];

// Combined pool — every device gets a random character identity.
const CHARACTER_NAMES = [...AVENGERS_NAMES, ...HARRY_POTTER_NAMES];

// Small set of Avengers / Harry Potter themed emoji avatars
export const AVATARS = ['🤖', '🦸', '🛡️', '🔨', '🕷️', '⚡', '🔮', '🐍', '🪄', '🦉', '🦁', '🦅', '🦡', '🥷', '👾', '💥'];

export function randomIdentity() {
  const name = CHARACTER_NAMES[Math.floor(Math.random() * CHARACTER_NAMES.length)];
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  return { name, avatar };
}

// Generates fun character names for device identities — "Iron Man", "Doctor
// Strange", "Captain America", "Harry Potter", "Hermione Granger" ...
// so people can recognize each other on the radar with familiar, fun names.

// Import the character->image mapping so each device gets the matching avatar
// image (a proper character icon) instead of random emoji.
import { randomAvatar } from "./avatars.js";

const MARVEL_NAMES = [
  "Iron Man",
  "Captain America",
  "Thor",
  "Hulk",
  "Black Widow",
  "Hawkeye",
  "Doctor Strange",
  "Ant-Man",
  "Captain Marvel",
  "Loki",
  "Deadpool",
  "Groot",
  "Batman",
  "Flash",
  "Aquaman",
  "Joker",
  "Superman",
  "Wolverine",
];

const HARRY_POTTER_NAMES = [
  "Harry Potter",
  "Hermione Granger",
  "Albus Dumbledore",
  "Severus Snape",
  "Draco Malfoy",
  "Rubeus Hagrid",
  "Dobby",
  "Sorting Hat",
];

const MONEY_HEIST_NAMES = [
  "Professor",
  "Tokyo",
  "Berlin",
  "Denver",
  "Helsinki",
];

const ANIME_NAMES = [
  "Naruto Uzumaki",
  "Sasuke Uchiha",
  "Monkey D. Luffy",
  "Sanji",
  "Levi Ackerman",
  "Eren Yeager",
  "Goku",
];


// Combined pool — every device gets a random character identity.
const CHARACTER_NAMES = [...MARVEL_NAMES, ...HARRY_POTTER_NAMES, ...MONEY_HEIST_NAMES, ...ANIME_NAMES];

export function randomIdentity() {
  const name = CHARACTER_NAMES[Math.floor(Math.random() * CHARACTER_NAMES.length)];
  return {
    name,
    avatar: randomAvatar(name),
  };
}

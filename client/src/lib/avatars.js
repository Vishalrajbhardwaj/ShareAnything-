// Fun Avengers & Harry Potter themed emoji avatars — match the random device
// identities so everyone can pick a character that fits their vibe.
export const AVATARS = [
  '🤖',    // Iron Man / Robot
  '🦸',    // Superhero
  '🛡️',    // Captain America Shield
  '🔨',    // Thor Hammer
  '🕷️',    // Spider-Man
  '⚡',    // Lightning (Scarlet Witch / magic)
  '🔮',    // Crystal Ball (Doctor Strange)
  '🐍',    // Snake (Slytherin / Voldemort)
  '🪄',    // Magic Wand (Harry Potter)
  '🦉',    // Owl (Hedwig)
  '🦁',    // Lion (Gryffindor)
  '🦅',    // Eagle (Ravenclaw)
  '🦡',    // Badger (Hufflepuff)
  '🥷',    // Ninja (Black Widow / Hawkeye style)
  '👾',    // Alien (Star-Lord)
  '💥',    // Boom (Hulk / War Machine)
];

export function avatarColor(value) {
  const text = String(value ?? '◆');
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  const hue = hash % 360;
  return `hsl(${hue} 78% 62%)`;
}

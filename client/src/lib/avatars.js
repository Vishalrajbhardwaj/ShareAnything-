// Fun Indian cartoon-style character avatars — modern & colorful!
export const AVATARS = [
  '🧑‍🎤',  // Singer
  '🤡',    // Clown
  '👨‍🍳',  // Chef
  '👩‍🔬',  // Scientist
  '🧑‍🚀',  // Astronaut
  '🕵️',   // Detective
  '🧑‍🏫',  // Teacher
  '👨‍🎨',  // Artist
  '🧑‍🤝‍🧑', // People
  '🧑‍🦰',  // Person Red Hair
  '🥷',    // Ninja
  '🤴',    // Prince
  '👸',    // Princess
  '🧞',    // Genie
  '🧝',    // Elf
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

// Generates friendly Indian names for device identities — "Arjun", "Priya", "Vikram"
// so people can recognize each other on the radar with familiar, fun Indian names.

const INDIAN_NAMES = [
  // Male names
  "Arjun", "Vikram", "Rohan", "Aryan", "Karan", "Rahul", "Amit", "Suresh",
  "Rajesh", "Deepak", "Manish", "Anmol", "Varun", "Aditya", "Kunal",
  
  // Female names
  "Priya", "Ananya", "Kavya", "Ishita", "Neha", "Pooja", "Divya", "Riya",
  "Shreya", "Anjali", "Meera", "Tanvi", "Aarushi", "Sneha", "Nandini",
  
  // Modern / unisex names
  "Aarav", "Vivaan", "Vihaan", "Advik", "Aadhya", "Anaya", "Arnav", "Ishaan",
  "Dhruv", "Reyansh", "Shaurya", "Tanisha"
];

const INDIAN_SURNAMES = [
  "", // Some names without surname for variety
  "Sharma", "Patel", "Singh", "Reddy", "Gupta", "Verma", "Joshi", "Nair",
  "Mehta", "Desai", "Iyer", "Rao", "Chopra", "Malhotra", "Kumar", "Das",
  "Sen", "Banerjee", "Thakur", "Mishra"
];

// Small set of Indian wildlife / cultural emoji avatars
export const AVATARS = ['🦚', '🐅', '🐘', '🦁', '🐒', '🦊', '🐱', '🐼'];

export function randomIdentity() {
  const firstName = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];
  const surname = INDIAN_SURNAMES[Math.floor(Math.random() * INDIAN_SURNAMES.length)];
  const name = surname ? `${firstName} ${surname}` : firstName;
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  return { name, avatar };
}

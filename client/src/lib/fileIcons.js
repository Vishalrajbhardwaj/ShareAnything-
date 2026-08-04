const ICONS = {
  jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", webp: "🖼️", svg: "🖼️",
  mp4: "🎬", mov: "🎬", mkv: "🎬", avi: "🎬", webm: "🎬",
  mp3: "🎵", wav: "🎵", flac: "🎵", m4a: "🎵",
  pdf: "📕", doc: "📄", docx: "📄", txt: "📄", md: "📄",
  xls: "📊", xlsx: "📊", csv: "📊",
  ppt: "📽️", pptx: "📽️",
  zip: "🗜️", rar: "🗜️", "7z": "🗜️", tar: "🗜️", gz: "🗜️",
  apk: "📦", exe: "📦", dmg: "📦",
};

export function iconForFile(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  return ICONS[ext] || "📁";
}

export const CHAMPION_EDITOR = {
  appOn: true,
  webOn: true,
  headline: "Champion of the Month",
  subline: "July 2026",
  description: "Down 18 kg in five months while reversing her prediabetes — logged every single day.",
  footer: "Coached by Anita Rao",
  showPhoto: true,
  photoPosition: "top",
  photoSource: "profile",
  design: "gold",
};

export const CHAMPION_POSITIONS = [
  { id: "top", label: "Top centre", note: "Circular avatar above the name" },
  { id: "left", label: "Left inset", note: "Square photo beside the copy" },
  { id: "bleed", label: "Full bleed", note: "Photo fills the card, text overlaid" },
  { id: "none", label: "No photo", note: "Typographic card only" },
];

export const CHAMPION_SOURCES = [
  { id: "profile", label: "Client profile photo", note: "Pulled automatically from their account" },
  { id: "progress", label: "Latest progress photo", note: "Most recent 180-view image" },
  { id: "upload", label: "Upload manually", note: "Choose a specific image per card" },
];

export const CHAMPION_DESIGNS = [
  { id: "gold", label: "Gold laurel card", icon: "🏆" },
  { id: "navy", label: "Minimal navy card", icon: "🏆" },
  { id: "confetti", label: "Confetti celebration", icon: "🏆" },
  { id: "program", label: "Program-tinted card", icon: "🏆" },
];

export const CHAMPION_GALLERY_OWNERS = ["All owners", "Anita Rao", "Ishita Sen", "Rohan Das", "Priya Nair", "Admin"];

export const CHAMPION_GALLERY = [
  { id: "ch-g1", title: "July champion — Madhupriya", owner: "Anita Rao", date: "12 Jul 2026", size: "480 KB", versions: 3, live: true },
  { id: "ch-g2", title: "June champion — Bikash", owner: "Ishita Sen", date: "04 Jun 2026", size: "312 KB", versions: 2, live: false },
  { id: "ch-g3", title: "May champion — Hetu", owner: "Rohan Das", date: "28 May 2026", size: "402 KB", versions: 3, live: false },
  { id: "ch-g4", title: "April champion — coach signed", owner: "Priya Nair", date: "19 Apr 2026", size: "388 KB", versions: 2, live: false },
];

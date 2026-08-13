export const RX_BANK_PROTOCOLS = [
  {
    id: "rx-gut-reset",
    title: "Gut Reset · Day 1-7",
    live: true,
    pointers: [
      "Warm lemon water on waking (500 ml)",
      "No dairy, gluten or refined sugar",
      "1 cup bone broth or veg stock at lunch",
      "Cooked, easily digestible dinner before 7 PM",
      "Probiotic-rich food once daily (curd / kanji)",
      "10-min walk after every meal",
    ],
  },
  {
    id: "rx-water-fast",
    title: "Water Fasting · 24h",
    live: true,
    pointers: [
      "Only water for the full 24h window",
      "Target 3–4 L water through the day",
      "No tea, coffee or supplements unless prescribed",
      "Rest and avoid strenuous exercise",
      "Break fast gently with warm lemon water",
      "Light cooked food 30 min after breaking fast",
    ],
  },
  {
    id: "rx-if-16-8",
    title: "Intermittent Fasting 16:8",
    live: true,
    pointers: [
      "Eating window 12 PM – 8 PM",
      "Black coffee / green tea allowed while fasting",
      "Protein-forward first meal",
      "No snacking after 8 PM",
      "Hydrate well during fasting hours",
    ],
  },
  {
    id: "rx-liver-detox",
    title: "Liver Detox · Day 1-5",
    live: true,
    pointers: [
      "Beetroot-carrot-amla juice each morning",
      "No fried or processed food",
      "Warm lemon water on waking",
      "Light dinner before 7 PM",
      "10-min walk after meals",
    ],
  },
];

export function rxProtocolExcerpt(pointers = []) {
  if (!pointers.length) return "";
  const joined = pointers.slice(0, 2).join(" · ");
  return pointers.length > 2 ? `${joined}…` : joined;
}

export function parsePointersFromText(text = "") {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

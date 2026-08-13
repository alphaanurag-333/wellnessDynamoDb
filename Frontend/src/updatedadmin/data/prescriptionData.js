export const PROTOCOL_POOL = [
  {
    id: "water-fast",
    title: "Water Fasting · 24h",
    points: [
      "Only plain water for 24 hours — no tea, coffee or supplements unless prescribed.",
      "Rest and avoid strenuous exercise.",
      "Break fast gently with warm lemon water, then light cooked food after 30 min.",
    ],
  },
  {
    id: "if-16-8",
    title: "Intermittent Fasting 16:8",
    points: [
      "Eating window 12 PM – 8 PM only.",
      "Black coffee or herbal tea allowed during fast.",
      "Hydrate well outside the eating window.",
      "Break fast with protein + fibre, not sugar.",
    ],
  },
  {
    id: "liver-detox",
    title: "Liver Detox · Day 1-5",
    points: [
      "Warm lemon water on waking.",
      "No alcohol, fried food or refined sugar.",
      "Beetroot / carrot juice once daily.",
      "Light dinner before 7 PM.",
      "10-min walk after meals.",
    ],
  },
  {
    id: "alkaline-reset",
    title: "Alkaline Reset · Day 1-3",
    points: [
      "Green smoothie for breakfast.",
      "Salad + steamed veg for lunch.",
      "No animal protein or dairy.",
      "Coconut water mid-afternoon.",
      "Early bedtime before 10 PM.",
    ],
  },
];

export const PRESCRIPTION_SECTIONS = [
  {
    id: "gut-reset",
    title: "Gut Reset · Day 1-7",
    points: [
      "Warm lemon water on waking (500 ml)",
      "No dairy, gluten or refined sugar",
      "1 cup bone broth or veg stock at lunch",
      "Cooked, easily digestible dinner before 7 PM",
      "Probiotic-rich food once daily (curd / kanji)",
      "10-min walk after every meal",
    ],
  },
];

export const PRESCRIPTION_HISTORY = [
  {
    id: "hist-current",
    date: null,
    dateLabel: "Not saved yet",
    status: "current",
    unsaved: true,
    title: "Gut Reset · Day 1-7",
    points: 6,
    author: "Admin",
    sections: PRESCRIPTION_SECTIONS,
    canRestore: false,
  },
  {
    id: "hist-1",
    date: "2026-08-13",
    dateLabel: "13 Aug 2026",
    status: "replaced",
    title: "Gut Reset · Day 1-7",
    points: 8,
    author: "Admin",
    sections: [
      {
        id: "gut-reset",
        title: "Gut Reset · Day 1-7",
        points: [
          "Warm lemon water on waking (500 ml)",
          "No dairy, gluten or refined sugar",
          "1 cup bone broth or veg stock at lunch",
          "Cooked, easily digestible dinner before 7 PM",
          "Probiotic-rich food once daily (curd / kanji)",
          "10-min walk after every meal",
          "Herbal tea after dinner",
          "No cold drinks with meals",
        ],
      },
    ],
    canRestore: true,
  },
  {
    id: "hist-2",
    date: "2026-07-06",
    dateLabel: "06 Jul 2026",
    status: "replaced",
    title: "Intermittent Fasting 16:8 · Liver Detox · Day 1-5",
    points: 10,
    author: "Anita Rao",
    sections: [
      {
        id: "if-16-8",
        title: "Intermittent Fasting 16:8",
        points: PROTOCOL_POOL[1].points,
      },
      {
        id: "liver-detox",
        title: "Liver Detox · Day 1-5",
        points: PROTOCOL_POOL[2].points,
      },
    ],
    canRestore: true,
  },
  {
    id: "hist-3",
    date: "2026-06-22",
    dateLabel: "22 Jun 2026",
    status: "replaced",
    title: "Alkaline Reset · Day 1-3",
    points: 5,
    author: "Ishita Sen (AWC)",
    sections: [
      {
        id: "alkaline-reset",
        title: "Alkaline Reset · Day 1-3",
        points: PROTOCOL_POOL[3].points,
      },
    ],
    canRestore: true,
  },
];

export function totalPoints(sections) {
  return sections.reduce((sum, section) => sum + section.points.length, 0);
}

export function sectionsSummary(sections) {
  return sections.map((s) => s.title).join(" · ");
}

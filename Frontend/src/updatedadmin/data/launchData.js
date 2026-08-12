export const LAUNCH_DOMAINS = [
  {
    id: "gut",
    num: 1,
    title: "Gut Health",
    questions: 16,
    score: 1158,
    max: 1600,
    pct: 72,
    items: [
      { q: "How often do you experience bloating after meals?", reply: "Very rarely", rating: "good", score: 80, weight: 100 },
      { q: "How regular are your bowel movements?", reply: "Sometimes", rating: "good", score: 65, weight: 100 },
      { q: "Do you feel discomfort or acidity after eating?", reply: "Almost never", rating: "excellent", score: 90, weight: 100 },
      { q: "How often do you eat fermented foods (curd, kimchi, etc.)?", reply: "Daily", rating: "average", score: 55, weight: 100 },
    ],
  },
  { id: "immunity", num: 2, title: "Immunity", questions: 16, score: 1158, max: 1600, pct: 72, items: [] },
  { id: "physical", num: 3, title: "Physical Health", questions: 16, score: 1158, max: 1600, pct: 72, items: [] },
  { id: "mental", num: 4, title: "Mental Health", questions: 16, score: 1158, max: 1600, pct: 72, items: [] },
  { id: "psych", num: 5, title: "Psychological Health", questions: 16, score: 1158, max: 1600, pct: 72, items: [] },
];

export const LAUNCH_LIFESTYLE = {
  finalScore: 7.2,
  points: 5790,
  maxPoints: 8000,
  attempt: 5,
  history: [
    { attempt: 4, score: 7.2, points: "5790 / 8000 points", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 3, score: 7.2, points: "5790 / 8000 points", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 2, score: 7.4, points: "74 / 100 points", role: "COACH", by: "Anita Rao", date: "04 Jul 2026" },
    { attempt: 1, score: 6.2, points: "62 / 100 points", role: "COACH", by: "Anita Rao", date: "12 Jun 2026" },
  ],
};

export const LAUNCH_PRAKRITI = {
  dominant: "Pitta",
  elements: "Fire + Water",
  attempt: 3,
  scores: { vata: 4, pitta: 6, kapha: 1 },
  history: [
    { attempt: 2, type: "Pitta", scores: "V 4 · P 6 · K 1", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 1, type: "Vāta-Pitta", scores: "V 4 · P 6 · K 1", role: "COACH", by: "Anita Rao", date: "12 Jun 2026" },
  ],
  doshas: [
    {
      id: "vata",
      letter: "V",
      name: "Vāta",
      sub: "AIR + SPACE",
      tone: "blue",
      score: 4,
      statements: [
        { text: "I would play on the ground rather than watch TV.", checked: true },
        { text: "My thoughts jump from one idea to another.", checked: true },
        { text: "I speak quickly and love talking.", checked: true },
        { text: "My mood can change quickly.", checked: true },
        { text: "I don't get tense during exams.", checked: false },
      ],
    },
    {
      id: "pitta",
      letter: "P",
      name: "Pitta",
      sub: "FIRE + WATER",
      tone: "orange",
      score: 6,
      statements: [
        { text: "I love to be captain of a team.", checked: true },
        { text: "I can focus really well.", checked: true },
        { text: "I get very hungry on time!", checked: true },
        { text: "I speak clearly and with confidence.", checked: true },
        { text: "I enjoy challenges and solving problems.", checked: true },
        { text: "I have strong energy and keep going.", checked: true },
      ],
    },
    {
      id: "kapha",
      letter: "K",
      name: "Kapha",
      sub: "EARTH + WATER",
      tone: "green",
      score: 1,
      statements: [
        { text: "I love sleeping and need more rest.", checked: true },
        { text: "I don't get tense during exams.", checked: false },
        { text: "I am calm and steady most of the time.", checked: false },
      ],
    },
  ],
  recommendations: [
    "Favour warm, cooked, moist and lightly oily meals to balance Vāta dryness.",
    "Keep regular meal and sleep timings — routine steadies an airy constitution.",
    "Add grounding foods: whole grains, root vegetables, ghee, soaked nuts.",
    "Stay hydrated with warm water and herbal teas (ginger, tulsi, cinnamon).",
    "Practise calming movement — gentle yoga, walking, and daily oil self-massage.",
  ],
  avoid: [
    "Cold, raw and dry foods — salads, crackers, chips, iced drinks.",
    "Excess caffeine and carbonated / fizzy drinks.",
    "Skipping meals or eating at irregular times.",
    "Very bitter, astringent or overly spicy dishes in large amounts.",
    "Excess dry beans and lentils without adequate oil or spices.",
  ],
};

export const RATING_OPTIONS = [
  { id: "excellent", label: "Excellent", tone: "excellent" },
  { id: "good", label: "Good", tone: "good" },
  { id: "average", label: "Average", tone: "average" },
  { id: "poor", label: "Poor", tone: "poor" },
];

export const SCHEDULE_DATES = [
  { id: "tue", day: "TUE", date: "04" },
  { id: "wed", day: "WED", date: "05" },
  { id: "thu", day: "THU", date: "06" },
  { id: "fri", day: "FRI", date: "07" },
  { id: "sat", day: "SAT", date: "08" },
];

export const HOLD_OPTIONS = ["6 hours", "12 hours", "24 hours", "48 hours", "7 days"];

export const DURATION_OPTIONS = [45, 60, 90];

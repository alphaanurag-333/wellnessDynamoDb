const REPLIES = [
  "Very rarely", "Sometimes", "Almost never", "Daily", "Moderately", "Rarely",
  "Most days", "Occasionally", "Not sure", "Quite often", "Often", "A few times a week",
];

const RATINGS = ["good", "excellent", "average", "poor", "good", "excellent", "average", "good", "good", "excellent", "average", "good"];
const SCORES = [80, 65, 90, 55, 72, 88, 60, 78, 68, 92, 58, 62, 75, 85, 70, 82];

function buildItems(questions) {
  return questions.map((q, i) => ({
    q,
    reply: REPLIES[i % REPLIES.length],
    rating: RATINGS[i % RATINGS.length],
    score: SCORES[i % SCORES.length],
    weight: 100,
  }));
}

const GUT_QUESTIONS = [
  "How often do you experience bloating after meals?",
  "How regular are your bowel movements?",
  "Do you feel discomfort or acidity after eating?",
  "How often do you eat fermented foods (curd, kimchi, etc.)?",
  "How much fibre-rich food is in your daily diet?",
  "Do you experience frequent gas or flatulence?",
  "How often do you feel heaviness after a meal?",
  "Do you take probiotics or gut supplements?",
  "How well hydrated do you stay through the day?",
  "Do you experience food intolerances or sensitivities?",
  "How often do you eat processed or packaged foods?",
  "How would you rate your overall digestive comfort?",
  "Do you chew your food thoroughly and eat mindfully?",
  "How often do you skip meals or eat at irregular times?",
  "Do you experience cravings for sugary or fried foods?",
  "How well do you tolerate dairy products?",
];

const IMMUNITY_QUESTIONS = [
  "How often do you fall sick in a year?",
  "How quickly do you recover from common illnesses?",
  "How often do you get seasonal infections?",
  "Do you take vitamin C, D or zinc regularly?",
  "How would you rate your energy when fighting off illness?",
  "How often do you experience allergies or hay fever?",
  "Do you get frequent sore throats or coughs?",
  "How well do you sleep during periods of illness?",
  "Do you wash hands and maintain hygiene consistently?",
  "How often do you spend time outdoors in fresh air?",
  "Do you manage stress levels effectively?",
  "How would you rate your overall immune resilience?",
  "Do you avoid smoking and excessive alcohol?",
  "How often do you include antioxidant-rich foods?",
  "Do you take adequate rest when feeling unwell?",
  "How quickly do wounds or cuts heal for you?",
];

const PHYSICAL_QUESTIONS = [
  "How many days a week do you exercise?",
  "How would you rate your cardiovascular fitness?",
  "How would you rate your muscular strength?",
  "How flexible are you?",
  "Do you experience joint pain or stiffness?",
  "How is your balance and coordination?",
  "How many hours do you sit per day?",
  "Do you take regular breaks from sitting?",
  "How often do you stretch or do mobility work?",
  "How is your posture through the day?",
  "Do you experience frequent physical fatigue?",
  "How well do you maintain a healthy weight?",
  "How often do you engage in strength training?",
  "Do you get enough restorative sleep for recovery?",
  "How would you rate your overall physical stamina?",
  "Do you listen to your body and rest when needed?",
];

const MENTAL_QUESTIONS = [
  "How would you rate your daily stress level?",
  "How well do you manage anxiety or worry?",
  "How often do you feel mentally overwhelmed?",
  "How would you rate your ability to focus?",
  "Do you practice any relaxation or mindfulness?",
  "How well do you handle unexpected changes?",
  "How often do you feel irritable or on edge?",
  "How would you rate your emotional stability?",
  "Do you have healthy outlets for stress?",
  "How well do you sleep when stressed?",
  "How often do you feel mentally refreshed after waking?",
  "Do you take time for hobbies and recreation?",
  "How would you rate your work-life balance?",
  "How often do you feel positive and optimistic?",
  "Do you seek support when feeling low?",
  "How well do you manage negative self-talk?",
];

const PSYCH_QUESTIONS = [
  "How would you rate your overall sense of purpose?",
  "How connected do you feel to others socially?",
  "How often do you feel lonely or isolated?",
  "How would you rate your self-esteem?",
  "Do you feel understood by people close to you?",
  "How well do you express your emotions?",
  "How often do you engage in meaningful conversations?",
  "Do you feel satisfied with your personal relationships?",
  "How would you rate your resilience after setbacks?",
  "Do you set and pursue personal goals?",
  "How often do you feel a sense of accomplishment?",
  "How well do you cope with criticism or rejection?",
  "Do you practice self-compassion?",
  "How would you rate your overall life satisfaction?",
  "How well do you manage negative self-talk?",
  "Do you feel aligned with your personal values?",
];

export const LAUNCH_DOMAINS = [
  {
    id: "gut",
    num: 1,
    title: "Gut Health",
    questions: 16,
    score: 1108,
    max: 1600,
    pct: 69,
    items: buildItems(GUT_QUESTIONS),
  },
  {
    id: "immunity",
    num: 2,
    title: "Immunity",
    questions: 16,
    score: 1158,
    max: 1600,
    pct: 72,
    items: buildItems(IMMUNITY_QUESTIONS),
  },
  {
    id: "physical",
    num: 3,
    title: "Physical Health",
    questions: 16,
    score: 1158,
    max: 1600,
    pct: 72,
    items: buildItems(PHYSICAL_QUESTIONS),
  },
  {
    id: "mental",
    num: 4,
    title: "Mental Health",
    questions: 16,
    score: 1158,
    max: 1600,
    pct: 72,
    items: buildItems(MENTAL_QUESTIONS),
  },
  {
    id: "psych",
    num: 5,
    title: "Psychological Health",
    questions: 16,
    score: 1158,
    max: 1600,
    pct: 72,
    items: buildItems(PSYCH_QUESTIONS),
  },
];

export const LAUNCH_LIFESTYLE = {
  finalScore: 7.2,
  points: 5740,
  maxPoints: 8000,
  attempt: 6,
  history: [
    { attempt: 5, score: 7.1, points: "5685 / 8000 points", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 4, score: 7.2, points: "5790 / 8000 points", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 3, score: 7.2, points: "5790 / 8000 points", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 2, score: 7.4, points: "5920 / 8000 points", role: "COACH", by: "Anita Rao", date: "04 Jul 2026" },
    { attempt: 1, score: 6.2, points: "4960 / 8000 points", role: "COACH", by: "Anita Rao", date: "12 Jun 2026" },
  ],
};

export const LAUNCH_PRAKRITI = {
  dominant: "Pitta",
  elements: "Fire + Water",
  attempt: 6,
  scores: { vata: 4, pitta: 6, kapha: 1 },
  history: [
    { attempt: 5, type: "Pitta", scores: "V 4 · P 6 · K 1", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 4, type: "Pitta", scores: "V 4 · P 6 · K 1", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
    { attempt: 3, type: "Pitta", scores: "V 4 · P 6 · K 1", role: "ADMIN", by: "Admin desk", date: "22 Jul 2026" },
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
        { text: "I get cold easily.", checked: false },
        { text: "My thoughts jump from one idea to another.", checked: true },
        { text: "I speak quickly and love talking.", checked: true },
        { text: "I often forget to eat or feel hungry at odd times.", checked: false },
        { text: "My sleep is light and sometimes I wake up at night.", checked: false },
        { text: "I love doing new things and get bored easily.", checked: false },
        { text: "My mood can change quickly.", checked: true },
        { text: "I get tired easily but also recharge fast.", checked: false },
        { text: "I am thin and my hands and feet are often cold.", checked: false },
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
        { text: "I feel warm or get hot easily.", checked: false },
        { text: "I can focus really well.", checked: true },
        { text: "I get very hungry on time!", checked: true },
        { text: "I speak clearly and with confidence.", checked: true },
        { text: "I sleep okay, but not too long.", checked: false },
        { text: "I enjoy challenges and solving problems.", checked: true },
        { text: "I can get angry or irritated quickly.", checked: false },
        { text: "I have strong energy and keep going.", checked: true },
        { text: "I have a medium body and feel warm.", checked: false },
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
        { text: "I don’t get tense during exams.", checked: false },
        { text: "I often feel cold, but my body is strong.", checked: false },
        { text: "I take time to learn but remember everything.", checked: false },
        { text: "I speak slowly and softly.", checked: false },
        { text: "I don’t feel very hungry often.", checked: false },
        { text: "I love sleeping and need more rest.", checked: true },
        { text: "I like familiar things and routines.", checked: false },
        { text: "I stay calm and don’t get upset easily.", checked: false },
        { text: "I have steady energy that lasts long.", checked: false },
        { text: "I have a bigger or stronger body.", checked: false },
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

export const RATING_SCORES = {
  excellent: 100,
  good: 75,
  average: 50,
  poor: 25,
};

export const SCORING_REFERENCE = [
  {
    id: "excellent",
    label: "EXCELLENT",
    score: 100,
    tone: "excellent",
    desc: "Consistent and self-driven — reinforce the habit, no change needed.",
  },
  {
    id: "good",
    label: "GOOD",
    score: 75,
    tone: "good",
    desc: "Mostly on track — one small nudge on the weaker days.",
  },
  {
    id: "average",
    label: "AVERAGE",
    score: 50,
    tone: "average",
    desc: "Inconsistent — set a single specific target for the week.",
  },
  {
    id: "poor",
    label: "POOR",
    score: 25,
    tone: "poor",
    desc: "Needs intervention — protocol change or a call this week.",
  },
];

export function suggestRating(question, reply) {
  const r = (reply || "").toLowerCase().trim();
  const symptom = /experience|pain|stress|bloated|sick|anxious|overwhelmed|fatigue|craving|discomfort|gas|irritable|lonely|tense/i.test(question);

  if (symptom) {
    if (/never|very rarely|almost never|rarely/.test(r)) return "excellent";
    if (/sometimes|occasionally|not sure|moderately/.test(r)) return "good";
    if (/often|quite often|a few times/.test(r)) return "average";
    return "poor";
  }

  if (/daily|most days|very well|excellent|quite often|regularly/.test(r)) return "excellent";
  if (/sometimes|occasionally|moderately|good/.test(r)) return "good";
  if (/rarely|not sure|average/.test(r)) return "average";
  return "poor";
}

export const SCHEDULE_DATES = [
  { id: "tue", day: "TUE", date: "04" },
  { id: "wed", day: "WED", date: "05" },
  { id: "thu", day: "THU", date: "06" },
  { id: "fri", day: "FRI", date: "07" },
  { id: "sat", day: "SAT", date: "08" },
];

export const HOLD_OPTIONS = ["6 hours", "12 hours", "24 hours", "48 hours", "7 days"];

export const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90];

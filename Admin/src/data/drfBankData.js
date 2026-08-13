export const DRF_FORM_SECTIONS = [
  {
    id: "sec-meal",
    name: "Meal Tracking",
    weight: 20,
    live: true,
    fixed: false,
    questions: [
      { id: "q-salad", name: "Salad", points: 10, enabled: true, fixed: false },
      { id: "q-protein", name: "Protein", points: 10, enabled: true, fixed: false },
      { id: "q-protein-qty", name: "Protein quantity", points: 10, enabled: true, fixed: false },
      { id: "q-water", name: "Water", points: 10, enabled: true, fixed: false },
      { id: "q-juice", name: "Functional juice", points: 10, enabled: true, fixed: false },
      { id: "q-junk", name: "No junk food / refined oil", points: 10, enabled: true, fixed: false },
    ],
  },
  {
    id: "sec-nutrition",
    name: "Nutritions",
    weight: 35,
    live: true,
    fixed: false,
    questions: [
      { id: "q-dosage", name: "Dosages taken as prescribed", points: 10, enabled: true, fixed: false },
      { id: "q-qty", name: "Correct quantity (Qty)", points: 10, enabled: true, fixed: false },
    ],
  },
  {
    id: "sec-physical",
    name: "Physical Activities",
    weight: 25,
    live: true,
    fixed: false,
    questions: [
      { id: "q-steps", name: "Steps goal met", points: 10, enabled: true, fixed: false },
      { id: "q-workout", name: "Workout completed", points: 10, enabled: true, fixed: false },
      { id: "q-yoga", name: "Yoga", points: 10, enabled: true, fixed: false },
    ],
  },
  {
    id: "sec-mindfulness",
    name: "Mindfulness & Mood",
    weight: 20,
    live: true,
    fixed: false,
    questions: [
      { id: "q-meditation", name: "Meditation / breathing", points: 10, enabled: true, fixed: false },
      { id: "q-gratitude", name: "Gratitude / journalling", points: 10, enabled: true, fixed: false },
      { id: "q-mood", name: "Overall mood was positive", points: 10, enabled: true, fixed: false },
    ],
  },
];

export function drfSectionPointsTotal(section) {
  return (section.questions ?? []).reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
}

export function drfLiveQuestionCount(sections) {
  return sections.reduce(
    (sum, section) => sum + section.questions.filter((entry) => entry.enabled).length,
    0,
  );
}

export function drfTotalQuestionCount(sections) {
  return sections.reduce((sum, section) => sum + section.questions.length, 0);
}

export function drfWeightTotal(sections) {
  return sections.reduce((sum, section) => sum + (Number(section.weight) || 0), 0);
}

export function drfRemainingWeight(sections) {
  return Math.max(0, 100 - drfWeightTotal(sections));
}

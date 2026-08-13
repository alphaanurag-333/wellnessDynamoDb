export const REFLECTION_SUMMARY = {
  todayPoints: 140,
  maxPoints: 200,
  score: 7.0,
  maxScore: 10,
  bedtime: "22:30",
};

export const REFLECTION_SECTIONS = [
  {
    id: "meal",
    title: "Meal Tracking",
    weight: 20,
    locked: true,
    expanded: true,
    questions: [
      { id: "m1", text: "Salad", score: 7, max: 10 },
      { id: "m2", text: "Protein", score: 7, max: 10 },
      { id: "m3", text: "Protein Quantity", score: 7, max: 10 },
      { id: "m4", text: "Water", score: 7, max: 10 },
      { id: "m5", text: "Functional Juice", score: 7, max: 10 },
      { id: "m6", text: "Not having any junk food / refined oil", score: 7, max: 10 },
    ],
  },
  {
    id: "nutritions",
    title: "Nutritions",
    weight: 35,
    locked: false,
    expanded: true,
    questions: [
      { id: "n1", text: "Dosages taken as prescribed", score: 7, max: 10 },
      { id: "n2", text: "Correct quantity (Qty)", score: 7, max: 10 },
    ],
  },
  {
    id: "physical",
    title: "Physical Activities",
    weight: 25,
    locked: true,
    expanded: true,
    questions: [
      { id: "p1", text: "Steps goal met", score: 7, max: 10 },
      { id: "p2", text: "Workout completed", score: 7, max: 10 },
      { id: "p3", text: "Yoga", score: 7, max: 10 },
    ],
  },
  {
    id: "mindfulness",
    title: "Mindfulness & Mood",
    weight: 20,
    locked: false,
    expanded: true,
    questions: [
      { id: "mind1", text: "Meditation / breathing", score: 7, max: 10 },
      { id: "mind2", text: "Overall mood was positive", score: 7, max: 10 },
    ],
  },
];

export function sectionPoints(section) {
  const earned = section.questions.reduce((sum, q) => sum + Number(q.score || 0), 0);
  const max = section.questions.reduce((sum, q) => sum + Number(q.max || 10), 0);
  return {
    earned,
    max,
    label: `${earned} / ${max}`,
  };
}

export function totalWeightage(sections) {
  return sections.reduce((sum, s) => sum + Number(s.weight || 0), 0);
}

export function formatBedtime(value) {
  if (!value) return "10:30 PM";
  const [h, m] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m} ${suffix}`;
}

require("dotenv").config();

const {
  createWellnessPrescriptionCatalog,
  getWellnessPrescriptionCatalogByPrescriptionId,
} = require("../models/wellnessPrescriptionCatalogModel");

const PRESCRIPTIONS = [
  {
    prescriptionId: "morning-routine-vata",
    title: "Morning Routine for Vata Balance",
    category: "Ayurveda",
    status: "active",
    sequence: 1,
    points: [
      "Wake before 6:30 AM and drink warm water with a pinch of ginger.",
      "Practice 10 minutes of gentle stretching or sun salutations.",
      "Eat a warm, cooked breakfast within one hour of waking.",
      "Avoid cold beverages and raw foods in the first half of the day.",
    ],
  },
  {
    prescriptionId: "pitta-cooling-diet",
    title: "Pitta Cooling Diet Guidelines",
    category: "Diet & Nutrition",
    status: "active",
    sequence: 2,
    points: [
      "Favor cooling foods: cucumber, coconut, leafy greens, and sweet fruits.",
      "Reduce spicy, fried, and overly salty meals during peak afternoon heat.",
      "Eat meals at regular times; avoid skipping lunch.",
      "Drink room-temperature water; limit caffeine after 2 PM.",
    ],
  },
  {
    prescriptionId: "kapha-energizing-lifestyle",
    title: "Kapha Energizing Lifestyle",
    category: "Lifestyle",
    status: "active",
    sequence: 3,
    points: [
      "Start the day with brisk walking or light cardio for 20–30 minutes.",
      "Use warming spices such as black pepper, ginger, and turmeric in meals.",
      "Keep daytime naps under 20 minutes or avoid them entirely.",
      "Declutter your workspace to support mental lightness and motivation.",
    ],
  },
  {
    prescriptionId: "digestive-fire-support",
    title: "Digestive Fire (Agni) Support",
    category: "Ayurveda",
    status: "active",
    sequence: 4,
    points: [
      "Eat your largest meal at midday when digestion is strongest.",
      "Chew each bite thoroughly and avoid screens while eating.",
      "Take a short walk for 10 minutes after lunch.",
      "Sip warm cumin or fennel tea after meals if you feel bloated.",
    ],
  },
  {
    prescriptionId: "quality-sleep-protocol",
    title: "Quality Sleep Protocol",
    category: "Sleep & Rest",
    status: "active",
    sequence: 5,
    points: [
      "Dim lights and stop screen use 60 minutes before bed.",
      "Keep bedroom temperature cool and consistent each night.",
      "Practice 5 minutes of slow breathing or body scan before sleep.",
      "Maintain a fixed wake time, including on weekends.",
    ],
  },
  {
    prescriptionId: "daily-movement-plan",
    title: "Daily Movement Plan",
    category: "Exercise & Movement",
    status: "active",
    sequence: 6,
    points: [
      "Aim for 8,000–10,000 steps spread across the day.",
      "Include 2 strength sessions per week focusing on major muscle groups.",
      "Stretch hips, shoulders, and spine for 5 minutes after long sitting.",
      "Take a movement break every 60–90 minutes during work hours.",
    ],
  },
  {
    prescriptionId: "stress-resilience-practices",
    title: "Stress Resilience Practices",
    category: "Stress & Mental Health",
    status: "active",
    sequence: 7,
    points: [
      "Practice box breathing (4-4-4-4) for 3 minutes when stress rises.",
      "Journal one gratitude note and one priority each morning.",
      "Limit news and social media to two fixed windows per day.",
      "Schedule one screen-free restorative activity weekly.",
    ],
  },
  {
    prescriptionId: "hydration-electrolyte-balance",
    title: "Hydration & Electrolyte Balance",
    category: "Diet & Nutrition",
    status: "active",
    sequence: 8,
    points: [
      "Drink water consistently; target roughly 2–2.5 liters unless advised otherwise.",
      "Add electrolytes after intense workouts or heavy sweating.",
      "Include water-rich foods such as citrus, melons, and soups.",
      "Monitor urine color as a simple hydration check.",
    ],
  },
  {
    prescriptionId: "post-meal-walk-routine",
    title: "Post-Meal Walk Routine",
    category: "Lifestyle",
    status: "active",
    sequence: 9,
    points: [
      "Walk at a comfortable pace for 10–15 minutes after main meals.",
      "Keep posture upright and breathe through the nose when possible.",
      "Avoid vigorous exercise immediately after eating.",
      "Track consistency rather than speed or distance.",
    ],
  },
  {
    prescriptionId: "evening-wind-down",
    title: "Evening Wind-Down Routine",
    category: "Sleep & Rest",
    status: "inactive",
    sequence: 10,
    points: [
      "Finish dinner at least 2–3 hours before bedtime.",
      "Use warm lighting and calming music in the last hour of the day.",
      "Prepare clothes and essentials for the next morning to reduce mental load.",
      "Practice light reading or meditation instead of stimulating content.",
    ],
  },
];

async function main() {
  console.log("Seeding WellnessPrescriptionCatalog...\n");
  let created = 0;
  let skipped = 0;

  for (const prescription of PRESCRIPTIONS) {
    const existing = await getWellnessPrescriptionCatalogByPrescriptionId(
      prescription.prescriptionId
    );
    if (existing) {
      console.log(`  - skipped (exists): ${prescription.title}`);
      skipped++;
      continue;
    }

    await createWellnessPrescriptionCatalog({
      ...prescription,
      createdBy: "seed-script",
    });
    console.log(`  ✓ ${prescription.title}`);
    created++;
  }

  console.log(`\nWellnessPrescriptionCatalog: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});

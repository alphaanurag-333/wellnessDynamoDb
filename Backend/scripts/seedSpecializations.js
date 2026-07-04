/**
 * Seed / refresh Specialization catalog for wellness coaches.
 * Creates missing rows and updates existing ones matched by title or alias.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedSpecializations.js
 */
require("dotenv").config();

const {
  createSpecialization,
  getSpecializationByTitleKey,
  updateSpecialization,
  buildTitleKey,
} = require("../models/specializationModel");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "Specialization";

const SPECIALIZATIONS = [
  {
    title: "General Wellness",
    description:
      "Holistic lifestyle coaching covering nutrition, movement, sleep, and daily habits for overall health improvement.",
    status: "active",
    aliases: ["general wellness"],
  },
  {
    title: "Weight Loss & Metabolism",
    description:
      "Sustainable fat-loss programs with meal planning, activity tracking, and metabolic health support without crash diets.",
    status: "active",
    aliases: ["weight loss"],
  },
  {
    title: "Diabetes Reversal Coach",
    description:
      "Clinical lifestyle approach to blood sugar management, insulin sensitivity, and long-term diabetes reversal support.",
    status: "active",
    aliases: ["diabetes", "diabetes reversal"],
  },
  {
    title: "PCOS & Hormonal Balance",
    description:
      "Personalized plans for PCOS/PCOD covering cycle health, weight, insulin resistance, and hormonal symptom relief.",
    status: "active",
    aliases: ["pcos", "pcod", "pcos/pcod"],
  },
  {
    title: "Thyroid Wellness Coach",
    description:
      "Thyroid-focused nutrition, stress reduction, and lifestyle protocols to support energy, weight, and lab markers.",
    status: "active",
    aliases: ["thyroid", "thyroid care"],
  },
  {
    title: "Gut Health & Digestion",
    description:
      "Restore digestive balance with meal timing, gut-friendly foods, bloating relief, and microbiome-supportive habits.",
    status: "active",
    aliases: ["gut health", "digestion"],
  },
  {
    title: "Ayurveda Lifestyle Coach",
    description:
      "Traditional Ayurvedic guidance on dinacharya, seasonal routines, prakruti-based nutrition, and natural healing habits.",
    status: "active",
    aliases: ["ayurveda", "ayurvedic"],
  },
  {
    title: "Yoga & Pranayama Coach",
    description:
      "Guided yoga asana, breathwork, and mindfulness practices tailored to fitness level, stress, and health goals.",
    status: "active",
    aliases: ["yoga", "pranayama"],
  },
  {
    title: "Nutrition & Diet Planning",
    description:
      "Evidence-based meal plans, macro balance, supplement guidance, and habit coaching for lasting dietary change.",
    status: "active",
    aliases: ["nutrition", "diet planning", "dietitian"],
  },
  {
    title: "Cardio & Fitness Coach",
    description:
      "Structured cardio, strength, and mobility programs for heart health, stamina, and safe progressive conditioning.",
    status: "active",
    aliases: ["cardio", "fitness"],
  },
  {
    title: "Zumba & Dance Fitness",
    description:
      "High-energy dance workouts that improve cardiovascular fitness, coordination, and consistency through fun movement.",
    status: "active",
    aliases: ["zumba", "dance fitness"],
  },
  {
    title: "Stress & Mental Wellness",
    description:
      "Coaching for anxiety, burnout, and emotional balance using meditation, breathwork, sleep hygiene, and coping tools.",
    status: "active",
    aliases: ["stress", "mental wellness", "mindfulness"],
  },
  {
    title: "Sleep & Recovery Coach",
    description:
      "Improve sleep quality and recovery with circadian routines, evening rituals, stress down-regulation, and rest planning.",
    status: "active",
    aliases: ["sleep", "recovery"],
  },
  {
    title: "Heart Health & Lipids",
    description:
      "Lifestyle programs for cholesterol, blood pressure, and cardiovascular risk reduction through diet and activity.",
    status: "active",
    aliases: ["heart health", "cholesterol", "lipids"],
  },
];

async function listAllSpecializations() {
  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

function findByAlias(items, aliases = []) {
  const keys = new Set(aliases.map((value) => buildTitleKey(value)));
  return items.find((row) => keys.has(String(row.titleKey || buildTitleKey(row.title))));
}

async function upsertSpecialization(row, existingItems) {
  const titleKey = buildTitleKey(row.title);
  let existing =
    (await getSpecializationByTitleKey(titleKey)) ||
    findByAlias(existingItems, row.aliases || []);

  if (existing) {
    const updated = await updateSpecialization(existing.id, {
      title: row.title,
      description: row.description,
      status: row.status,
    });
    return { action: "updated", item: updated };
  }

  const created = await createSpecialization({
    title: row.title,
    description: row.description,
    status: row.status,
  });
  return { action: "created", item: created };
}

async function main() {
  console.log("Seeding Specialization catalog...\n");

  const existingItems = await listAllSpecializations();
  console.log(`Found ${existingItems.length} existing specialization(s).\n`);

  let created = 0;
  let updated = 0;

  for (const row of SPECIALIZATIONS) {
    const { action, item } = await upsertSpecialization(row, existingItems);
    console.log(`  ✓ ${action}: ${item.title} (${item.id})`);
    if (action === "created") created += 1;
    if (action === "updated") updated += 1;

    const idx = existingItems.findIndex((entry) => entry.id === item.id);
    if (idx >= 0) {
      existingItems[idx] = item;
    } else {
      existingItems.push(item);
    }
  }

  console.log(`\nDone: ${created} created, ${updated} updated.`);
  console.log(`Active catalog size: ${SPECIALIZATIONS.length} specializations.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

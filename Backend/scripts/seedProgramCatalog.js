/**
 * Seed / refresh ProgramCatalog entries for admin Programs page.
 * Creates missing rows and updates existing ones matched by title.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedProgramCatalog.js
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  createProgramCatalog,
  updateProgramCatalog,
  TABLE,
} = require("../models/programCatalogModel");

const PROGRAMS = [
  {
    title: "Seek to Heal — 90-Day Transformation",
    programType: "goal_based",
    description:
      "Flagship guided wellness journey with a dedicated coach, personalized diet plan, daily habit tracking, supplement guidance, and weekly progress reviews over 90 days.",
    price: 29999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Diabetes Reversal Program — 12 Weeks",
    programType: "goal_based",
    description:
      "Structured lifestyle protocol for blood sugar management with meal planning, activity targets, lab marker tracking, and coach support focused on sustainable reversal habits.",
    price: 19999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Sustainable Weight Loss — 90 Days",
    programType: "goal_based",
    description:
      "Evidence-based fat-loss coaching with calorie-aware meal plans, step and water tracking, accountability check-ins, and metabolic health education without crash dieting.",
    price: 14999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "PCOS & Hormonal Balance Program",
    programType: "goal_based",
    description:
      "Personalized plan for PCOS/PCOD covering cycle health, insulin sensitivity, weight management, stress reduction, and nutrition tailored to hormonal symptoms.",
    price: 17999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Thyroid Wellness Program",
    programType: "goal_based",
    description:
      "Thyroid-focused nutrition, sleep routines, stress management, and activity planning to support energy levels, weight stability, and improved lab markers.",
    price: 16999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Gut Reset & Digestive Healing",
    programType: "goal_based",
    description:
      "Eight-week gut health program addressing bloating, irregular digestion, and food sensitivities through meal timing, fiber balance, and microbiome-supportive habits.",
    price: 12999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Heart Health & Lipid Management",
    programType: "goal_based",
    description:
      "Cardiovascular wellness coaching with cholesterol-friendly meal plans, cardio activity prescriptions, and lifestyle changes for blood pressure and lipid improvement.",
    price: 15999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Stress, Sleep & Mental Wellness",
    programType: "goal_based",
    description:
      "Six-week program combining breathwork, sleep hygiene, mindfulness practices, and coach-led accountability to reduce burnout, anxiety, and poor recovery.",
    price: 9999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Lifetime Wellness Membership",
    programType: "lifetime",
    description:
      "Ongoing access to coach support, program modules, habit tracking, community features, and periodic wellness reviews with no fixed end date.",
    price: 49999,
    currency: "INR",
    isActive: true,
  },
  {
    title: "Postpartum Recovery & Energy Reset",
    programType: "goal_based",
    description:
      "Gentle recovery-focused coaching for new mothers covering nutrition, pelvic-safe movement, sleep routines, and gradual return to healthy weight and energy.",
    price: 13999,
    currency: "INR",
    isActive: true,
  },
];

function buildTitleKey(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function listAllPrograms() {
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

function findByTitle(items, title) {
  const key = buildTitleKey(title);
  return items.find((row) => buildTitleKey(row.title) === key);
}

async function upsertProgram(row, existingItems) {
  const existing = findByTitle(existingItems, row.title);

  if (existing) {
    const updated = await updateProgramCatalog(existing.id, {
      title: row.title,
      programType: row.programType,
      description: row.description,
      price: row.price,
      currency: row.currency,
      isActive: row.isActive,
    });
    return { action: "updated", item: updated };
  }

  const created = await createProgramCatalog({
    title: row.title,
    programType: row.programType,
    description: row.description,
    price: row.price,
    currency: row.currency,
    isActive: row.isActive,
    createdBy: "seed-script",
  });
  return { action: "created", item: created };
}

async function main() {
  console.log("Seeding ProgramCatalog...\n");

  const existingItems = await listAllPrograms();
  console.log(`Found ${existingItems.length} existing program(s).\n`);

  let created = 0;
  let updated = 0;

  for (const row of PROGRAMS) {
    const { action, item } = await upsertProgram(row, existingItems);
    console.log(`  ✓ ${action}: ${item.title} (${item.id}) — ₹${item.price}`);
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
  console.log(`Catalog size after seed: ${existingItems.length} program(s).`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

/**
 * Wipe HealthDisorder and seed a genuine acute/chronic catalog.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedHealthDisorders.js --confirm
 *   node --use-system-ca scripts/seedHealthDisorders.js --confirm --dry-run
 */
require("dotenv").config();

const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { scanTable } = require("../migration/lib/helpers");
const { createHealthDisorder } = require("../models/healthDisorderModel");

const TABLE = "HealthDisorder";

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const DISORDERS = [
  {
    title: "Type 2 diabetes",
    type: "chronic",
    description:
      "A metabolic condition where the body becomes resistant to insulin or does not produce enough, leading to raised blood sugar over time.",
    symptoms: ["Increased thirst", "Frequent urination", "Fatigue", "Blurred vision", "Slow-healing cuts"],
    status: "active",
  },
  {
    title: "Prediabetes",
    type: "chronic",
    description:
      "Blood sugar levels are higher than normal but not yet in the diabetes range. Early lifestyle changes can often reverse the trend.",
    symptoms: ["Often no clear symptoms", "Mild fatigue", "Increased hunger", "Family history of diabetes"],
    status: "active",
  },
  {
    title: "PCOS (Polycystic ovary syndrome)",
    type: "chronic",
    description:
      "A hormonal condition in women that can affect cycles, fertility, weight, and insulin sensitivity. Lifestyle care is a core part of management.",
    symptoms: ["Irregular periods", "Weight gain", "Acne", "Excess facial hair", "Difficulty conceiving"],
    status: "active",
  },
  {
    title: "Hypothyroidism",
    type: "chronic",
    description:
      "An underactive thyroid slows metabolism. Energy, weight, mood, and cold tolerance are commonly affected.",
    symptoms: ["Tiredness", "Weight gain", "Cold intolerance", "Dry skin", "Hair thinning"],
    status: "active",
  },
  {
    title: "Hypertension (high blood pressure)",
    type: "chronic",
    description:
      "Persistently elevated blood pressure that raises long-term risk for heart disease and stroke. Often silent until checked.",
    symptoms: ["Often silent", "Headaches", "Dizziness", "Shortness of breath"],
    status: "active",
  },
  {
    title: "High cholesterol (dyslipidemia)",
    type: "chronic",
    description:
      "Imbalanced blood lipids that increase cardiovascular risk. Diet, activity, and weight management play a major role.",
    symptoms: ["Usually no symptoms", "Detected on blood tests", "Family history of heart disease"],
    status: "active",
  },
  {
    title: "Obesity / excess weight",
    type: "chronic",
    description:
      "Excess body fat that increases risk for diabetes, joint strain, sleep apnea, and heart disease. Sustainable habits matter more than crash diets.",
    symptoms: ["Difficulty losing weight", "Joint discomfort", "Low energy", "Breathlessness on exertion"],
    status: "active",
  },
  {
    title: "Fatty liver (NAFLD)",
    type: "chronic",
    description:
      "Fat build-up in the liver not caused by alcohol. Closely linked with insulin resistance, waist size, and metabolic health.",
    symptoms: ["Often silent", "Fatigue", "Discomfort in upper right abdomen", "Raised liver enzymes"],
    status: "active",
  },
  {
    title: "Acid reflux / GERD",
    type: "chronic",
    description:
      "Stomach acid flows back into the food pipe, causing heartburn and discomfort. Meal timing and trigger foods often influence flares.",
    symptoms: ["Heartburn", "Sour burps", "Chest discomfort after meals", "Throat irritation"],
    status: "active",
  },
  {
    title: "IBS (Irritable bowel syndrome)",
    type: "chronic",
    description:
      "A functional gut condition with recurring abdominal pain and altered bowel habits. Stress, meals, and sleep often affect symptoms.",
    symptoms: ["Abdominal pain", "Bloating", "Diarrhea or constipation", "Urgency after meals"],
    status: "active",
  },
  {
    title: "Migraine",
    type: "chronic",
    description:
      "Recurring moderate-to-severe headaches often with sensitivity to light or sound. Sleep, hydration, and stress are common triggers.",
    symptoms: ["Throbbing headache", "Nausea", "Light sensitivity", "Sound sensitivity"],
    status: "active",
  },
  {
    title: "Anxiety disorder",
    type: "chronic",
    description:
      "Persistent worry or nervousness that interferes with daily life. Breathwork, sleep, and structured routines can support recovery alongside care.",
    symptoms: ["Restlessness", "Racing thoughts", "Muscle tension", "Sleep disturbance", "Palpitations"],
    status: "active",
  },
  {
    title: "Seasonal viral fever",
    type: "acute",
    description:
      "A short-term febrile illness often linked to seasonal viruses. Rest, fluids, and monitoring help most people recover within days.",
    symptoms: ["Fever", "Body ache", "Chills", "Sore throat", "Fatigue"],
    status: "active",
  },
  {
    title: "Acute gastritis",
    type: "acute",
    description:
      "Sudden inflammation of the stomach lining, often after spicy meals, skipped meals, stress, or certain medicines.",
    symptoms: ["Upper abdominal pain", "Nausea", "Bloating", "Loss of appetite"],
    status: "active",
  },
  {
    title: "Acute bronchitis",
    type: "acute",
    description:
      "Short-term inflammation of the airways, usually after a cold or respiratory infection. Cough can linger even after fever settles.",
    symptoms: ["Persistent cough", "Chest congestion", "Mild fever", "Tiredness"],
    status: "active",
  },
  {
    title: "Food poisoning",
    type: "acute",
    description:
      "Sudden gut illness after contaminated food or water. Hydration is the priority while symptoms settle.",
    symptoms: ["Vomiting", "Diarrhea", "Stomach cramps", "Fever", "Weakness"],
    status: "active",
  },
];

async function clearTable() {
  const items = await scanTable(TABLE);
  let deleted = 0;
  for (const item of items) {
    if (!item?.id) continue;
    await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { id: item.id } }));
    deleted += 1;
  }
  console.log(`  [${TABLE}] cleared ${deleted} row(s)`);
  return deleted;
}

async function seed(dryRun) {
  console.log("\nSeeding HealthDisorder...");
  for (const row of DISORDERS) {
    if (dryRun) {
      console.log(`  - ${row.title} (${row.type})`);
      continue;
    }
    const item = await createHealthDisorder(row);
    console.log(`  ✓ ${item.title} · ${item.type}`);
  }
}

async function main() {
  const confirm = hasFlag("--confirm");
  const dryRun = hasFlag("--dry-run");
  if (!confirm) {
    console.error("Refusing to wipe HealthDisorder without --confirm");
    process.exitCode = 1;
    return;
  }

  console.log(dryRun ? "Dry run: no writes." : "Clearing HealthDisorder...");
  if (!dryRun) await clearTable();
  await seed(dryRun);
  console.log(`\nDone. ${DISORDERS.length} health disorders seeded.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

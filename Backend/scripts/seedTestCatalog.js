require("dotenv").config();

const {
  createTestCatalog,
  getTestCatalogByTestId,
} = require("../models/testCatalogModel");

const TESTS = [
  {
    testId: "complete-blood-count",
    name: "Complete Blood Count (CBC)",
    type: "PROFILE",
    category: "Hematology",
    status: "active",
    sequence: 1,
    parameters: [
      { paramId: "hemoglobin", name: "Hemoglobin", unit: "g/dL", refRange: "13.0–17.0 (M), 12.0–15.0 (F)", sequence: 1 },
      { paramId: "rbc", name: "RBC Count", unit: "million/µL", refRange: "4.5–5.5", sequence: 2 },
      { paramId: "wbc", name: "WBC Count", unit: "cells/µL", refRange: "4,000–11,000", sequence: 3 },
      { paramId: "platelets", name: "Platelet Count", unit: "cells/µL", refRange: "150,000–400,000", sequence: 4 },
      { paramId: "hematocrit", name: "Hematocrit", unit: "%", refRange: "40–50 (M), 36–44 (F)", sequence: 5 },
    ],
  },
  {
    testId: "fasting-blood-glucose",
    name: "Fasting Blood Glucose",
    type: "SINGLE",
    category: "Diabetes",
    status: "active",
    sequence: 2,
    parameters: [
      { paramId: "fbg", name: "Fasting Glucose", unit: "mg/dL", refRange: "70–99", sequence: 1 },
    ],
  },
  {
    testId: "hba1c",
    name: "HbA1c (Glycated Hemoglobin)",
    type: "SINGLE",
    category: "Diabetes",
    status: "active",
    sequence: 3,
    parameters: [
      { paramId: "hba1c", name: "HbA1c", unit: "%", refRange: "< 5.7", sequence: 1 },
    ],
  },
  {
    testId: "lipid-profile",
    name: "Lipid Profile",
    type: "PROFILE",
    category: "Cardiac",
    status: "active",
    sequence: 4,
    parameters: [
      { paramId: "total-cholesterol", name: "Total Cholesterol", unit: "mg/dL", refRange: "< 200", sequence: 1 },
      { paramId: "ldl", name: "LDL Cholesterol", unit: "mg/dL", refRange: "< 100", sequence: 2 },
      { paramId: "hdl", name: "HDL Cholesterol", unit: "mg/dL", refRange: "> 40 (M), > 50 (F)", sequence: 3 },
      { paramId: "triglycerides", name: "Triglycerides", unit: "mg/dL", refRange: "< 150", sequence: 4 },
      { paramId: "vldl", name: "VLDL Cholesterol", unit: "mg/dL", refRange: "5–40", sequence: 5 },
    ],
  },
  {
    testId: "thyroid-profile",
    name: "Thyroid Profile (T3, T4, TSH)",
    type: "PROFILE",
    category: "Thyroid",
    status: "active",
    sequence: 5,
    parameters: [
      { paramId: "tsh", name: "TSH", unit: "µIU/mL", refRange: "0.4–4.0", sequence: 1 },
      { paramId: "free-t3", name: "Free T3", unit: "pg/mL", refRange: "2.3–4.2", sequence: 2 },
      { paramId: "free-t4", name: "Free T4", unit: "ng/dL", refRange: "0.8–1.8", sequence: 3 },
    ],
  },
  {
    testId: "vitamin-d",
    name: "Vitamin D (25-OH)",
    type: "SINGLE",
    category: "Vitamins",
    status: "active",
    sequence: 6,
    parameters: [
      { paramId: "vitamin-d", name: "Vitamin D", unit: "ng/mL", refRange: "30–100", sequence: 1 },
    ],
  },
  {
    testId: "vitamin-b12",
    name: "Vitamin B12",
    type: "SINGLE",
    category: "Vitamins",
    status: "active",
    sequence: 7,
    parameters: [
      { paramId: "vitamin-b12", name: "Vitamin B12", unit: "pg/mL", refRange: "200–900", sequence: 1 },
    ],
  },
  {
    testId: "liver-function-test",
    name: "Liver Function Test (LFT)",
    type: "PROFILE",
    category: "Liver",
    status: "active",
    sequence: 8,
    parameters: [
      { paramId: "sgot", name: "SGOT (AST)", unit: "U/L", refRange: "< 40", sequence: 1 },
      { paramId: "sgpt", name: "SGPT (ALT)", unit: "U/L", refRange: "< 41", sequence: 2 },
      { paramId: "alp", name: "Alkaline Phosphatase", unit: "U/L", refRange: "44–147", sequence: 3 },
      { paramId: "bilirubin-total", name: "Total Bilirubin", unit: "mg/dL", refRange: "0.1–1.2", sequence: 4 },
      { paramId: "albumin", name: "Albumin", unit: "g/dL", refRange: "3.5–5.0", sequence: 5 },
    ],
  },
  {
    testId: "kidney-function-test",
    name: "Kidney Function Test (KFT)",
    type: "PROFILE",
    category: "Kidney",
    status: "active",
    sequence: 9,
    parameters: [
      { paramId: "creatinine", name: "Serum Creatinine", unit: "mg/dL", refRange: "0.7–1.3 (M), 0.6–1.1 (F)", sequence: 1 },
      { paramId: "bun", name: "Blood Urea Nitrogen", unit: "mg/dL", refRange: "7–20", sequence: 2 },
      { paramId: "uric-acid", name: "Uric Acid", unit: "mg/dL", refRange: "3.5–7.2 (M), 2.6–6.0 (F)", sequence: 3 },
      { paramId: "egfr", name: "eGFR", unit: "mL/min/1.73m²", refRange: "> 90", sequence: 4 },
    ],
  },
  {
    testId: "iron-studies",
    name: "Iron Studies",
    type: "PROFILE",
    category: "Hematology",
    status: "active",
    sequence: 10,
    parameters: [
      { paramId: "serum-iron", name: "Serum Iron", unit: "µg/dL", refRange: "60–170 (M), 37–145 (F)", sequence: 1 },
      { paramId: "ferritin", name: "Ferritin", unit: "ng/mL", refRange: "30–400 (M), 15–150 (F)", sequence: 2 },
      { paramId: "tibc", name: "TIBC", unit: "µg/dL", refRange: "250–450", sequence: 3 },
    ],
  },
  {
    testId: "crp",
    name: "C-Reactive Protein (CRP)",
    type: "SINGLE",
    category: "Inflammation",
    status: "inactive",
    sequence: 11,
    parameters: [
      { paramId: "crp", name: "CRP", unit: "mg/L", refRange: "< 3.0", sequence: 1 },
    ],
  },
];

async function main() {
  console.log("Seeding TestCatalog...\n");
  let created = 0;
  let skipped = 0;

  for (const test of TESTS) {
    const existing = await getTestCatalogByTestId(test.testId);
    if (existing) {
      console.log(`  - skipped (exists): ${test.name}`);
      skipped++;
      continue;
    }

    await createTestCatalog({
      ...test,
      createdBy: "seed-script",
    });
    console.log(`  ✓ ${test.name}`);
    created++;
  }

  console.log(`\nTestCatalog: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});

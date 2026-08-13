export const INTERNAL_PARAMS = {
  lastReport: { date: "04 Aug 2026", ago: "uploaded 9 days ago" },
  nextDue: { date: "02 Nov 2026", sub: "in 81 days · 90-day cycle" },
  outOfRangeAlert: "3 markers out of range in the latest report",
  reportHistory: [
    {
      date: "04 Aug 2026",
      meta: "Thyrocare · home collection · reviewed by Anita Rao · 22 markers",
      status: "3 OUT OF RANGE",
      tone: "bad",
      markers: [
        "HbA1c 6.8% (4.0–5.6)",
        "LDL 148 mg/dL (< 100)",
        "Vitamin D 18 ng/mL (30–100)",
      ],
    },
    {
      date: "27 May 2026",
      meta: "Metropolis · walk-in · reviewed by Anita Rao · 22 markers",
      status: "4 OUT OF RANGE",
      tone: "bad",
      markers: ["HbA1c 7.4%", "Triglycerides 196 mg/dL", "Vitamin D 14 ng/mL", "TSH 5.9 μIU/mL"],
    },
    {
      date: "26 Feb 2026",
      meta: "Thyrocare · home collection · reviewed by Anita Rao · 18 markers",
      status: "2 OUT OF RANGE",
      tone: "bad",
      markers: ["HbA1c 7.9% (4.0–5.6)", "Fasting glucose 132 mg/dL (70–100)"],
    },
    {
      date: "21 Nov 2025",
      meta: "Baseline · onboarding · reviewed by Admin desk · 18 markers",
      status: "ALL IN RANGE",
      tone: "good",
      markers: [],
    },
  ],
  goalPresets: ["Fat Loss", "Diabetes Reversal", "Thyroid Care", "PCOD / PCOS"],
  publishedStatus: {
    sent: true,
    message: "Sent to Madhupriya Bilas · 04 Aug 2026, 17:22 IST · 13 tests · WhatsApp and app",
  },
  testNamespaces: [
    {
      id: "thyroid",
      name: "Thyroid",
      tests: [["TSH", "Free T3"], ["Free T4", null]],
    },
    {
      id: "vitd",
      name: "Vitamin D",
      tests: [["Vitamin D", null]],
    },
    {
      id: "b12",
      name: "Vitamin B12",
      tests: [["Vitamin B12", null]],
    },
    {
      id: "lft",
      name: "Liver Function (LFT)",
      tests: [["SGOT", "SGPT"], ["Bilirubin", "Albumin"]],
    },
    {
      id: "kft",
      name: "Kidney Function (KFT)",
      tests: [["Creatinine", "Urea"], ["Uric acid", null]],
    },
  ],
  testGroups: [
    {
      id: "cbc",
      name: "CBC",
      tests: [
        ["Hemoglobin", "RBC count"],
        ["WBC count", "Platelet count"],
        ["Hematocrit", "MCV"],
        ["MCH", null],
      ],
    },
    {
      id: "hba1c",
      name: "HbA1c",
      tests: [["HbA1c", null]],
    },
    {
      id: "lipid",
      name: "Lipid Profile",
      tests: [
        ["Total Cholesterol", "LDL"],
        ["HDL", "Triglycerides"],
        ["VLDL", null],
      ],
    },
  ],
  reportUpload: {
    title: "Blood report uploaded",
    sub: "Added by client · 20 Jul 2026 · ready for AI analysis",
    analysed: true,
  },
  aiDates: ["14 DEC 25", "2 MAR 26", "4 MAY 26", "5 MAY 26"],
  aiPanels: [
    {
      title: "GLUCOSE PANEL",
      rows: [
        {
          name: "HbA1c",
          optimal: "5 – 5.3%",
          rr: "Below 5.7%",
          readings: [
            { value: "8.4", tone: "bad", note: "Consistently in the diabetic range and rising over the last three draws. This reflects a sustained glucose load over ~3 months and points to worsening insulin resistance rather than a one-off spike. Prioritise glycemic control before addressing lipids." },
            { value: "6.5", tone: "bad", note: "Consistently in the diabetic range and rising over the last three draws. This reflects a sustained glucose load over ~3 months and points to worsening insulin resistance rather than a one-off spike. Prioritise glycemic control before addressing lipids." },
            { value: "9.1", tone: "bad", note: "Rebound after a brief improvement — likely due to inconsistent meal timing and higher post-dinner carbs. Reinforce low-GI dinners and post-meal walks." },
            { value: "10.2", tone: "bad", note: "Trending upward again; insulin resistance remains the primary driver. Consider tightening carb portions and reviewing sleep quality." },
          ],
        },
        {
          name: "AVG",
          optimal: "90 – 120",
          rr: "90–120 mg/dl",
          readings: [
            { value: "194", tone: "bad", note: "Estimated average glucose tracks the HbA1c trend — day-to-day sugars are running high, so post-meal spikes are likely the main driver." },
            { value: "139.9", tone: "bad", note: "Estimated average glucose tracks the HbA1c trend — day-to-day sugars are running high, so post-meal spikes are likely the main driver." },
            { value: "246.04", tone: "bad", note: "Sharp rise aligns with the HbA1c rebound — review evening meal composition and snacking patterns." },
            { value: "214.5", tone: "bad", note: "Still elevated despite slight improvement from the prior draw; fasting and post-meal control both need attention." },
          ],
        },
        {
          name: "FBS",
          optimal: "80 – 88 mg/dl",
          rr: "70–100 mg/dl",
          readings: [
            { value: "131.67", tone: "bad", note: "Fasting sugar is elevated, suggesting the liver is releasing glucose overnight (dawn effect / hepatic insulin resistance). A protein + fibre bedtime snack and morning walk usually help this marker first." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "PPBS",
          optimal: "<120 mg/dl",
          rr: "70–140 mg/dl",
          readings: [
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "Fasting Insulin",
          optimal: "<5 μIU/ml",
          rr: "1.9–23 μIU/ml",
          readings: [
            { value: "13.1", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "HOMA-IR 2",
          optimal: "<1.8",
          rr: "—",
          readings: [
            { value: "4.23", tone: "bad", note: "Markedly elevated, confirming significant insulin resistance. This is the single most important metric to bring down and should improve with weight loss, low-GI eating and activity." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
      ],
    },
    {
      title: "LIPID PROFILE",
      rows: [
        {
          name: "Total CH",
          optimal: "200 – 300 mg/dl",
          rr: "<200 mg/dl",
          readings: [
            { value: "181", tone: "bad", note: "Mildly elevated and fluctuating; largely secondary to the insulin resistance above. It should trend down as glucose control improves." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "LDL",
          optimal: "120 – 170 mg/dl",
          rr: "<100 mg/dl",
          readings: [
            { value: "108", tone: "bad", note: "Above the optimal cardiovascular target. Combined with high triglycerides this raises cardiometabolic risk — emphasise soluble fibre and omega-3s." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "HDL",
          optimal: "65–85",
          rr: "40–60",
          readings: [
            { value: "54", tone: "bad", note: "On the low side of optimal. Regular activity and healthy fats (nuts, fatty fish) raise this over time." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "TRIG",
          optimal: "50–90",
          rr: "<150",
          readings: [
            { value: "171", tone: "bad", note: "Elevated — a classic marker of high carbohydrate intake and insulin resistance." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
      ],
    },
    {
      title: "THYROID & VITAMINS",
      rows: [
        {
          name: "TSH",
          optimal: "1.5–2.5 µIU/ml",
          rr: "0.4–4.0 µIU/ml",
          readings: [
            { value: "3.4", tone: "bad", note: "High-normal, drifting toward subclinical hypothyroidism. Worth re-checking with free T3/T4 in 8 weeks." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "Vitamin D",
          optimal: "40–60 ng/ml",
          rr: "30–100 ng/ml",
          readings: [
            { value: "18", tone: "bad", note: "Deficient. Low vitamin D worsens insulin sensitivity. Start supplementation and re-test at 12 weeks." },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
        {
          name: "Vitamin B12",
          optimal: "500–900 pg/ml",
          rr: "211–911 pg/ml",
          readings: [
            { value: "312", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
            { value: "—", tone: "neutral", note: "" },
          ],
        },
      ],
    },
  ],
  bloodSummary: [
    "Glycemic control is the headline issue — HbA1c 8.4% and fasting glucose 148 mg/dL place the client in the diabetic range, trending upward across the last three draws.",
    "Lipid profile is borderline: LDL and triglycerides mildly elevated with low-end HDL, a pattern consistent with insulin resistance.",
    "Thyroid function is within range (TSH 3.1) — fatigue is more likely nutritional than thyroidal.",
    "Vitamin D is deficient at 18 ng/mL and B12 is low-normal; both worth correcting early.",
    "Liver and kidney markers are unremarkable — no acute concern.",
    "Recommended next steps: prioritise glycemic load with a structured low-GI plan, repletion of Vitamin D and B12, and re-test HbA1c and lipids in 12 weeks.",
  ],
  protocol: {
    latest: "20 Jul 2026",
    items: [
      "Low-GI diet — remove refined sugar & white carbs",
      "30-min brisk walk after each main meal",
      "Berberine 500 mg twice daily with meals",
      "Soluble fibre (oats, flax) up to 25 g/day",
      "Retest HbA1c & lipid panel in 8 weeks",
    ],
    previous: [
      {
        date: "12 Jun 2026",
        items: [
          "Cut sugary drinks & fried foods",
          "Protein 70 g/day across 3 balanced meals",
          "Vitamin D3 60k IU weekly",
          "Target 6k steps/day",
        ],
      },
      {
        date: "05 May 2026",
        items: [
          "Baseline 1800 kcal balanced plan",
          "Consistent meal timing",
          "Hydration 2L/day",
        ],
      },
    ],
  },
  nutritionSummary: {
    latest: { date: "20 Jul 2026", text: "Continue high-protein breakfast; 2L/day water goal. HbA1c trending down — keep low-GI dinners. Add magnesium at night for sleep & recovery." },
    history: [
      { date: "12 Jun 2026", text: "Reduced refined carbs; protein at 78g/day. Energy improving, cravings down. Introduced soluble fibre (oats, flax)." },
      { date: "05 May 2026", text: "Baseline plan set — 1800 kcal, balanced macros. Focus on consistent meal timing and hydration." },
    ],
  },
};

export function flattenTests(group) {
  return group.tests.flat().filter(Boolean);
}

export function countSelected(group, selected) {
  const all = flattenTests(group);
  const n = all.filter((t) => selected[`${group.id}:${t}`]).length;
  return { n, total: all.length };
}

export function cloneAiPanels(panels) {
  return panels.map((panel) => ({
    ...panel,
    rows: panel.rows.map((row) => ({
      ...row,
      readings: row.readings.map((reading) => ({ ...reading })),
    })),
  }));
}

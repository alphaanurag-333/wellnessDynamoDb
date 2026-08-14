export const REAL_PEOPLE_EDITOR = {
  appOn: true,
  webOn: true,
  uploaded: false,
  story: "",
};

export const REAL_PEOPLE_CONCERNS = [
  "Fat loss",
  "Diabetes reversal",
  "Thyroid",
  "PCOD / PCOS",
  "Hypertension",
  "Gut health",
];

export const REAL_PEOPLE_RATINGS = ["1 ★", "2 ★", "3 ★", "4 ★", "5 ★"];

export const REAL_PEOPLE_FIELDS = [
  { id: "age", label: "Age", sample: "42" },
  { id: "inches", label: "Inches lost", sample: "−8 in" },
  { id: "hba1c", label: "HbA1c change", sample: "8.9 → 6.4" },
  { id: "duration", label: "Duration", sample: "5 months" },
  { id: "city", label: "City", sample: "Mumbai" },
];

export const REAL_PEOPLE_POINTS = [
  { id: "rp-1", field: "concern", label: "Health concern", value: "Fat loss", source: "REQUIRED", options: "concern" },
  { id: "rp-2", field: "rating", label: "Rating", value: "5 ★", source: "REQUIRED", options: "rating" },
  { id: "rp-3", field: "name", label: "Client name", value: "Madhupriya Bilas", source: "AUTO" },
];

export const REAL_PEOPLE_PRIORITY = [
  { id: "rp-p1", title: "Bikash S. · HbA1c 8.9 → 6.4", program: "Diabetes Reversal", shown: true },
  { id: "rp-p2", title: "Madhupriya B. · -18 kg", program: "Fat Loss", shown: true },
  { id: "rp-p3", title: "Hetu M. · cycle regular", program: "PCOD / PCOS", shown: true },
];

export const REAL_PEOPLE_GALLERY_OWNERS = ["All owners", "Anita Rao", "Ishita Sen", "Rohan Das", "Priya Nair"];

export const REAL_PEOPLE_GALLERY = [
  { id: "rp-g1", title: "Madhupriya — before / after", owner: "Anita Rao", date: "22 Jul 2026", size: "2.4 MB", versions: 1, live: true },
  { id: "rp-g2", title: "Dipti Patil — 12 week result", owner: "Ishita Sen", date: "30 Jul 2026", size: "2.1 MB", versions: 2, live: true },
  { id: "rp-g3", title: "Banita Acharya — gut reset", owner: "Rohan Das", date: "16 Jul 2026", size: "1.8 MB", versions: 3, live: false },
  { id: "rp-g4", title: "Arjun Verma — HbA1c drop", owner: "Priya Nair", date: "09 Jul 2026", size: "1.6 MB", versions: 1, live: false },
];

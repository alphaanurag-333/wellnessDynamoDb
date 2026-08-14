export const TRANSFORMATION_EDITOR = {
  appOn: true,
  webOn: true,
  beforeUploaded: false,
  afterUploaded: false,
  story: "",
};

export const TRANSFORMATION_FIELDS = [
  { id: "name", label: "Client name", sample: "Madhupriya Bilas" },
  { id: "weight", label: "Weight lost", sample: "18 kg" },
  { id: "hba1c", label: "HbA1c", sample: "8.9 → 6.4" },
  { id: "waist", label: "Waist", sample: "−12 cm" },
  { id: "program", label: "Program", sample: "Fat Loss" },
];

export const TRANSFORMATION_POINTS = [
  { id: "tp-1", field: "name", label: "Client name", value: "Madhupriya Bilas", source: "AUTO" },
  { id: "tp-2", field: "weight", label: "Weight lost", value: "18 kg", source: "AUTO" },
];

export const TRANSFORMATION_PRIORITY = [
  { id: "tr-1", title: "Bikash S. · HbA1c 8.9 → 6.4", program: "Diabetes Reversal", shown: true },
  { id: "tr-2", title: "Madhupriya B. · -18 kg", program: "Fat Loss", shown: true },
  { id: "tr-3", title: "Hetu M. · cycle regular", program: "PCOD / PCOS", shown: true },
];

export const TRANSFORMATION_GALLERY_OWNERS = ["All owners", "Anita Rao", "Ishita Sen", "Rohan Das", "Priya Nair"];

export const TRANSFORMATION_GALLERY = [
  { id: "tf-g1", title: "Madhupriya — before / after", owner: "Anita Rao", date: "22 Jul 2026", size: "2.4 MB", versions: 1, live: true },
  { id: "tf-g2", title: "Dipti Patil — 12 week result", owner: "Ishita Sen", date: "30 Jul 2026", size: "2.1 MB", versions: 2, live: true },
  { id: "tf-g3", title: "Banita Acharya — gut reset", owner: "Rohan Das", date: "16 Jul 2026", size: "1.8 MB", versions: 3, live: false },
  { id: "tf-g4", title: "Arjun Verma — HbA1c drop", owner: "Priya Nair", date: "09 Jul 2026", size: "1.6 MB", versions: 1, live: false },
];

export const PROGRAM_TESTIMONIAL_PROGRAMS = [
  { id: "fat-loss", label: "Fat Loss" },
  { id: "diabetes", label: "Diabetes Reversal" },
  { id: "thyroid", label: "Thyroid Care" },
  { id: "pcod", label: "PCOD / PCOS" },
  { id: "everyday", label: "Everyday Wellness" },
  { id: "hypertension", label: "Hypertension" },
];

export function programTestimonialLabel(programId) {
  return PROGRAM_TESTIMONIAL_PROGRAMS.find((entry) => entry.id === programId)?.label || programId;
}

export const PROGRAM_TESTIMONIAL_STORIES = [
  {
    id: "pt-1",
    name: "Madhupriya Bilas",
    program: "fat-loss",
    headline: "Down 18 kg on Fat Loss",
    description: "I stopped crash dieting and followed the Fat Loss protocol with my coach. Energy came back first, then the weight started moving in a way that finally stuck.",
    live: true,
    hasPhoto: true,
  },
  {
    id: "pt-2",
    name: "Bikash Sharma",
    program: "diabetes",
    headline: "HbA1c down without panic",
    description: "HbA1c from 8.9 to 6.4 with no new medication.",
    live: true,
    hasPhoto: true,
  },
  {
    id: "pt-3",
    name: "Hetu Mehra",
    program: "pcod",
    headline: "Cycles and energy, finally steady",
    description: "PCOD / PCOS care was the first plan that treated the whole picture — food, sleep, and stress — not just a diet sheet.",
    live: true,
    hasPhoto: true,
  },
  {
    id: "pt-4",
    name: "Kabir Shah",
    program: "thyroid",
    headline: "Thyroid care that I could actually follow",
    description: "Small daily habits plus the right protocol calmed the swings. I feel clearer and my follow-up labs are moving in the right direction.",
    live: true,
    hasPhoto: true,
  },
];

export const PROGRAM_TESTIMONIAL_GALLERY_OWNERS = [
  "All owners",
  "Anita Rao",
  "Ishita Sen",
  "Rohan Das",
  "Priya Nair",
  "Vishal Chaurasia",
  "Admin",
];

export const PROGRAM_TESTIMONIAL_GALLERY = [
  { id: "pt-g1", title: "Madhupriya — before / after", owner: "Anita Rao", date: "22 Jul 2026", size: "2.4 MB", versions: 1, live: true },
  { id: "pt-g2", title: "Dipti Patil — 12 week result", owner: "Ishita Sen", date: "30 Jul 2026", size: "2.1 MB", versions: 2, live: true },
  { id: "pt-g3", title: "Banita Acharya — gut reset", owner: "Rohan Das", date: "16 Jul 2026", size: "1.8 MB", versions: 3, live: false },
  { id: "pt-g4", title: "Arjun Verma — HbA1c drop", owner: "Priya Nair", date: "09 Jul 2026", size: "1.6 MB", versions: 1, live: false },
];
